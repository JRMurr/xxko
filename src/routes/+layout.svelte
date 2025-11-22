<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	// TODO: use https://mode-watcher.sveco.dev/docs/components/mode-watcher instead
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import CreateMatchModal from '$lib/components/CreateMatchModal.svelte';

	import Footer from 'flowbite-svelte/Footer.svelte';
	import Navbar from 'flowbite-svelte/Navbar.svelte';

	import GithubSolid from 'flowbite-svelte-icons/GithubSolid.svelte';
	import TwitterSolid from 'flowbite-svelte-icons/TwitterSolid.svelte';

	import FooterIcon from 'flowbite-svelte/FooterIcon.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<!-- {@render children?.()} -->

<div class="min-h-dvh bg-white text-gray-900 dark:bg-gray-900 dark:text-neutral-100">
	<!-- class="flex items-center justify-between gap-4 border-b border-neutral-200 p-4 dark:border-gray-800" -->
	<Navbar class="sticky start-0 top-0 z-20 w-full bg-white px-2 py-2.5 sm:px-4 dark:bg-gray-800">
		<CreateMatchModal></CreateMatchModal>

		<ThemeToggle />
	</Navbar>

	<div>
		{@render children?.()}
	</div>

	<Footer
		footerType="socialmedia"
		class="fixed start-0 bottom-0 w-full bg-white px-2 py-2.5 sm:px-4 dark:bg-gray-800"
	>
		<div class="mt-4 flex space-x-6 sm:mt-0 sm:justify-center rtl:space-x-reverse">
			<FooterIcon href="https://x.com/JRMurrCodes">
				<TwitterSolid
					class="h-5 w-5 text-gray-500 hover:text-gray-900 dark:text-gray-500 dark:hover:text-white"
				/>
			</FooterIcon>
			<FooterIcon href="https://github.com/JRMurr/xxko">
				<GithubSolid
					class="h-5 w-5 text-gray-500 hover:text-gray-900 dark:text-gray-500 dark:hover:text-white"
				/>
			</FooterIcon>
		</div>
	</Footer>
</div>
