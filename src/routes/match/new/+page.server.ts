import { createMatch } from '$lib/server/match';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { matchSchema } from '$lib/schemas';

export const load: PageServerLoad = async () => {
	// Build an empty form from the schema for initial render
	const form = await superValidate(zod4(matchSchema));
	return { form };
};

export const actions = {
	default: async (event) => {
		const form = await superValidate(event, zod4(matchSchema));
		if (!form.valid) {
			return fail(400, { form });
		}

		try {
			await createMatch(event.locals.db, form.data);

			// Option 1: redirect to detail page (classic post/redirect/get)
			// throw redirect(303, `/widgets/${widget.id}`);

			// Option 2: keep user on page and show a success flash (AJAX-friendly)
			return message(form, 'Created!');
		} catch (e: unknown) {
			// Attach a top-level error message
			let msgText = 'something went wrong';
			if (e instanceof Error) {
				msgText = e.message;
			}
			return message(form, msgText, { status: 500 });
		}
	}
} satisfies Actions;
