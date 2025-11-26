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
	const CHAR_SIZES = '(max-width: 640px) 35vw, 192px';
</script>

<div class="flex h-full min-h-0 flex-col items-center gap-1">
	<div
		class={[
			'flex min-h-0 w-full flex-1 items-center justify-center gap-2 pt-2',
			direction === 'right' ? 'flex-row-reverse' : 'flex-row'
		]}
	>
		{#each chars as c (c)}
			<div class="flex h-full w-auto basis-1/4 overflow-hidden rounded-lg">
				<enhanced:img
					src={charSrc(c)}
					alt={c}
					title={c}
					class="h-full w-full object-contain"
					loading="lazy"
					decoding="async"
					sizes={CHAR_SIZES}
				/>
			</div>
		{/each}
	</div>

	<div class="flex w-full flex-none flex-col items-center justify-center gap-0.5 pb-1.5">
		<span class="inline-flex items-center justify-center rounded border px-1.5 py-0.5 text-sm leading-none">
			{side.team.fuse}
		</span>
		<span class="text-muted-foreground truncate text-center text-sm" title={playersInline(side)}>
			{playersInline(side)}
		</span>
	</div>
</div>
