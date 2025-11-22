import { describe, it, expect, beforeEach, afterEach, assert } from 'vitest';
import { createMatch, DuplicateMatchError, getMatch, updateMatch } from '.';
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

describe('create/update', () => {
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

describe('update match', () => {
	it('updates sides, teams, and players for an existing match', async () => {
		const matchId = await createMatch(ctx.db, matchInfo);
		expect(matchId).toBeDefined();

		const original = await getMatch(ctx.db, matchId);
		assert(original);

		// sanity check original state
		assert.sameDeepMembers(original.leftSide.sidePlayers, [
			{
				role: 'point',
				player: { name: 'leftPad' }
			}
		]);
		assert.sameDeepMembers(original.rightSide.sidePlayers, [
			{
				role: 'point',
				player: { name: 'foo' }
			},
			{
				role: 'assist',
				player: { name: 'bar' }
			}
		]);
		expect(original.leftSide.team).toMatchObject(leftTeam);
		expect(original.rightSide.team).toMatchObject(rightTeam);

		// Updated match info:
		// - change left assist char (forces new team / teamId)
		// - change left point player name
		// - change right assist player name
		const updatedLeftTeam = {
			...leftTeam,
			assistChar: 'Darius'
		} as const;

		const updatedMatchInfo = matchSchema.parse({
			...matchInfo,
			left: {
				...matchInfo.left,
				pointPlayerName: 'leftUpdated',
				team: updatedLeftTeam
			},
			right: {
				...matchInfo.right,
				pointPlayerName: 'foo', // same
				assistPlayerName: 'baz', // changed
				team: rightTeam // keep same team to verify only left team changes
			}
		});

		const updatedId = await updateMatch(ctx.db, matchId, updatedMatchInfo);
		expect(updatedId).toEqual(matchId);

		const updated = await getMatch(ctx.db, matchId);
		assert(updated);

		// Video should be the same URL / external id for this test
		expect(updated.video.url).toEqual(url);
		expect(updated.video.externalId).toEqual('hsP7lO_yz7Q');

		// Left side team should reflect the updated team (assistChar changed)
		expect(updated.leftSide.team).toMatchObject(updatedLeftTeam);

		// Right side team should be unchanged
		expect(updated.rightSide.team).toMatchObject(rightTeam);

		// Players should be updated to reflect the new names
		assert.sameDeepMembers(updated.leftSide.sidePlayers, [
			{
				role: 'point',
				player: { name: 'leftUpdated' }
			}
		]);

		assert.sameDeepMembers(updated.rightSide.sidePlayers, [
			{
				role: 'point',
				player: { name: 'foo' }
			},
			{
				role: 'assist',
				player: { name: 'baz' }
			}
		]);
	});
});
