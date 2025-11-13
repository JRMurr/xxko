<script lang="ts">
	// Svelte 5 runes
	type Mode = 'light' | 'dark' | 'system';

	let open = $state(false);
	let mode = $state<Mode>('system');
	let systemDark = $state(false);
	let effectiveDark = $derived(mode === 'system' ? systemDark : mode === 'dark');

	let btnEl: HTMLButtonElement | null = null;
	// svelte-ignore non_reactive_update
	let menuEl: HTMLDivElement | null = null;
	let mq: MediaQueryList | null = null;

	function readSystem() {
		mq = window.matchMedia('(prefers-color-scheme: dark)');
		systemDark = mq.matches;
		const onChange = (e: MediaQueryListEvent) => (systemDark = e.matches);
		mq.addEventListener?.('change', onChange);
	}

	function apply(next: Mode) {
		mode = next;
		localStorage.setItem('theme', next);
		const dark =
			next === 'system'
				? window.matchMedia('(prefers-color-scheme: dark)').matches
				: next === 'dark';
		document.documentElement.classList.toggle('dark', dark);
	}

	// init from storage + system after mount
	$effect(() => {
		queueMicrotask(() => {
			const saved = (localStorage.getItem('theme') as Mode | null) ?? 'system';
			mode = saved;
			readSystem();
			apply(mode);
		});
	});

	function toggleMenu() {
		open = !open;
		if (open) queueMicrotask(() => menuEl?.focus());
	}

	function choose(next: Mode) {
		apply(next);
		open = false;
		btnEl?.focus();
	}

	// close on outside click
	function onDocPointer(e: PointerEvent) {
		if (!open) return;
		const t = e.target as Node;
		if (btnEl?.contains(t) || menuEl?.contains(t)) return;
		open = false;
	}
	// close on Escape when menu focused
	function onMenuKey(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			open = false;
			btnEl?.focus();
		}
	}

	// attach global listener
	$effect(() => {
		document.addEventListener('pointerdown', onDocPointer);
		return () => document.removeEventListener('pointerdown', onDocPointer);
	});
</script>

<div class="relative inline-block text-sm">
	<!-- Display button: click to toggle dropdown -->
	<button
		bind:this={btnEl}
		type="button"
		onclick={toggleMenu}
		aria-haspopup="menu"
		aria-expanded={open}
		class="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-neutral-100
           px-3 py-1.5 transition select-none
           hover:bg-neutral-200 dark:border-gray-700 dark:bg-neutral-800 dark:hover:bg-neutral-700"
	>
		<span>{effectiveDark ? '🌙 Dark' : '☀️ Light'}{mode === 'system' ? ' (system)' : ''}</span>
		<svg viewBox="0 0 20 20" class="h-4 w-4" aria-hidden="true"
			><path d="M5 7l5 5 5-5" fill="currentColor" /></svg
		>
	</button>

	{#if open}
		<!-- Dropdown menu -->
		<div
			bind:this={menuEl}
			role="menu"
			tabindex="-1"
			onkeydown={onMenuKey}
			class="absolute right-0 z-50 mt-2 w-40 overflow-hidden rounded-lg border
             border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-neutral-800"
		>
			<button
				role="menuitem"
				class="w-full px-3 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-700"
				onclick={() => choose('system')}
			>
				System {mode === 'system' ? '✓' : ''}
			</button>
			<button
				role="menuitem"
				class="w-full px-3 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-700"
				onclick={() => choose('light')}
			>
				Light {mode === 'light' ? '✓' : ''}
			</button>
			<button
				role="menuitem"
				class="w-full px-3 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-700"
				onclick={() => choose('dark')}
			>
				Dark {mode === 'dark' ? '✓' : ''}
			</button>
		</div>
	{/if}
</div>
