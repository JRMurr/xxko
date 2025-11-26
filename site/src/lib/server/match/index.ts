import { match, videoSource, team, matchSide, matchSidePlayer, player } from '$lib/server/db/schema';
import { type xxDatabase } from '$lib/server/db';
import { extractYouTubeInfo, matchSchema, matchSideSchema, type MatchFilter } from '$lib/schemas';
import { PLAYER_ROLE, type PlayerRole } from '$lib/constants';
import z from 'zod';
import {
	and,
	DrizzleQueryError,
	eq,
	inArray,
	like,
	SQL,
	sql,
	type ColumnBaseConfig,
	type ColumnDataType
} from 'drizzle-orm';
import type { SQLiteColumn } from 'drizzle-orm/sqlite-core';
import { LibsqlError } from '@libsql/client';

// import { queryDebug } from '$test/utils';

export class DuplicateMatchError extends Error {
	constructor(id: string, start_time: number) {
		super(`Match with video_id (${id}) and start time (${start_time}). Already exists`);
		this.name = 'DuplicateMatchError';
		Object.setPrototypeOf(this, DuplicateMatchError.prototype);
	}
}

type TxClient = Pick<xxDatabase, 'select' | 'insert' | 'update' | 'delete'>;

type MatchSideInput = z.infer<typeof matchSideSchema>;

const resolveVideoForMatch = async (tx: TxClient, video: string) => {
	// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
	const youtubeInfo = extractYouTubeInfo(video)!;

	const videoInfo = {
		url: video,
		externalId: youtubeInfo.id
	};

	const maybeVideo = await tx
		.select({ id: videoSource.id })
		.from(videoSource)
		.where(eq(videoSource.externalId, videoInfo.externalId))
		.limit(1); // TODO: and platform when supporting twitch

	let videoId: number;
	if (maybeVideo.length === 1) {
		videoId = maybeVideo[0].id;
	} else {
		const res = await tx
			.insert(videoSource)
			.values({ ...videoInfo, platform: 'youtube' })
			.onConflictDoNothing()
			.returning({ videoId: videoSource.id });
		videoId = res[0].videoId;
	}

	const startSec = youtubeInfo.start ?? 0;

	return { videoId, startSec, videoInfo };
};

const findOrCreateTeam = async (tx: TxClient, info: MatchSideInput['team']): Promise<number> => {
	const maybeTeam = await tx
		.select({ id: team.id })
		.from(team)
		.where(
			and(
				eq(team.pointChar, info.pointChar),
				eq(team.assistChar, info.assistChar),
				eq(team.fuse, info.fuse),
				eq(team.charSwapBeforeRound, !!info.charSwapBeforeRound)
			)
		)
		.limit(1);

	if (maybeTeam.length === 1) {
		return maybeTeam[0].id;
	}

	const res = await tx.insert(team).values(info).onConflictDoNothing().returning({ teamId: team.id });

	return res[0].teamId;
};

const findOrCreatePlayer = async (tx: TxClient, name: string): Promise<number> => {
	const maybePlayer = await tx.select().from(player).where(eq(player.name, name)).limit(1);

	if (maybePlayer.length === 1) {
		return maybePlayer[0].id;
	}

	const res = await tx.insert(player).values({ name }).returning({ playerId: player.id });
	return res[0].playerId;
};

/**
 * Insert or update a matchSide + its players.
 *
 * - If existingSideId is undefined: INSERT matchSide and players (createMatch case)
 * - If existingSideId is provided: UPDATE matchSide.teamId and replace players (updateMatch case)
 *
 * Only matchSide is updated; player/video tables are never updated, only found/created.
 */
const upsertMatchSide = async (tx: TxClient, info: MatchSideInput, existingSideId?: number): Promise<number> => {
	const teamId = await findOrCreateTeam(tx, info.team);

	let sideId = existingSideId;

	if (!sideId) {
		const [{ sideId: insertedSideId }] = await tx
			.insert(matchSide)
			.values({ teamId })
			.returning({ sideId: matchSide.id });
		sideId = insertedSideId;
	} else {
		// Only update the MatchSide table
		await tx.update(matchSide).set({ teamId }).where(eq(matchSide.id, sideId));

		// Replace players for this side
		await tx.delete(matchSidePlayer).where(eq(matchSidePlayer.sideId, sideId));
	}

	const addPlayer = async (name: string, role: PlayerRole) => {
		const playerId = await findOrCreatePlayer(tx, name);
		await tx.insert(matchSidePlayer).values({ sideId: sideId, playerId, role });
	};

	await addPlayer(info.pointPlayerName, 'point');

	if (info.assistPlayerName) {
		await addPlayer(info.assistPlayerName, 'assist');
	}

	return sideId;
};

