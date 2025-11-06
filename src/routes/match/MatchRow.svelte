<!-- src/lib/components/MatchRow.svelte -->
<script lang="ts">
	import type { CombinedMatchInfo } from '$lib/server/match';

	type Side = CombinedMatchInfo['leftSide'];
	type Team = Side['team'];
	type VideoSource = CombinedMatchInfo['video'];

	let props = $props();

	const match: CombinedMatchInfo = props.match;

	function playersLabel(side: CombinedMatchInfo['leftSide']) {
		// Show up to 2 players, including role if you like
		// Example: "Alice (POINT) · Bob (ASSIST)"
		return side.sidePlayers
			.map((sp) => `${sp.player.name}${sp.role ? ` (${sp.role})` : ''}`)
			.join(' · ');
	}

	function charsLabel(team: Team) {
		const swap = team.charSwapBeforeRound ? ' ↔︎' : '';
		return `${team.pointChar} + ${team.assistChar}${swap}`;
	}

	function fuseLabel(team: Team) {
		return team.fuse;
	}

	function formatSpan(start?: number, end?: number | null) {
		if (start == null) return '';
		if (!end && end !== 0) return `@${start}s`;
		const dur = Math.max(0, (end ?? start) - start);
		return `@${start}s • ${dur}s`;
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
</script>

<button
	class="group hover:bg-muted/60 grid w-full cursor-pointer grid-cols-[auto,1fr,auto,1fr,auto] items-center gap-3 rounded-2xl px-3 py-2"
	onclick={handleClick}
	aria-label={`Open match ${match.title ?? ''}`}
>
	<!-- LEFT SIDE -->
	<div class="min-w-0">
		<div class="flex flex-wrap items-center gap-1 text-sm font-medium">
			<span class="rounded-full border px-2 py-0.5 text-xs">{charsLabel(match.leftSide.team)}</span>
			<span class="rounded-full border px-2 py-0.5 text-xs"
				>Fuse: {fuseLabel(match.leftSide.team)}</span
			>
		</div>
		<div class="text-muted-foreground truncate text-sm">
			{playersLabel(match.leftSide)}
		</div>
	</div>

	<!-- VS -->
	<div class="mx-2 text-center text-sm font-semibold opacity-70 select-none">vs</div>

	<!-- RIGHT SIDE -->
	<div class="min-w-0 text-right">
		<div class="flex flex-wrap items-center justify-end gap-1 text-sm font-medium">
			<span class="rounded-full border px-2 py-0.5 text-xs"
				>Fuse: {fuseLabel(match.rightSide.team)}</span
			>
			<span class="rounded-full border px-2 py-0.5 text-xs">{charsLabel(match.rightSide.team)}</span
			>
		</div>
		<div class="text-muted-foreground truncate text-sm">
			{playersLabel(match.rightSide)}
		</div>
	</div>

	<!-- META -->
	<div class="hidden flex-col items-end gap-0.5 pl-2 text-right md:flex">
		{#if match.title}
			<div class="max-w-[22ch] truncate text-sm">{match.title}</div>
		{/if}
		<div class="text-muted-foreground flex items-center gap-2 text-xs">
			{#if match.video?.platform}
				<span class="tracking-wide uppercase">{match.video.platform}</span>
			{/if}
			<span>{formatSpan(match.startSec, match.endSec)}</span>
		</div>
	</div>
</button>

<!-- <style>
	/* optional: make the whole row feel clicky without underlines */
	a {
		text-decoration: none;
	}
</style> -->
