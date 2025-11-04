import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { createMatch, matchSchema } from '.';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { createDbFromClient } from '../db';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsFolder = resolve(__dirname, '../../../../drizzle');

// TODO: pull this into a test helper
export function makeMemoryDb() {
	const sqlite = new Database(':memory:'); // isolated per test
	const db = createDbFromClient(sqlite);
	migrate(db, { migrationsFolder: migrationsFolder });
	return {
		db,
		sqlite,
		reset: () => {
			sqlite.close();
		}
	};
}

let ctx: ReturnType<typeof makeMemoryDb>;

beforeEach(() => {
	ctx = makeMemoryDb();
});
afterEach(() => {
	if (ctx) {
		ctx.reset();
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

		await createMatch(ctx.db, matchInfo);
	});
});
