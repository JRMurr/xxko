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
import z from 'zod';
import { and, eq, getTableColumns, sql } from 'drizzle-orm';
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

export const getMatches = async (
	db: xxDatabase,
	filter: MatchFilter
): Promise<CombinedMatchInfo[]> => {
	const { match, videoSource, team, matchSide, matchSidePlayer, player } = schema;

	const sideSelects = {
		id: sql<number>`${matchSide.id}`.as(`id`),
		point_char: sql<string>`${team.pointChar}`.as(`point_char`),
		assist_char: sql<string>`${team.assistChar}`.as(`assist_char`),
		fuse: sql<string>`${team.fuse}`.as(`fuse`),
		char_swap: sql<number>`${team.charSwapBeforeRound}`.as(`char_swap`),

		player:
			sql`json_group_array(json_object('name', ${player.name}, 'role', ${matchSidePlayer.role}))`.as(
				'player'
			)
	};

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const { player: _player, ...side_group_by } = sideSelects;

	const sideSubquery = db
		.select(sideSelects)
		.from(matchSide)
		.innerJoin(team, eq(team.id, matchSide.teamId))
		.innerJoin(matchSidePlayer, eq(matchSidePlayer.sideId, matchSide.id))
		.innerJoin(player, eq(matchSidePlayer.playerId, player.id))
		.groupBy(team.pointChar, team.assistChar, team.fuse, team.charSwapBeforeRound);

	const matchSelects = {
		match_id: sql`${match.id}`.as('match_id'),
		match_left_side_id: sql`${match.leftSideId}`.as('match_left_side_id'),
		match_right_side_id: sql`${match.rightSideId}`.as('match_right_side_id'),
		match_start_sec: sql`${match.startSec}`.as('match_start_sec'),
		match_end_sec: sql`${match.endSec}`.as('match_end_sec'),
		match_title: sql`${match.title}`.as('match_title'),
		match_context: sql`${match.context}`.as('match_context'),
		match_created_at: sql`${match.created_at}`.as('match_created_at'),
		match_patch: sql`${match.patch}`.as('match_patch'),
		match_notes: sql`${match.notes}`.as('match_notes')
	};

	const videoSelects = {
		video_platform: sql`${videoSource.platform}`.as('video_platform'),
		video_external_id: sql`${videoSource.externalId}`.as('video_external_id'),
		video_url: sql`${videoSource.url}`.as('video_url')
	};

	const matchVideo = db
		.select({ ...matchSelects, ...videoSelects })
		.from(match)
		.innerJoin(videoSource, eq(videoSource.id, match.videoId));

	const getSideSelectStr = (side: 'left' | 'right') => {
		const keys = Object.keys(sideSelects) as unknown as (keyof typeof sideSelects)[];
		return sql.join(
			keys.map((k) => sql.raw(`${side}SideInfo.${k} as ${side}_${k}`)),
			sql`, `
		);
	};

	const matchVideoSelects = sql.join(
		Object.keys({ ...matchSelects, ...videoSelects }).map((k) => sql.raw(k)),
		sql`, `
	);

	const query = sql`
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
		limit 10
	`;

	console.log('query', queryToStr(query));

	const rows = await db.all(query);

	const grouped = rows.reduce((acc, row) => {
		if (acc[row.match_id]) {
			acc[row.match_id].push(row);
		} else {
			acc[row.match_id] = [row];
		}

		return acc;
	}, {});

	// console.log(grouped);

	return Object.values(rows);
};
