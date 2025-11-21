<script lang="ts">
	import MatchRow from '$lib/components/MatchRow.svelte';
	import MatchFilter from '$lib/components/MatchFilter.svelte';
	import { PaginationNav } from 'flowbite-svelte';
	import { page } from '$app/state';

	const initialPage = Number(page.url.searchParams.get('page')) || 1;
	let currentPage = $state(initialPage);

	function handlePageChange(page: number) {
		currentPage = page;
	}

	$inspect('currentPage', currentPage);

	const { data } = $props();
	const { matches, totalPages } = $derived(data);
</script>

<div class="mx-auto w-full max-w-5xl px-3 sm:w-11/12 md:w-5/6 lg:w-2/3 xl:w-3/5 2xl:w-1/2">
	<!-- Layout wrapper -->
	<div class="flex flex-col gap-4 pt-2 md:flex-row">
		<!-- Left: Filter -->
		<aside class="md:sticky md:top-4 md:w-64 md:shrink-0">
			<MatchFilter bind:pageNum={currentPage} />
		</aside>

		<!-- Right: Match list -->
		<main class="flex-1">
			<div class="flex flex-col space-y-3">
				{#each matches as m (m.id)}
					<MatchRow match={m} />
				{/each}

				<div class="flex justify-center">
					<PaginationNav
						table
						size="large"
						{currentPage}
						{totalPages}
						onPageChange={handlePageChange}
					/>
				</div>
			</div>
		</main>
	</div>
</div>
