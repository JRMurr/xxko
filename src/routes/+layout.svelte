<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	// TODO: use https://mode-watcher.sveco.dev/docs/components/mode-watcher instead
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import CreateMatchModal from '$lib/components/CreateMatchModal.svelte';

	import Footer from 'flowbite-svelte/Footer.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<!-- {@render children?.()} -->

<div class="min-h-dvh bg-white text-gray-900 dark:bg-gray-900 dark:text-neutral-100">
	<header
		class="flex items-center justify-between gap-4 border-b border-neutral-200 p-4 dark:border-gray-800"
	>
		<CreateMatchModal></CreateMatchModal>

		<ThemeToggle />
	</header>

	<div>
		{@render children?.()}
	</div>

	<Footer class="fixed bottom-0 w-full">hi</Footer>
</div>
