<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import ThemeToggle from '$lib/ThemeToggle.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<!-- {@render children?.()} -->


<div class="min-h-dvh bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
  <header class="flex items-center justify-between gap-4 p-4 border-b border-neutral-200 dark:border-neutral-800">
    <h1 class="text-base font-semibold">My App</h1>
    <ThemeToggle />
  </header>

  <main class="p-4">
    {@render children?.()}
  </main>
</div>