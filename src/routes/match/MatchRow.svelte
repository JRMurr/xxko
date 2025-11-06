<!-- src/lib/components/MatchRow.svelte -->
<script lang="ts">
	import type { CombinedMatchInfo } from '$lib/server/match';
	import { charImages } from '$lib/assets/charImages';

	type MatchSide = CombinedMatchInfo['leftSide'];
	type Team = MatchSide['team'];
	type VideoSource = CombinedMatchInfo['video'];

	let props = $props();

	const match: CombinedMatchInfo = props.match;

	function playersInline(side: MatchSide) {
		return side.sidePlayers
			.map((sp) => (sp.role ? `${sp.player.name} (${sp.role})` : sp.player.name))
			.join(', ');
	}

	function formatSpan(start?: number, end?: number | null) {
		if (start == null) return '';
		if (!end && end !== 0) return `@${start}s`;
		const dur = Math.max(0, (end ?? start) - start);
		return `@${start}s • ${dur}s`;
	}
	function fuseLabel(team: Team) {
		return team.fuse;
	}

	function videoJumpUrl(v: VideoSource, start: number) {
		// quick-and-dirty: supports typical yt & generic links
		// YouTube handles `t=` in query; for other links we just append `#t=`
		try {
			const u = new URL(v.url);
			if (u.hostname.includes('youtube.com') || u.hostname === 'youtu.be') {
				// preserve existing params
				if (!u.searchParams.has('t')) u.searchParams.set('t', `${start}s`);
				return u.toString();
			}
			// fallback
			return `${v.url}#t=${start}s`;
		} catch {
			return v.url;
		}
	}

	function handleClick(event: MouseEvent) {
		event.preventDefault();
		window.open(videoJumpUrl(match.video, match.startSec), '_blank');
		return;
	}

	const charSrc = (name: keyof typeof charImages) => charImages[name];
</script>

<button
	type="button"
	class="group hover:bg-muted/60 focus:ring-ring flex w-full items-center gap-3 rounded-xl px-3 py-2 focus:ring-2 focus:outline-none"
	onclick={handleClick}
	aria-label={`Open match ${match.title ?? ''}`}
>
	<!-- LEFT: chars + fuse + players -->
	<div class="flex min-w-0 items-center gap-2">
		<div class="flex shrink-0 items-center gap-1">
			<img
				src={charSrc(match.leftSide.team.pointChar)}
				alt={match.leftSide.team.pointChar}
				title={match.leftSide.team.pointChar}
				class="h-5 w-5 rounded object-contain"
				loading="lazy"
			/>
			<img
				src={charSrc(match.leftSide.team.assistChar)}
				alt={match.leftSide.team.assistChar}
				title={match.leftSide.team.assistChar}
				class="h-5 w-5 rounded object-contain"
				loading="lazy"
			/>
			{#if match.leftSide.team.charSwapBeforeRound}
				<span class="text-[10px] opacity-70" title="Swapped before round">↔︎</span>
			{/if}
			<span class="inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] leading-none">
				{match.leftSide.team.fuse}
			</span>
		</div>

		<span class="text-muted-foreground truncate text-sm" title={playersInline(match.leftSide)}>
			{playersInline(match.leftSide)}
		</span>
	</div>

	<!-- VS -->
	<span class="mx-1 shrink-0 text-xs font-semibold opacity-70">vs</span>

	<!-- RIGHT: players + fuse + chars (mirrored) -->
	<div class="ml-auto flex min-w-0 items-center gap-2">
		<span
			class="text-muted-foreground truncate text-right text-sm"
			title={playersInline(match.rightSide)}
		>
			{playersInline(match.rightSide)}
		</span>

		<div class="flex shrink-0 items-center gap-1">
			<span class="inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] leading-none">
				{match.rightSide.team.fuse}
			</span>
			{#if match.rightSide.team.charSwapBeforeRound}
				<span class="text-[10px] opacity-70" title="Swapped before round">↔︎</span>
			{/if}
			<img
				src={charSrc(match.rightSide.team.assistChar)}
				alt={match.rightSide.team.assistChar}
				title={match.rightSide.team.assistChar}
				class="h-5 w-5 rounded object-contain"
				loading="lazy"
			/>
			<img
				src={charSrc(match.rightSide.team.pointChar)}
				alt={match.rightSide.team.pointChar}
				title={match.rightSide.team.pointChar}
				class="h-5 w-5 rounded object-contain"
				loading="lazy"
			/>
		</div>
	</div>

	<!-- META (right edge, small screens hide most) -->
	<div class="text-muted-foreground hidden items-center gap-2 pl-2 text-xs md:flex">
		{#if match.title}
			<span class="text-foreground/90 hidden max-w-[28ch] truncate align-middle text-sm lg:inline"
				>{match.title}</span
			>
		{/if}
		<span class="tracking-wide uppercase">{match.video.platform}</span>
		<span>{formatSpan(match.startSec, match.endSec)}</span>
	</div>
</button>

<!-- <style>
	/* optional: make the whole row feel clicky without underlines */
	a {
		text-decoration: none;
	}
</style> -->
