<script lang="ts">
	import { type MatchFilter } from '$lib/schemas';
	import { Search, MultiSelect, Button, type SelectOptionType } from 'flowbite-svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { CHARACTERS, FUSE } from '$lib/constants';

	type Filter = Omit<MatchFilter, 'limit' | 'character' | 'fuse'> & {
		character: NonNullable<MatchFilter['character']>;
		fuse: NonNullable<MatchFilter['fuse']>;
	};

	const makeOptionItemArr = <T extends string>(arr: readonly T[]): SelectOptionType<T>[] => {
		return arr.map((x) => {
			return {
				name: x,
				value: x
			};
		});
	};

	const defaultFilters: Filter = {
		character: [],
		fuse: []
	};

	let filters: Filter = $state(defaultFilters);

	const clearFilters = () => {
		filters = defaultFilters;
		onChange();
	};

	const onChange = () => {
		const searchParams = new URLSearchParams();

		(Object.keys(filters) as unknown as (keyof Filter)[]).forEach((k) => {
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

		goto(url, { replaceState: true });
	};

	$inspect(filters);
</script>

<div class="mb-4 flex flex-col gap-3 md:flex-row md:items-end">
	<!-- <div class="flex-1">
		<Search
			size="md"
			bind:value={q}
			clearable
			on:input={onQueryInput}
			placeholder="Search matches..."
		/>
	</div> -->

	<div class="flex gap-3">
		<MultiSelect
			bind:value={filters.character}
			items={makeOptionItemArr(CHARACTERS)}
			class="min-w-32"
			onchange={onChange}
		></MultiSelect>

		<MultiSelect
			bind:value={filters.fuse}
			items={makeOptionItemArr(FUSE)}
			class="min-w-32"
			onchange={onChange}
		></MultiSelect>

		<Button color="light" type="button" onclick={clearFilters}>Clear</Button>
	</div>
</div>
