import { describe, it, expect, beforeEach, afterEach, assert } from 'vitest';
import { createMatch, getMatch } from '.';
import * as schema from '$lib/server/db/schema';
import { createDbFromClient } from '../db';
import { tmpdir } from 'node:os';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { createClient } from '@libsql/client';
import { pushSQLiteSchema } from 'drizzle-kit/api';
import { matchSchema } from '$lib/schemas';

// TODO: pull this into a test helper
export async function makeMemoryDb() {
	const dir = await mkdtemp(join(tmpdir(), 'drizzle-'));
	const fileUrl = `file:${join(dir, 'test.sqlite')}`;

	const client = createClient({ url: fileUrl });

	const db = createDbFromClient(client);
	// https://github.com/drizzle-team/drizzle-orm/issues/4205#issue-2890429466
	const { apply } = await pushSQLiteSchema(schema, db);
	await apply();
	return {
		db,
		fileUrl,
		cleanup: async () => {
			await rm(dir, { recursive: true, force: true });
		}
	};
}

let ctx: Awaited<ReturnType<typeof makeMemoryDb>>;

beforeEach(async () => {
	ctx = await makeMemoryDb();
});
afterEach(async () => {
	if (ctx) {
		await ctx.cleanup();
	}
});

describe('create match', () => {
	it('create a match', async () => {
		const url = 'https://www.youtube.com/watch?v=hsP7lO_yz7Q';

		const leftTeam = {
			pointChar: 'Ahri',
			assistChar: 'Blitzcrank',
			fuse: 'DoubleDown'
		} as const;

		const rightTeam = {
			pointChar: 'Ekko',
			assistChar: 'Darius',
			fuse: 'sidekick',
			charSwapBeforeRound: true
		} as const;

		const matchInfo = matchSchema.from({
			video: {
				url
			},
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
	});
});
