import { getMatch, DuplicateMatchError, type CombinedMatchInfo, updateMatch } from '$lib/server/match';
import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { matchSchema, matchSideSchema } from '$lib/schemas';
import type z from 'zod';

type MatchInput = z.infer<typeof matchSchema>;
type MatchSideInput = z.infer<typeof matchSideSchema>;

const mapSideToMatchSideInput = (side: CombinedMatchInfo['leftSide']): MatchSideInput => {
	const point = side.sidePlayers.find((p) => p.role === 'point');
	if (!point) {
		throw new Error('Side is missing point player');
	}
	const assist = side.sidePlayers.find((p) => p.role === 'assist');

	return {
		team: {
			pointChar: side.team.pointChar,
			assistChar: side.team.assistChar,
			fuse: side.team.fuse,
			// DB stores boolean; schema has it optional. Treat "false" as undefined
			...(side.team.charSwapBeforeRound ? { charSwapBeforeRound: true } : {})
		},
		pointPlayerName: point.player.name,
		assistPlayerName: assist?.player.name
	};
};

const combinedMatchToMatchInput = (m: CombinedMatchInfo): MatchInput => {
	return {
		video: m.video.url,
		left: mapSideToMatchSideInput(m.leftSide),
		right: mapSideToMatchSideInput(m.rightSide),
		patch: m.patch ?? ''
	};
};

export const load: PageServerLoad = async ({ url, locals, params }) => {
	const match = await getMatch(locals.db, Number(params.id));

	if (!match) error(404, 'Not found');

	const matchInfo = combinedMatchToMatchInput(match);

	const form = await superValidate(matchInfo, zod4(matchSchema));
	const redirectTo = url.searchParams.get('redirectTo') ?? '/match';

	return {
		form,
		redirectTo
	};
};

export const actions = {
	default: async (event) => {
		const id = Number(event.params.id);

		if (!Number.isFinite(id) || !Number.isInteger(id) || id <= 0) {
			throw error(404, 'Not found');
		}

		const form = await superValidate(event, zod4(matchSchema));
		if (!form.valid) {
			return fail(400, { form });
		}

		try {
			await updateMatch(event.locals.db, id, form.data);
		} catch (e: unknown) {
			console.log(e);
			if (e instanceof DuplicateMatchError) {
				return error(400, { message: e.message });
			}
			// Attach a top-level error message
			let msgText = 'something went wrong';
			if (e instanceof Error) {
				msgText = e.message;
			}

			const status = 500;

			return message(form, msgText, { status });
		}

		const redirectTo = event.url.searchParams.get('redirectTo') ?? '/match';
		throw redirect(303, redirectTo);
	}
} satisfies Actions;
