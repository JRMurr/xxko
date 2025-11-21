import {
	match,
	videoSource,
	team,
	matchSide,
	matchSidePlayer,
	player
} from '$lib/server/db/schema';
import { type xxDatabase } from '$lib/server/db';
import { extractYouTubeInfo, matchSchema, matchSideSchema, type MatchFilter } from '$lib/schemas';
import { PLAYER_ROLE, type PlayerRole } from '$lib/constants';
import z from 'zod';
import {
	and,
	eq,
	inArray,
	like,
	SQL,
	sql,
	type ColumnBaseConfig,
	type ColumnDataType
} from 'drizzle-orm';
import type { SQLiteColumn } from 'drizzle-orm/sqlite-core';
// import { queryDebug } from '$test/utils';

export const createMatch = (db: xxDatabase, matchInfo: z.infer<typeof matchSchema>) =>
	db.transaction(
		async (tx) => {
			// TODO: call out to youtube api to do some level of validation that the link is probably 2xko?
			// TODO: twitch support

			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			const youtubeInfo = extractYouTubeInfo(matchInfo.video)!;

			const videoInfo = {
				url: matchInfo.video,
				externalId: youtubeInfo.id
			};

			let videoId: number;

			const maybeVideo = await tx
				.select({ id: videoSource.id })
				.from(videoSource)
				.where(eq(videoSource.externalId, videoInfo.externalId))
				.limit(1); // TODO: and platform when supporting twitch

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

			const handleSide = async (info: z.infer<typeof matchSideSchema>) => {
				let teamId: number;

				const maybeTeam = await tx
					.select({ id: team.id })
					.from(team)
					.where(
						and(
							eq(team.pointChar, info.team.pointChar),
							eq(team.assistChar, info.team.assistChar),
							eq(team.fuse, info.team.fuse),
							eq(team.charSwapBeforeRound, !!info.team.charSwapBeforeRound)
						)
					)
					.limit(1);

				if (maybeTeam.length === 1) {
					teamId = maybeTeam[0].id;
				} else {
					const res = await tx
						.insert(team)
						.values(info.team)
						.onConflictDoNothing()
						.returning({ teamId: team.id });
					teamId = res[0].teamId;
				}

				const [{ sideId }] = await tx
					.insert(matchSide)
					.values({
						teamId
					})
					.returning({ sideId: matchSide.id });

				const handlePlayer = async (name: string, role: PlayerRole) => {
					const maybePlayer = await tx.select().from(player).where(eq(player.name, name)).limit(1);

					let playerId: number;
					if (maybePlayer.length === 1) {
						playerId = maybePlayer[0].id;
					} else {
						const res = await tx.insert(player).values({ name }).returning({ playerId: player.id });
						playerId = res[0].playerId;
					}

					await tx.insert(matchSidePlayer).values({ sideId, playerId, role });
				};

				await handlePlayer(info.pointPlayerName, 'point');

				if (info.assistPlayerName) {
					await handlePlayer(info.assistPlayerName, 'assist');
				}

				return sideId;
			};

			const leftSideId = await handleSide(matchInfo.left);
			const rightSideId = await handleSide(matchInfo.right);

			const [{ matchId }] = await tx
				.insert(match)
				.values({
					leftSideId,
					rightSideId,
					videoId,
					startSec: youtubeInfo.start ?? 0
				})
				.returning({ matchId: match.id });

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

	players:
		sql<string>`json_group_array(json_object('name', ${player.name}, 'role', ${matchSidePlayer.role}))`.as(
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
};

export const getMatches = async (db: xxDatabase, filter: MatchFilter): Promise<GetMatchRes> => {
	const filterIf = <T, FilterFn extends (x: T) => SQL<undefined>>(
		cond: T | undefined,
		filter: SQL<undefined> | FilterFn
	) => {
		if (!cond) {
			return undefined;
		}

		if (typeof filter === 'function') {
			return filter(cond);
		}

		return filter;
	};

	const sideFilters = [
		filterIf(
			filter.player && filter.player.length,
			sql`${like(player.name, `%${filter.player}%`)}`
		),
		filterIf(filter.fuse.length, () => sql`${inArray(team.fuse, filter.fuse)}`),
		filterIf(
			filter.character.length,
			() =>
				sql`(${inArray(team.pointChar, filter.character)} or ${inArray(team.assistChar, filter.character)})`
		)
	].filter((maybeFilter) => !!maybeFilter);

	const sideFilterStr = sideFilters.length ? sql.join(sideFilters, sql` and `) : sql`true`;

	// not selected on in final query but filtered on later
	const sideComputed = {
		side_filter: sql<number>`max(${sideFilterStr})`.as(`side_filter`)
	};

	const sideSubquery = db
		.select({ ...sideSelects, ...sideComputed })
		.from(matchSide)
		.innerJoin(team, eq(team.id, matchSide.teamId))
		.innerJoin(matchSidePlayer, eq(matchSidePlayer.sideId, matchSide.id))
		.innerJoin(player, eq(matchSidePlayer.playerId, player.id))
		.groupBy(team.pointChar, team.assistChar, team.fuse, team.charSwapBeforeRound);

	const matchVideo = db
		.select({ ...matchSelects, ...videoSelects })
		.from(match)
		.innerJoin(videoSource, eq(videoSource.id, match.videoId));

	const getSideField = (
		side: 'left' | 'right',
		field: keyof typeof sideSelects | keyof typeof sideComputed
	) => {
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
		WHERE ${getSideField('left', 'side_filter')} = true or ${getSideField('right', 'side_filter')} = true
	`;

	const get_count = async () => {
		const count_query = sql`SELECT count(1) as count from (${base_query})`;

		const res: { count: number } = await db.get(count_query);
		return res.count;
	};

	const get_rows = async () => {
		const limit = filter.limit ?? 10;
		const page = filter.page ?? 1;
		const offset = (page - 1) * limit;

		const row_query = sql`
			SELECT * from (${base_query})
			ORDER by match_created_at DESC
			LIMIT ${limit}
			OFFSET ${offset}
		`;

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
		totalCount
	};
};
