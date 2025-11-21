<script lang="ts">
	import { matchFilterSchema, type MatchFilter } from '$lib/schemas';
	import Button from 'flowbite-svelte/Button.svelte';
	import MultiSelect from 'flowbite-svelte/MultiSelect.svelte';
	import Search from 'flowbite-svelte/Search.svelte';
	import type { SelectOptionType } from 'flowbite-svelte/types';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { CHARACTERS, FUSE } from '$lib/constants';
	import { searchParamsToValues } from '$lib/utils';
	import { SvelteURLSearchParams } from 'svelte/reactivity';

	const makeOptionItemArr = <T extends string>(arr: readonly T[]): SelectOptionType<T>[] => {
		return arr.map((x) => {
			return {
				name: x,
				value: x
			};
		});
	};

	const emptyFilter = matchFilterSchema.parse({});

	const startParams = page.url.searchParams;

	const startFilter = matchFilterSchema.parse(searchParamsToValues(startParams));
	const initialPageNum = startFilter.page ?? 1;

	let filters: MatchFilter = $state(startFilter);

	let {
		pageNum = $bindable(initialPageNum)
	}: {
		pageNum: number;
	} = $props();

	const clearFilters = () => {
		filters = emptyFilter;
		onChange({ debounce: false, resetPage: true });
	};

	let debounceHandle: NodeJS.Timeout | undefined;

	const DEBOUNCE_MS = 500;

	const updateSearchParams = ({ debounce }: { debounce: boolean }) => {
		const update = () => {
			const searchParams = new SvelteURLSearchParams();

			(Object.keys(filters) as unknown as (keyof MatchFilter)[]).forEach((k) => {
				if (k === 'limit') {
					return;
				}
				if (k === 'page') {
					return;
				}

				const val = filters[k];
				if (val) {
					if (val instanceof Array) {
						val.forEach((v) => {
							searchParams.append(k, v);
						});
					} else {
						searchParams.append(k, val.toString());
					}
				}
			});

			searchParams.set('page', pageNum.toString());

			const url = `?${searchParams.toString()}`;

			// eslint-disable-next-line @typescript-eslint/no-floating-promises, svelte/no-navigation-without-resolve
			goto(url, { replaceState: true, keepFocus: true });
		};

		clearTimeout(debounceHandle);

		if (debounce) {
			debounceHandle = setTimeout(update, DEBOUNCE_MS);
		} else {
			update();
		}
	};

	let lastPageNum = pageNum;

	const onChange = ({
		debounce,
		resetPage = false
	}: {
		debounce: boolean;
		resetPage?: boolean;
	}) => {
		if (resetPage && pageNum !== 1) {
			pageNum = 1;
		}

		updateSearchParams({ debounce });
	};

	$effect(() => {
		if (pageNum === lastPageNum) {
			return;
		}

		lastPageNum = pageNum;

		updateSearchParams({ debounce: false });
	});
</script>

<div class="mb-4 flex flex-col gap-3">
	<Search
		size="md"
		bind:value={filters.player}
		clearable
		class="w-full"
		oninput={() => onChange({ debounce: true, resetPage: true })}
		placeholder="Player Name"
	/>

	<div class="flex flex-wrap gap-3">
		<MultiSelect
			size="md"
			bind:value={filters.character}
			items={makeOptionItemArr(CHARACTERS)}
			name="character"
			class="min-w-32 flex-1"
			onchange={() => onChange({ debounce: false, resetPage: true })}
		/>

		<MultiSelect
			size="md"
			bind:value={filters.fuse}
			items={makeOptionItemArr(FUSE)}
			name="fuse"
			class="min-w-32 flex-1"
			onchange={() => onChange({ debounce: false, resetPage: true })}
		/>
	</div>

	<Button color="light" type="button" class="self-start" onclick={clearFilters}>Clear</Button>
</div>
