import { describe, it, expect, beforeEach, afterEach, assert } from 'vitest';
import { createMatch, DuplicateMatchError, getMatch } from '.';
import { matchSchema } from '$lib/schemas';
import { makeMemoryDb, type TestDb } from '$test/utils';

let ctx: TestDb;

beforeEach(async () => {
	ctx = await makeMemoryDb();
});
afterEach(async () => {
	if (ctx) {
		await ctx.cleanup();
	}
});

describe('create match', () => {
	const url = 'https://www.youtube.com/watch?v=hsP7lO_yz7Q';

	const leftTeam = {
		pointChar: 'Ahri',
		assistChar: 'Blitzcrank',
		fuse: 'DoubleDown'
	} as const;

	const rightTeam = {
		pointChar: 'Ekko',
		assistChar: 'Darius',
		fuse: 'Sidekick',
		charSwapBeforeRound: true
	} as const;

	const matchInfo = matchSchema.parse({
		video: url,
		left: {
			pointPlayerName: 'leftPad',
			team: leftTeam
		},
		right: {
			pointPlayerName: 'foo',
			assistPlayerName: 'bar',
			team: rightTeam
		}
	});

	it('create a match', async () => {
		const matchId = await createMatch(ctx.db, matchInfo);
		expect(matchId).toBeDefined();

		const created = await getMatch(ctx.db, matchId);

		assert(created);

		expect(created.video.url).toEqual(url);
		expect(created.video.externalId).toEqual('hsP7lO_yz7Q');

		expect(created.leftSide.team).toMatchObject(leftTeam);
		expect(created.rightSide.team).toMatchObject(rightTeam);

		assert.sameDeepMembers(created.leftSide.sidePlayers, [
			{
				role: 'point',
				player: { name: 'leftPad' }
			}
		]);

		assert.sameDeepMembers(created.rightSide.sidePlayers, [
			{
				role: 'point',
				player: { name: 'foo' }
			},
			{
				role: 'assist',
				player: { name: 'bar' }
			}
		]);

		// should fail to create again
		await expect(createMatch(ctx.db, matchInfo)).rejects.toThrow(
			new DuplicateMatchError(created.video.externalId, 0)
		);
	});
});