const withUniqueMatchConstraintHandling = async <T>(
	op: () => Promise<T>,
	videoExternalId: string,
	startSec: number
): Promise<T> => {
	try {
		return await op();
	} catch (err: unknown) {
		if (!(err instanceof DrizzleQueryError)) {
			throw err;
		}

		const cause = err.cause;
		if (!(cause instanceof LibsqlError)) {
			throw err;
		}
		if (cause.code === 'SQLITE_CONSTRAINT_UNIQUE') {
			throw new DuplicateMatchError(videoExternalId, startSec);
		}

		throw err;
	}
};

/* -------------------------------------------------------------------------- */
/*                               createMatch                                  */
/* -------------------------------------------------------------------------- */

export const createMatch = (db: xxDatabase, matchInfo: z.infer<typeof matchSchema>) =>
	db.transaction(
		async (tx) => {
			// TODO: call out to youtube api to do some level of validation that the link is probably 2xko?
			// TODO: twitch support

			const { videoId, startSec, videoInfo } = await resolveVideoForMatch(tx, matchInfo.video);

			const patch = matchInfo.patch && matchInfo.patch.length > 0 ? matchInfo.patch : undefined;

			const leftSideId = await upsertMatchSide(tx, matchInfo.left);
			const rightSideId = await upsertMatchSide(tx, matchInfo.right);

			const matchId = await withUniqueMatchConstraintHandling(
				async () => {
					const [{ matchId }] = await tx
						.insert(match)
						.values({
							leftSideId,
							rightSideId,
							videoId,
							startSec,
							patch
						})
						.returning({ matchId: match.id });
					return matchId;
				},
				videoInfo.externalId,
				startSec
			);

			return matchId;
		},
		{ behavior: 'immediate' }
	);

/* -------------------------------------------------------------------------- */
/*                               updateMatch                                  */
/* -------------------------------------------------------------------------- */

export const updateMatch = (db: xxDatabase, matchId: number, matchInfo: z.infer<typeof matchSchema>) =>
	db.transaction(
		async (tx) => {
			// Fetch existing match so we know the side ids
			const existing = await tx
				.select({
					id: match.id,
					videoId: match.videoId,
					leftSideId: match.leftSideId,
					rightSideId: match.rightSideId,
					patch: match.patch
				})
				.from(match)
				.where(eq(match.id, matchId))
				.get();

			if (!existing) {
				throw new Error(`Match with id ${matchId} not found`);
			}

			const patch = matchInfo.patch && matchInfo.patch.length > 0 ? matchInfo.patch : existing.patch;

			const { leftSideId, rightSideId } = existing;

			const { videoId, startSec, videoInfo } = await resolveVideoForMatch(tx, matchInfo.video);

			// Update both sides (but only actually UPDATE MatchSide)
			await upsertMatchSide(tx, matchInfo.left, leftSideId);
			await upsertMatchSide(tx, matchInfo.right, rightSideId);

			await withUniqueMatchConstraintHandling(
				async () => {
					// Only UPDATE the Match table
					await tx
						.update(match)
						.set({
							videoId,
							startSec,
							patch
							// Thread more fields from matchInfo here if/when you persist them:
							// title, context, notes, etc.
						})
						.where(eq(match.id, matchId));

					return matchId;
				},
				videoInfo.externalId,
				startSec
			);

			return matchId;
		},
		{ behavior: 'immediate' }
	);

// TODO: might be interesting to mess with https://orm.drizzle.team/docs/rqb#prepared-statements
// since we need a db to prepare on might be nice to make a "db" factory that creates the db and gets all prepared statements

type MachQueryWith = NonNullable<Parameters<xxDatabase['query']['match']['findFirst']>[0]>['with'];

const sideWithClause = {
	columns: { teamId: false, id: false },
	with: {
		team: true,
		sidePlayers: { columns: { role: true }, with: { player: { columns: { name: true } } } }
	}
} satisfies NonNullable<MachQueryWith>['leftSide'];

export type CombinedMatchInfo = NonNullable<Awaited<ReturnType<typeof getMatch>>>;

export const combinedMatchInfoSchema = matchSchema.extend({
	id: z.number()
});

