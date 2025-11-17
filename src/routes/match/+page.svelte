<script lang="ts">
	import MatchRow from '$lib/components/MatchRow.svelte';
	import MatchFilter from '$lib/components/MatchFilter.svelte';

	const { data } = $props();
	const { matches } = $derived(data);
</script>

<div class="mx-auto w-full max-w-5xl px-3 sm:w-11/12 md:w-5/6 lg:w-2/3 xl:w-3/5 2xl:w-1/2">
	<MatchFilter />

	<div class="flex flex-col space-y-3">
		{#each matches as m (m.id)}
			<MatchRow match={m} />
		{/each}
	</div>
</div>
