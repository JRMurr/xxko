<!-- src/lib/components/MatchRow.svelte -->
<script lang="ts">
	import type { CombinedMatchInfo } from '$lib/server/match';
	import MatchSideBlock from '$lib/components/MatchRowSide.svelte';

	let props = $props<{ match: CombinedMatchInfo }>();
	const match = props.match;

	// function formatSpan(start?: number, end?: number | null) {
	// 	if (start == null) return '';
	// 	if (!end && end !== 0) return `@${start}s`;
	// 	const dur = Math.max(0, (end ?? start) - start);
	// 	return `@${start}s • ${dur}s`;
	// }
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
</script>

<button
	type="button"
	onclick={handleClick}
	aria-label={`Open match ${match.title ?? ''}`}
	class="flex w-full flex-col gap-1 rounded-2xl border px-5 py-2 text-base shadow-sm focus:ring-2 focus:outline-none"
>
	<!-- TOP ROW -->
	<div class="flex h-16 w-full flex-row justify-items-center gap-3">
		<div class="h-full flex-auto basis-5/10">
			<MatchSideBlock side={match.leftSide} direction="left" />
		</div>

		<span class=" shrink-0 self-center px-3 font-semibold">vs</span>

		<div class="h-full w-5/10 flex-auto basis-5/10">
			<MatchSideBlock side={match.rightSide} direction="right" />
		</div>
	</div>

	<!-- META ROW -->
	<!-- <div class="text-muted-foreground mt-1 flex w-full gap-3 text-xs md:text-sm">
		{#if match.title}
			<span class="text-foreground/90 hidden truncate align-middle md:inline">
				{match.title}
			</span>
		{/if}
		<span class="tracking-wide uppercase">{match.video.platform}</span>
		<span>{formatSpan(match.startSec, match.endSec)}</span>
	</div> -->
</button>
