<script lang="ts">
	import MatchRow from '$lib/components/MatchRow.svelte';

	const { data } = $props();

	const { matches } = data;
</script>

<div class="flex flex-col divide-y">
	{#each matches as m}
		<MatchRow match={m} />
	{/each}
</div>
