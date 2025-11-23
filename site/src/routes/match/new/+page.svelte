<script lang="ts">
	import CreateMatch from '$lib/components/CreateMatch.svelte';

	let { data } = $props();
</script>

<CreateMatch data={data.form} action="/match/new" submitLabel="Submit"></CreateMatch>
