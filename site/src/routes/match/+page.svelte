<script lang="ts">
	import MatchRow from '$lib/components/MatchRow.svelte';
	import MatchFilter from '$lib/components/MatchFilter.svelte';
	import PaginationNav from 'flowbite-svelte/PaginationNav.svelte';
	import { ArrowLeftOutline, ArrowRightOutline } from 'flowbite-svelte-icons';
	import { page } from '$app/state';

	const initialPage = Number(page.url.searchParams.get('page')) || 1;
	let currentPage = $state(initialPage);

	function handlePageChange(page: number) {
		currentPage = page;
	}

	const { data } = $props();
	const { matches, totalPages, totalMatches, offset, limit } = $derived(data);

	const numShown = $derived(Math.min(limit, matches.length));
	const endShown = $derived(numShown + offset);
</script>

<div class="mx-auto w-full max-w-5xl px-3 sm:w-11/12 md:w-5/6 lg:w-2/3 xl:w-3/5 2xl:w-1/2">
	<div class="flex flex-col gap-4 pt-2 pb-2 md:flex-row">
		<aside class="md:sticky md:top-4 md:w-64 md:shrink-0">
			<MatchFilter bind:pageNum={currentPage} />
		</aside>

		<main class="flex-1">
			<div class="mx-auto flex w-full max-w-2xl flex-col space-y-3">
				{#each matches as m (m.id)}
					<MatchRow match={m} />
				{/each}

				<div class="flex justify-center">
					<div class="flex flex-col items-center justify-center gap-2">
						<div class="text-sm text-gray-700 dark:text-gray-400">
							Showing <span class="font-semibold text-gray-900 dark:text-white">{offset + 1}</span>
							to
							<span class="font-semibold text-gray-900 dark:text-white">{endShown}</span>
							of
							<span class="font-semibold text-gray-900 dark:text-white">{totalMatches}</span>
							Matches
						</div>
						<PaginationNav
							layout="navigation"
							size="large"
							class="flex justify-center"
							{currentPage}
							{totalPages}
							onPageChange={handlePageChange}
						>
							{#snippet prevContent()}
								<ArrowLeftOutline class="h-5 w-5" />
							{/snippet}
							{#snippet nextContent()}
								<ArrowRightOutline class="h-5 w-5" />
							{/snippet}
						</PaginationNav>
					</div>
				</div>
			</div>
		</main>
	</div>
</div>
