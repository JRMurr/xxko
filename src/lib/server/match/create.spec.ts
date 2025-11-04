import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createMatch, matchSchema } from '.';
import { createDbFromClient } from '../db';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { createClient } from '@libsql/client';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { schema } from 'arktype/internal/keywords/keywords.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsFolder = resolve(__dirname, '../../../../drizzle');

// TODO: pull this into a test helper
export async function makeMemoryDb() {
	const dir = await mkdtemp(join(tmpdir(), 'drizzle-'));
	const fileUrl = `file:${join(dir, 'test.sqlite')}`;

	const client = createClient({ url: fileUrl });
	const db = createDbFromClient(client);
	await migrate(db, { migrationsFolder: migrationsFolder });
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
		const matchInfo = matchSchema.from({
			video: {
				url: 'https://www.youtube.com/watch?v=hsP7lO_yz7Q'
			},
			left: {
				pointPlayerName: 'leftPad',
				team: {
					pointChar: 'Ahri',
					assistChar: 'Blitzcrank',
					fuse: 'DoubleDown'
				}
			},
			right: {
				pointPlayerName: 'foo',
				assistPlayerName: 'bar',
				team: {
					pointChar: 'Ekko',
					assistChar: 'Darius',
					fuse: 'sidekick',
					charSwapBeforeRound: true
				}
			}
		});

		const matchId = await createMatch(ctx.db, matchInfo);
		expect(matchId).toBeDefined();

		const created = await ctx.db.query.match.findFirst({
			where: (match, { eq }) => eq(match.id, matchId)
		});

		expect(created).toBeDefined();
	});
});
