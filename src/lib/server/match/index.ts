import * as schema from '$lib/server/db/schema';
import { type xxDatabase } from '$lib/server/db';
import {
	charSchema,
	extractYouTubeInfo,
	fuseSchema,
	matchSchema,
	matchSideSchema
} from '$lib/schemas';
import type { PlayerRole } from '$lib/constants';
import z, { object } from 'zod';
import { and, eq, getTableColumns, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core/alias';
import type { SQLiteColumn } from 'drizzle-orm/sqlite-core';
import { queryToStr } from '$test/utils';

export const createMatch = (db: xxDatabase, match: z.infer<typeof matchSchema>) =>
	db.transaction(
		async (tx) => {
			// TODO: call out to youtube api to do some level of validation that the link is probably 2xko?
			// TODO: twitch support

			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			const youtubeInfo = extractYouTubeInfo(match.video)!;

			const videoInfo = {
				url: match.video,
				externalId: youtubeInfo.id
			};

			let videoId: number;

			const maybeVideo = await tx
				.select({ id: schema.videoSource.id })
				.from(schema.videoSource)
				.where(eq(schema.videoSource.externalId, videoInfo.externalId))
				.limit(1); // TODO: and platform when supporting twitch

			if (maybeVideo.length === 1) {
				videoId = maybeVideo[0].id;
			} else {
				const res = await tx
					.insert(schema.videoSource)
					.values({ ...videoInfo, platform: 'youtube' })
					.onConflictDoNothing()
					.returning({ videoId: schema.videoSource.id });
				videoId = res[0].videoId;
			}

			const handleSide = async (info: z.infer<typeof matchSideSchema>) => {
				let teamId: number;

				const maybeTeam = await tx
					.select({ id: schema.team.id })
					.from(schema.team)
					.where(
						and(
							eq(schema.team.pointChar, info.team.pointChar),
							eq(schema.team.assistChar, info.team.assistChar),
							eq(schema.team.fuse, info.team.fuse),
							eq(schema.team.charSwapBeforeRound, !!info.team.charSwapBeforeRound)
						)
					)
					.limit(1);

				if (maybeTeam.length === 1) {
					teamId = maybeTeam[0].id;
				} else {
					const res = await tx
						.insert(schema.team)
						.values(info.team)
						.onConflictDoNothing()
						.returning({ teamId: schema.team.id });
					teamId = res[0].teamId;
				}

				const [{ sideId }] = await tx
					.insert(schema.matchSide)
					.values({
						teamId
					})
					.returning({ sideId: schema.matchSide.id });

				const handlePlayer = async (name: string, role: PlayerRole) => {
					const maybePlayer = await tx
						.select()
						.from(schema.player)
						.where(eq(schema.player.name, name))
						.limit(1);

					let playerId: number;
					if (maybePlayer.length === 1) {
						playerId = maybePlayer[0].id;
					} else {
						const res = await tx
							.insert(schema.player)
							.values({ name })
							.returning({ playerId: schema.player.id });
						playerId = res[0].playerId;
					}

					await tx.insert(schema.matchSidePlayer).values({ sideId, playerId, role });
				};

				await handlePlayer(info.pointPlayerName, 'point');

				if (info.assistPlayerName) {
					await handlePlayer(info.assistPlayerName, 'assist');
				}

				return sideId;
			};

			const leftSideId = await handleSide(match.left);
			const rightSideId = await handleSide(match.right);

			const [{ matchId }] = await tx
				.insert(schema.match)
				.values({
					leftSideId,
					rightSideId,
					videoId,
					startSec: youtubeInfo.start ?? 0
				})
				.returning({ matchId: schema.match.id });

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

function singleOrArray<T extends z.ZodTypeAny>(inner: T): z.ZodArray<T> {
	return z
		.array(inner)
		.nonempty()
		.or(inner.transform((x) => [x])) as unknown as z.ZodArray<T>;
}

export const matchFilterSchema = z
	.object({
		character: singleOrArray(charSchema),
		limit: z.number(),
		fuse: singleOrArray(fuseSchema),
		player: z.string().nonempty(),
		patch: z.string().nonempty()
	})
	.partial();

type MatchFilter = z.infer<typeof matchFilterSchema>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeRow(obj: any) {
	// The libSQL node-sqlite3 compatibility wrapper returns rows
	// that can be accessed both as objects and arrays. Let's
	// turn them into objects what's what other SQLite drivers
	// do.
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return Object.keys(obj).reduce((acc: Record<string, any>, key) => {
		if (Object.prototype.propertyIsEnumerable.call(obj, key)) {
			acc[key] = obj[key];
		}
		return acc;
	}, {});
}

export const getMatches = async (
	db: xxDatabase,
	filter: MatchFilter
): Promise<CombinedMatchInfo[]> => {
	const { match, videoSource, team, matchSide, matchSidePlayer, player } = schema;

	const get_cols = (cols: Record<string, SQLiteColumn<any>>) => {
		return (Object.keys(cols) as unknown as (keyof typeof cols)[]).map((k) => cols[k].getSQL());
	};

	const {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		videoId: _vid_id,
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		leftSideId: _left_id,
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		rightSideId: _right_id,
		...match_fields
	} = getTableColumns(match);

	const match_fields_str = sql.join(get_cols(match_fields), sql.raw(', '));

	const video_selects = sql.join(get_cols(getTableColumns(videoSource)), sql.raw(', '));

	// const sideCte = sql`WITH sideJoined as (
	// 	SELECT
	// 		${team.pointChar},
	// 		${team.assistChar},
	// 		${team.fuse},
	// 		${team.charSwapBeforeRound},

	// 		${player.name} as player_name,
	// 		${matchSidePlayer.role} as player_role
	// 	FROM

	// )`;

	const sideSelects = {
		id: sql`${matchSide.id}`.as('id'),
		point_char: sql`${team.pointChar}`.as(`point_char`),
		assist_char: sql`${team.assistChar}`.as(`assist_char`),
		fuse: sql`${team.fuse}`.as(`fuse`),
		char_swap: sql`${team.charSwapBeforeRound}`.as(`char_swap`),
		// player
		player_name: sql`${player.name}`.as(`player_name`),
		player_role: sql`${matchSidePlayer.role}`.as(`player_role`)
	};

	const sideSubquery = db
		.select(sideSelects)
		.from(matchSide)
		.innerJoin(team, eq(team.id, matchSide.teamId))
		.innerJoin(matchSidePlayer, eq(matchSidePlayer.sideId, matchSide.id))
		.innerJoin(player, eq(matchSidePlayer.playerId, player.id));

	const getSideSelectStr = (side: 'left' | 'right') => {
		const keys = Object.keys(sideSelects) as unknown as (keyof typeof sideSelects)[];
		return sql.join(
			keys.map((k) => sql.raw(`${side}SideInfo.${k} as ${side}_${k}`)),
			sql`, `
		);
	};

	const query = sql`
		WITH sideInfo as ${sideSubquery}
		select 
			${match_fields_str},
			${video_selects},
			${getSideSelectStr('left')},
			${getSideSelectStr('right')}
		from ${match}
		join ${videoSource} on ${match.videoId} = ${videoSource.id}
		left join sideInfo as leftSideInfo on leftSideInfo.id = ${match.leftSideId}
		left join sideInfo as rightSideInfo on rightSideInfo.id = ${match.rightSideId}
	`;

	console.log('query', queryToStr(query));
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return (await db.run(query)).rows.map(normalizeRow) as any;
};
