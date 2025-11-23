<script lang="ts">
	import CreateMatch from '$lib/components/CreateMatch.svelte';
	import type { PageProps } from './$types';

	let { data, params }: PageProps = $props();

	const action = `/match/update/${params.id}?redirectTo=${encodeURIComponent(data.redirectTo)}`;
</script>

<CreateMatch data={data.form} {action} submitLabel="Update"></CreateMatch>
