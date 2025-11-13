<script lang="ts">
	import { Button, Modal, Input, P } from 'flowbite-svelte';
	import type { SuperValidated, Infer } from 'sveltekit-superforms';

	import { zod4 } from 'sveltekit-superforms/adapters'; // <-- client adapter
	import { defaults, superForm } from 'sveltekit-superforms';
	import { matchSchema } from '$lib/schemas';
	import CreateMatch from './CreateMatch.svelte';
	let open = $state(false);

	const form = defaults(zod4(matchSchema));

	// let { data }: { data: SuperValidated<Infer<typeof matchSchema>> } = $props();

	// const form = superForm(defaults(zod4Client(matchSchema)), {
	// 	// SPA: true,
	// 	validators: zod4Client(matchSchema),
	// 	dataType: 'json'
	// });
</script>

<Button color="alternative" onclick={() => (open = true)}>Add Match</Button>
<Modal bind:open title="Add match" size="xl">
	<CreateMatch data={form}></CreateMatch>
</Modal>
