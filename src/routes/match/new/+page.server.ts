import { createMatch, matchSchema } from '$lib/server/match';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { superValidate, message } from 'sveltekit-superforms';
import { arktype } from 'sveltekit-superforms/adapters';

export const load: PageServerLoad = async () => {
	// Build an empty form from the schema for initial render
	const form = await superValidate(arktype(matchSchema));
	return { form };
};

export const actions = {
	default: async ({ request, locals }) => {
		const form = await superValidate(request, arktype(matchSchema));
		if (!form.valid) {
			return fail(400, { form });
		}

		try {
			const match = await createMatch(locals.db, form.data);

			// Option 1: redirect to detail page (classic post/redirect/get)
			// throw redirect(303, `/widgets/${widget.id}`);

			// Option 2: keep user on page and show a success flash (AJAX-friendly)
			// return message(form, 'Created!', { status: 201 });
			// return { form };
		} catch (e: any) {
			// Attach a top-level error message
			return message(form, e?.message ?? 'Something went wrong', { status: 500 });
		}
	}
} satisfies Actions;
