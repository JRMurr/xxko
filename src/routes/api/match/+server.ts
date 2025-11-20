import type { RequestHandler } from '@sveltejs/kit';
import { getMatches, createMatch } from '$lib/server/match';

import { json } from '@sveltejs/kit';
import { matchSchema } from '$lib/schemas';

export const POST: RequestHandler = async ({ request, locals }) => {
	const rawBody = await request.json();

	const parsedBody = matchSchema.parse(rawBody);

	const created = await createMatch(locals.db, parsedBody);

	return json(created);
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const GET: RequestHandler = async ({ request, locals }) => {
	const res = await getMatches(locals.db, {
		limit: 10,
		character: [],
		fuse: [],
		player: ''
	});

	return json(res);
};
