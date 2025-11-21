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

	const chars = [side.team.assistChar, side.team.pointChar];
</script>

<div class="flex h-full flex-col items-center gap-1">
	<div
		class={[
			'flex h-1/2 w-full place-content-center items-center gap-2 pt-2',
			direction === 'right' ? 'flex-row-reverse' : 'flex-row'
		]}
	>
		{#each chars as c (c)}
			<img
				src={charSrc(c)}
				alt={c}
				title={c}
				class="flex h-[95%] w-auto basis-1/4 rounded-lg object-contain"
				loading="lazy"
			/>
		{/each}
		<!-- {#if side.team.charSwapBeforeRound}
			<span class="text-[10px] opacity-70" title="Swapped before round">↔︎</span>
		{/if} -->
	</div>
	<span
		class="inline-flex min-w-[50%] items-center justify-center rounded border px-1.5 py-0.5 text-[11px] leading-none"
	>
		{side.team.fuse}
	</span>
	<span
		class="text-muted-foreground flex w-full justify-center truncate text-sm"
		title={playersInline(side)}
	>
		{playersInline(side)}
	</span>
</div>
