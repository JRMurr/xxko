<!-- src/lib/components/MatchRow.svelte -->
<script lang="ts">
	import type { CombinedMatchInfo } from '$lib/server/match';
	import MatchSideBlock from '$lib/components/MatchRowSide.svelte';

	let props = $props<{ match: CombinedMatchInfo }>();
	const match = props.match;

	function formatSpan(start?: number, end?: number | null) {
		if (start == null) return '';
		if (!end && end !== 0) return `@${start}s`;
		const dur = Math.max(0, (end ?? start) - start);
		return `@${start}s • ${dur}s`;
	}
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
	class="group hover:bg-muted/60 focus:ring-ring border-border/60 flex h-16 w-full items-center gap-4 rounded-2xl border px-5 py-0 text-base shadow-sm focus:ring-2 focus:outline-none"
	onclick={handleClick}
	aria-label={`Open match ${match.title ?? ''}`}
>
	<div class="h-full min-w-0 flex-1 basis-0">
		<MatchSideBlock side={match.leftSide} direction="left" />
	</div>

	<span class="shrink-0 px-3 text-center text-xs font-semibold opacity-70">vs</span>

	<div class="h-full min-w-0 flex-1 basis-0">
		<MatchSideBlock side={match.rightSide} direction="right" />
	</div>
	<!-- META -->
	<div class="text-muted-foreground hidden items-center gap-2 pl-2 text-xs md:flex">
		{#if match.title}
			<span class="text-foreground/90 hidden max-w-[28ch] truncate align-middle text-sm lg:inline">
				{match.title}
			</span>
		{/if}
		<span class="tracking-wide uppercase">{match.video.platform}</span>
		<span>{formatSpan(match.startSec, match.endSec)}</span>
	</div>
</button>
