<script lang="ts">
	import CreateMatch from '$lib/components/CreateMatch.svelte';

	let { data } = $props();
</script>

<h1>Create Match</h1>

<CreateMatch data={data.form}></CreateMatch>
