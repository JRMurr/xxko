<script lang="ts">
	import Button from 'flowbite-svelte/Button.svelte';
	import Modal from 'flowbite-svelte/Modal.svelte';

	import { zod4 } from 'sveltekit-superforms/adapters'; // <-- client adapter
	import { defaults } from 'sveltekit-superforms';
	import { uiDefaultedMatchSchema } from '$lib/schemas';
	import CreateMatch from './CreateMatch.svelte';
	import type { ActionResult } from '@sveltejs/kit';
	let open = $state(false);

	const form = defaults(zod4(uiDefaultedMatchSchema));

	const onResult = ({ result }: { result: ActionResult }) => {
		if (result.type === 'success') {
			open = false;
			return;
		}
	};
</script>

<Button color="alternative" onclick={() => (open = true)}>Add Match</Button>
<Modal bind:open title="Add match" size="xl">
	<CreateMatch data={form} {onResult}></CreateMatch>
</Modal>
