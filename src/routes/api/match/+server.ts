import type { RequestHandler } from '@sveltejs/kit';
import { getMatches, createMatch } from '$lib/server/match';

import { json } from '@sveltejs/kit';
import { matchSchema } from '$lib/schemas';
import { requireAdmin } from '$lib/server/api-auth';

export const POST: RequestHandler = async (event) => {
	requireAdmin(event);
	const rawBody = await event.request.json();

	const parsedBody = matchSchema.parse(rawBody);

	const created = await createMatch(event.locals.db, parsedBody);

	return json(created);
};

export const GET: RequestHandler = async (event) => {
	requireAdmin(event);
	const res = await getMatches(event.locals.db, {
		limit: 10,
		character: [],
		fuse: [],
		player: ''
	});

	return json(res);
};
