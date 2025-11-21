<script lang="ts">
	import { Button, Modal } from 'flowbite-svelte';

	import { zod4 } from 'sveltekit-superforms/adapters'; // <-- client adapter
	import { defaults } from 'sveltekit-superforms';
	import { matchSchema } from '$lib/schemas';
	import CreateMatch from './CreateMatch.svelte';
	import type { ActionResult } from '@sveltejs/kit';
	let open = $state(false);

	const form = defaults(zod4(matchSchema));

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