export const getMatch = async (db: xxDatabase, matchId: number) => {
	return db.query.match.findFirst({
		where: (match, { eq }) => eq(match.id, matchId),
		columns: {
			videoId: false,
			leftSideId: false,
			rightSideId: false
		},
		with: {
			leftSide: sideWithClause,
			rightSide: sideWithClause,
			video: true
		}
	});
};

type ExtractData<T> =
	T extends SQLiteColumn<infer Inner>
		? Inner extends { data: infer E; notNull: true }
			? E
			: Inner extends { data: infer E; notNull: false }
				? E | null
				: never
		: never;

const typed_as = <X extends ColumnBaseConfig<ColumnDataType, string>, T extends SQLiteColumn<X>>(
	col: T,
	alias: string
): SQL.Aliased<ExtractData<T>> => {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return sql`${col}`.as(alias) as any;
};

const sideSelects = {
	id: typed_as(matchSide.id, 'id'),
	point_char: typed_as(team.pointChar, 'point_char'),
	assist_char: typed_as(team.assistChar, 'assist_char'),
	fuse: typed_as(team.fuse, 'fuse'),
	char_swap: typed_as(team.charSwapBeforeRound, 'char_swap'),

	players: sql<string>`json_group_array(json_object('name', ${player.name}, 'role', ${matchSidePlayer.role}))`.as(
		'players'
	)
};

type SideSelectsRaw = typeof sideSelects;

type SideSelectTypes = { [K in keyof SideSelectsRaw]: InferAlias<SideSelectsRaw[K]> };

type PrefixKeys<T, P extends string> = {
	[K in keyof T as K extends string | number ? `${P}${K}` : K]: T[K];
};

type LeftSideSelects = PrefixKeys<SideSelectsRaw, 'left_'>;
type RightSideSelects = PrefixKeys<SideSelectsRaw, 'right_'>;

const matchSelects = {
	match_id: typed_as(match.id, 'match_id'),
	match_left_side_id: typed_as(match.leftSideId, 'match_left_side_id'),
	match_right_side_id: typed_as(match.rightSideId, 'match_right_side_id'),
	match_start_sec: typed_as(match.startSec, 'match_start_sec'),
	match_end_sec: typed_as(match.endSec, 'match_end_sec'),
	match_title: typed_as(match.title, 'match_title'),
	match_context: typed_as(match.context, 'match_context'),
	match_created_at: typed_as(match.created_at, 'match_created_at'),
	match_patch: typed_as(match.patch, 'match_patch'),
	match_notes: typed_as(match.notes, 'match_notes')
};

type MatchSelects = typeof matchSelects;

const videoSelects = {
	video_id: typed_as(videoSource.id, 'video_id'),
	video_platform: typed_as(videoSource.platform, 'video_platform'),
	video_external_id: typed_as(videoSource.externalId, 'video_external_id'),
	video_url: typed_as(videoSource.url, 'video_url')
};

type VideoSelects = typeof videoSelects;

type InferAlias<T> = T extends SQL.Aliased<infer I> ? I : never;

type AllSelects = LeftSideSelects & RightSideSelects & MatchSelects & VideoSelects;

type RawGetRow = {
	[K in keyof AllSelects]: InferAlias<AllSelects[K]>;
};

const playerSchema = z
	.object({
		name: z.string().nonempty(),
		role: z.enum(PLAYER_ROLE)
	})
	.transform(({ name, role }) => ({ player: { name }, role }));

type GetMatchRes = {
	rows: CombinedMatchInfo[];
	totalCount: number;
	offset: number;
};

