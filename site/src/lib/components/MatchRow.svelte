<!-- src/lib/components/MatchRow.svelte -->
<script lang="ts">
	import type { CombinedMatchInfo } from '$lib/server/match';
	import MatchSideBlock from '$lib/components/MatchRowSide.svelte';
	import Card from 'flowbite-svelte/Card.svelte';
	import EditSolid from 'flowbite-svelte-icons/EditSolid.svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';

	let props: { match: CombinedMatchInfo } = $props();
	const match = props.match;

	function videoJumpUrl(v: CombinedMatchInfo['video'], start: number) {
		try {
			const u = new URL(v.url);
			if (u.hostname.includes('youtube.com') || u.hostname === 'youtu.be') {
				if (!u.searchParams.has('t')) u.searchParams.set('t', `${start}s`);
				return u.toString();
			}
			return `${v.url}#t=${start}s`;
		} catch {
			return v.url;
		}
	}

	function handleClick(e: MouseEvent) {
		e.preventDefault();
		window.open(videoJumpUrl(match.video, match.startSec), '_blank');
	}

	function handleEditClick(e: MouseEvent) {
		e.stopPropagation();
		e.preventDefault();

		const current = page.url.pathname + page.url.search;
		const redirectTo = encodeURIComponent(current);

		// eslint-disable-next-line @typescript-eslint/no-floating-promises
		goto(resolve(`/match/update/${match.id}?redirectTo=${redirectTo}`));
	}
</script>

<Card onclick={handleClick} horizontal size="lg" aria-label={`Open match ${match.title ?? ''}`}>
	<div class="relative flex w-full flex-col">
		<button
			type="button"
			class="absolute right-2 top-2 inline-flex items-center rounded-full p-1.5 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
			aria-label="Edit match"
			onclick={handleEditClick}
		>
			<EditSolid class="h-4 w-4" />
		</button>

		<div class="flex h-32 w-full flex-row justify-items-center gap-3">
			<div class="basis-5/10 h-full flex-auto">
				<MatchSideBlock side={match.leftSide} direction="left" />
			</div>

			<span class="shrink-0 self-center px-3 font-semibold">vs</span>

			<div class="w-5/10 basis-5/10 h-full flex-auto">
				<MatchSideBlock side={match.rightSide} direction="right" />
			</div>
		</div>

		{#if match.patch}
			<span class="absolute bottom-2 left-2 text-xs text-gray-500 dark:text-gray-400">{match.patch}</span>
		{/if}
	</div>
</Card>
