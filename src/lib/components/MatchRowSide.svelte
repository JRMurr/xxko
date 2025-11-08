<script lang="ts">
	import type { CombinedMatchInfo } from '$lib/server/match';
	import { charImages } from '$lib/assets/charImages';

	type MatchSide = CombinedMatchInfo['leftSide'];
	type Direction = 'left' | 'right';

	const props: { side: MatchSide; direction?: Direction } = $props();
	const side = props.side;
	const direction: Direction = props.direction ?? 'left';

	const charSrc = (name: keyof typeof charImages) => charImages[name];

	function playersInline(s: MatchSide) {
		if (s.sidePlayers.length === 1) {
			return s.sidePlayers[0].player.name;
		}

		return s.sidePlayers.map((sp) => `${sp.player.name} (${sp.role})`).join(', ');
	}

	// image order mirrors automatically
	const chars =
		direction === 'left'
			? [side.team.assistChar, side.team.pointChar]
			: [side.team.pointChar, side.team.assistChar];
</script>

{#snippet playerName()}
	<span class="text-muted-foreground truncate text-right text-sm" title={playersInline(side)}>
		{playersInline(side)}
	</span>
{/snippet}

{#snippet fuse()}
	<span class="inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] leading-none">
		{side.team.fuse}
	</span>
{/snippet}

{#snippet charSwap()}
	{#if side.team.charSwapBeforeRound}
		<span class="text-[10px] opacity-70" title="Swapped before round">↔︎</span>
	{/if}
{/snippet}

<div class="flex h-full place-content-center items-center gap-2">
	<!-- <div class="flex h-full items-center gap-1"> -->
	<div>
		{#if direction === 'right'}
			{@render playerName()}
			{@render fuse()}
			{@render charSwap()}
		{/if}
	</div>

	{#each chars as c}
		<img
			src={charSrc(c)}
			alt={c}
			title={c}
			class="h-[70%] w-auto rounded-lg object-contain"
			loading="lazy"
		/>
	{/each}

	<div>
		{#if direction === 'left'}
			{@render charSwap()}
			{@render fuse()}
			{@render playerName()}
		{/if}
	</div>
</div>