export const getMatches = async (db: xxDatabase, filter: MatchFilter): Promise<GetMatchRes> => {
	const filterIf = <T, FilterFn extends (x: T) => SQL<unknown>>(
		cond: T | undefined,
		filter: SQL<unknown> | FilterFn
	) => {
		if (!cond) {
			return sql`true`;
		}

		if (typeof filter === 'function') {
			return filter(cond);
		}

		return filter;
	};

	// not selected on in final query but filtered on later
	const sideComputed = {
		player_filter: filterIf(filter.player && filter.player.length, sql`${like(player.name, `%${filter.player}%`)}`).as(
			'player_filter'
		),

		fuse_filter: filterIf(filter.fuse.length, () => sql`${inArray(team.fuse, filter.fuse)}`).as('fuse_filter')
	};

	const sideSubquery = db
		.select({ ...sideSelects, ...sideComputed })
		.from(matchSide)
		.innerJoin(team, eq(team.id, matchSide.teamId))
		.innerJoin(matchSidePlayer, eq(matchSidePlayer.sideId, matchSide.id))
		.innerJoin(player, eq(matchSidePlayer.playerId, player.id))
		.groupBy(matchSide.id, team.pointChar, team.assistChar, team.fuse, team.charSwapBeforeRound);

	const matchVideo = db
		.select({ ...matchSelects, ...videoSelects })
		.from(match)
		.innerJoin(videoSource, eq(videoSource.id, match.videoId));

	const getSideField = (side: 'left' | 'right', field: keyof typeof sideSelects | keyof typeof sideComputed) => {
		return sql.raw(`${side}SideInfo.${field}`);
	};

	const getSideSelectStr = (side: 'left' | 'right') => {
		const keys = Object.keys(sideSelects) as unknown as (keyof typeof sideSelects)[];

		return sql.join(
			keys.map((k) => {
				const alias = sql.raw(`${side}_${k}`);
				return sql`${getSideField(side, k).as()} as ${alias}`;
			}),
			sql`, `
		);
	};

	const matchVideoSelects = sql.join(
		Object.keys({ ...matchSelects, ...videoSelects }).map((k) => sql.raw(k)),
		sql`, `
	);

	const checkSideFilter = (filter: keyof typeof sideComputed) => {
		return sql`(${getSideField('left', filter)} = true or ${getSideField('right', filter)} = true)`;
	};

	const filterChecks = sql.join(
		(Object.keys(sideComputed) as (keyof typeof sideComputed)[]).map((k) => checkSideFilter(k)),
		sql` and `
	);

	const characterFilter = filterIf(filter.character.length, () => {
		const left_point = getSideField('left', 'point_char');
		const left_assist = getSideField('left', 'assist_char');

		const right_point = getSideField('right', 'point_char');
		const right_assist = getSideField('right', 'assist_char');

		return sql.join(
			filter.character.map((c) => sql`${c} in (${left_point}, ${left_assist}, ${right_point}, ${right_assist})`),
			sql` and `
		);
	});

	const base_query = sql`
		WITH 
			sideInfo as ${sideSubquery},
			matchVideo as ${matchVideo}
		select 
			${matchVideoSelects},
			${getSideSelectStr('left')},
			${getSideSelectStr('right')}
		from matchVideo
		left join sideInfo as leftSideInfo on leftSideInfo.id = matchVideo.match_left_side_id
		left join sideInfo as rightSideInfo on rightSideInfo.id = matchVideo.match_right_side_id
		WHERE ${filterChecks} and ${characterFilter}
	`;

	const get_count = async () => {
		const count_query = sql`SELECT count(1) as count from (${base_query})`;

		const res: { count: number } = await db.get(count_query);
		return res.count;
	};

	const limit = filter.limit ?? 10;
	const page = filter.page ?? 1;
	const offset = (page - 1) * limit;

	const get_rows = async () => {
		const row_query = sql`
			SELECT * from (${base_query})
			ORDER by match_created_at DESC
			LIMIT ${limit}
			OFFSET ${offset}
		`;

		// console.log(queryDebug(row_query).sql);

		const rows: RawGetRow[] = await db.all(row_query);

		return rows.map((r): CombinedMatchInfo => {
			const get_side = (side: 'left' | 'right') => {
				const k = <K extends keyof SideSelectTypes>(key: K) => r[`${side}_${key}`];
				return {
					team: {
						id: k('id'),
						pointChar: k('point_char'),
						assistChar: k('assist_char'),
						charSwapBeforeRound: k('char_swap'),
						fuse: k('fuse')
					},
					sidePlayers: z.array(playerSchema).parse(JSON.parse(k('players')))
				};
			};

			return {
				context: r.match_context,
				created_at: r.match_created_at,
				startSec: r.match_start_sec,
				endSec: r.match_end_sec,
				id: r.match_id,
				notes: r.match_notes,
				patch: r.match_patch,
				title: r.match_title,
				video: {
					id: r.video_id,
					url: r.video_url,
					externalId: r.video_external_id,
					platform: r.video_platform
				},
				leftSide: get_side('left'),
				rightSide: get_side('right')
			};
		});
	};

	const [rows, totalCount] = await Promise.all([get_rows(), get_count()]);

	return {
		rows,
		totalCount,
		offset
	};
};
