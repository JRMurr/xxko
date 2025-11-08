<script lang="ts">
	import type { CombinedMatchInfo } from '$lib/server/match';
	import { charImages } from '$lib/assets/charImages';

	type MatchSide = CombinedMatchInfo['leftSide'];
	type Direction = 'left' | 'right';

	const props = $props<{ side: MatchSide; direction?: Direction }>();
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

<div class="flex h-full min-w-0 items-center gap-2 {direction === 'right' ? 'ml-auto' : ''}">
	{#if direction === 'right'}
		<span class="text-muted-foreground truncate text-right text-sm" title={playersInline(side)}>
			{playersInline(side)}
		</span>
	{/if}

	<div class="flex h-full shrink-0 items-center gap-1">
		{#if direction === 'right'}
			<span class="inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] leading-none">
				{side.team.fuse}
			</span>
			{#if side.team.charSwapBeforeRound}
				<span class="text-[10px] opacity-70" title="Swapped before round">↔︎</span>
			{/if}
		{/if}

		{#each chars as c}
			<img
				src={charSrc(c)}
				alt={c}
				title={c}
				class="h-[70%] w-auto rounded-lg object-contain"
				loading="lazy"
			/>
		{/each}

		{#if direction === 'left'}
			{#if side.team.charSwapBeforeRound}
				<span class="text-[10px] opacity-70" title="Swapped before round">↔︎</span>
			{/if}
			<span class="inline-flex items-center rounded-md border px-2 py-0.5 text-sm leading-none">
				{side.team.fuse}
			</span>
		{/if}
	</div>

	{#if direction === 'left'}
		<span class="text-muted-foreground truncate text-base font-medium" title={playersInline(side)}>
			{playersInline(side)}
		</span>
	{/if}
</div>
