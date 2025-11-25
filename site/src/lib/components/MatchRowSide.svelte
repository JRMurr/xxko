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

		return s.sidePlayers.map((sp) => sp.player.name).join('/');
	}

	const chars = [side.team.assistChar, side.team.pointChar];
</script>

<div class="flex h-full flex-col items-center gap-1">
	<div
		class={[
			'flex h-3/4 w-full place-content-center items-center gap-2 pt-2',
			direction === 'right' ? 'flex-row-reverse' : 'flex-row'
		]}
	>
		{#each chars as c (c)}
			<div class="flex h-[80%] w-auto basis-1/4 rounded-lg object-contain">
				<enhanced:img src={charSrc(c)} alt={c} title={c} loading="lazy" />
			</div>
		{/each}
		<!-- {#if side.team.charSwapBeforeRound}
			<span class="text-[10px] opacity-70" title="Swapped before round">↔︎</span>
		{/if} -->
	</div>
	<div
		class={[
			'flex h-full w-full place-content-center items-center justify-center gap-2 pb-1.5',
			direction === 'right' ? 'flex-row-reverse' : 'flex-row'
		]}
	>
		<span
			class="text-muted-foreground flex h-full truncate text-center align-middle text-sm"
			title={playersInline(side)}
		>
			{playersInline(side)}
		</span>
		<span
			class="flex h-full items-center justify-center rounded border px-1.5 py-0.5 text-sm leading-none"
		>
			{side.team.fuse}
		</span>
	</div>
</div>
