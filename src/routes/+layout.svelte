<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	// TODO: use https://mode-watcher.sveco.dev/docs/components/mode-watcher instead
	import ThemeToggle from '$lib/ThemeToggle.svelte';
	import CreateMatchModal from '$lib/components/CreateMatchModal.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<!-- {@render children?.()} -->

<div class="min-h-dvh bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
	<header
		class="flex items-center justify-between gap-4 border-b border-neutral-200 p-4 dark:border-neutral-800"
	>
		<h1 class="text-base font-semibold">xxko</h1>
		<CreateMatchModal></CreateMatchModal>

		<ThemeToggle />
	</header>

	<main class="p-4">
		{@render children?.()}
	</main>
</div>
