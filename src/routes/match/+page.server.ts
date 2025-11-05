import { getMatches } from '$lib/server/match';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	return {
		matches: await getMatches(locals.db, 10)
	};
};
