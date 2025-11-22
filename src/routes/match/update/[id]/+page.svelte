<script lang="ts">
	import CreateMatch from '$lib/components/CreateMatch.svelte';
	import type { PageProps } from './$types';

	let { data, params }: PageProps = $props();
</script>

<CreateMatch data={data.form} action={`/match/update/${params.id}`} submitLabel="Update"
></CreateMatch>
