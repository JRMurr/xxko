import { getMatches } from '$lib/server/match';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const search_params = url.searchParams;
	console.log('search', search_params);
	return {
		matches: await getMatches(locals.db, { limit: 10 })
	};
};
