<script lang="ts">
	import { matchFilterSchema, type MatchFilter } from '$lib/schemas';
	import { Search, MultiSelect, Button, type SelectOptionType } from 'flowbite-svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { CHARACTERS, FUSE } from '$lib/constants';
	import { searchParamsToValues } from '$lib/utils';

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

	let filters: MatchFilter = $state(startFilter);

	const clearFilters = () => {
		filters = emptyFilter;
		onChange({ debounce: false });
	};

	let debounceHandle: NodeJS.Timeout | undefined;

	const DEBOUNCE_MS = 500;

	const onChange = ({ debounce }: { debounce: boolean }) => {
		const update = () => {
			const searchParams = new URLSearchParams();

			(Object.keys(filters) as unknown as (keyof MatchFilter)[]).forEach((k) => {
				if (k === 'limit') {
					return;
				}
				const val = filters[k];
				if (val) {
					if (val instanceof Array) {
						val.forEach((v) => {
							searchParams.append(k, v);
						});
					} else {
						searchParams.append(k, val);
					}
				}
			});

			const url = `?${searchParams.toString()}`;

			goto(url, { replaceState: true, keepFocus: true });
		};

		clearTimeout(debounceHandle);

		if (debounce) {
			debounceHandle = setTimeout(update, DEBOUNCE_MS);
		} else {
			update();
		}
	};
</script>

<div class="mb-4 flex flex-col gap-3 md:flex-row md:items-end">
	<Search
		size="md"
		bind:value={filters.player}
		clearable
		oninput={() => onChange({ debounce: true })}
		placeholder="Player Name"
	/>

	<div class="flex gap-3">
		<MultiSelect
			bind:value={filters.character}
			items={makeOptionItemArr(CHARACTERS)}
			class="min-w-32"
			onchange={() => onChange({ debounce: false })}
		></MultiSelect>

		<MultiSelect
			bind:value={filters.fuse}
			items={makeOptionItemArr(FUSE)}
			class="min-w-32"
			onchange={() => onChange({ debounce: false })}
		></MultiSelect>

		<Button color="light" type="button" onclick={clearFilters}>Clear</Button>
	</div>
</div>
