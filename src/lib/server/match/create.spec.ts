import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { createMatch, matchSchema } from '.';
import { createDbFromClient } from '../db';

// TODO: pull this into a test helper
export function makeMemoryDb() {
	const sqlite = new Database(':memory:'); // isolated per test
	const db = createDbFromClient(sqlite);
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
	ctx.reset();
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
