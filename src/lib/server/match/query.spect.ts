import { describe, it, expect, assert, beforeAll, afterAll } from 'vitest';

import { makeMemoryDb, type TestDb } from '$test/utils';

describe('query matches', () => {
	let ctx: TestDb;
	beforeAll(async () => {
		ctx = await makeMemoryDb();
	});
	afterAll(async () => {
		if (ctx) {
			await ctx.cleanup();
		}
	});
});
