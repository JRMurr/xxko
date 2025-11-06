import * as schema from '$lib/server/db/schema';
import { type xxDatabase } from '$lib/server/db';
import { extractYouTubeId, matchSchema, matchSideSchema } from '$lib/schemas';
import type { PlayerRole } from '$lib/constants';
import type z from 'zod';

export const createMatch = (db: xxDatabase, match: z.infer<typeof matchSchema>) =>
	db.transaction(
		async (tx) => {
			// TODO: call out to youtube api to do some level of validation that the link is probably 2xko?
			// TODO: twitch support

			const videoInfo = {
				url: match.video,
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				externalId: extractYouTubeId(match.video)!
			};

			const [{ videoId }] = await tx
				.insert(schema.videoSource)
				.values({ ...videoInfo, platform: 'youtube' })
				.onConflictDoNothing()
				.returning({ videoId: schema.videoSource.id });

			const handleSide = async (info: z.infer<typeof matchSideSchema>) => {
				const [{ teamId }] = await tx
					.insert(schema.team)
					.values(info.team)
					.onConflictDoNothing()
					.returning({ teamId: schema.team.id });

				const [{ sideId }] = await tx
					.insert(schema.matchSide)
					.values({
						teamId
					})
					.returning({ sideId: schema.matchSide.id });

				const handlePlayer = async (name: string, role: PlayerRole) => {
					const [{ playerId }] = await tx
						.insert(schema.player)
						.values({ name })
						.returning({ playerId: schema.player.id });

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
					startSec: 0 // TODO:
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

export const getMatches = async (db: xxDatabase, limit: number): Promise<CombinedMatchInfo[]> => {
	return db.query.match.findMany({
		orderBy: (match, { desc }) => [desc(match.created_at)],
		limit,
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
