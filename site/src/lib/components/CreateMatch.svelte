<script lang="ts">
	import type { SuperValidated, Infer, FormOptions } from 'sveltekit-superforms';
	import { superForm } from 'sveltekit-superforms';
	import { Field, Control, FieldErrors, Fieldset, Legend } from 'formsnap';
	import { zod4Client } from 'sveltekit-superforms/adapters';
	import { matchSchema } from '$lib/schemas';
	import { CHARACTERS, FUSE, MATCH_SIDE } from '$lib/constants';
	import Input from 'flowbite-svelte/Input.svelte';
	import Label from 'flowbite-svelte/Label.svelte';
	import Select from 'flowbite-svelte/Select.svelte';

	let {
		data,
		onResult = () => {},
		action,
		submitLabel
	}: {
		data: SuperValidated<Infer<typeof matchSchema>>;
		onResult?: FormOptions['onResult'];
		action: string;
		submitLabel: string;
	} = $props();

	const form = superForm(data, {
		validators: zod4Client(matchSchema),
		dataType: 'json',
		onResult,
		onError({ result }) {
			$message = result.error.message || 'Unknown error';
		}
	});

	const { form: formData, enhance, message } = form;

	const sideLabel = (s: (typeof MATCH_SIDE)[number]) => (s === 'left' ? 'Left Side' : 'Right Side');
</script>

<form use:enhance method="POST" {action} class="mx-auto flex max-w-5xl flex-col gap-6">
	{#if $message}
		<div class="rounded border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700">
			{$message}
		</div>
	{/if}

	<Field {form} name="video">
		<Control>
			{#snippet children({ props })}
				<Label>YouTube URL</Label>
				<Input {...props} placeholder="https://youtu.be/..." bind:value={$formData.video} />
			{/snippet}
		</Control>
		<FieldErrors />
	</Field>

	<!-- Left / Right side-by-side on md+ -->
	<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
		{#each MATCH_SIDE as side (side)}
			<Fieldset {form} name={side} class="space-y-4 rounded-md border border-gray-200 p-4 dark:border-gray-700">
				<Legend class="text-base font-semibold">{sideLabel(side)}</Legend>

				<Field {form} name={`${side}.pointPlayerName`}>
					<Control>
						{#snippet children({ props })}
							<Label>Point Player</Label>
							<Input {...props} bind:value={$formData[side].pointPlayerName} />
						{/snippet}
					</Control>
					<FieldErrors />
				</Field>

				<Field {form} name={`${side}.assistPlayerName`}>
					<Control>
						{#snippet children({ props })}
							<Label>Assist Player (optional)</Label>
							<Input {...props} bind:value={$formData[side].assistPlayerName} />
						{/snippet}
					</Control>
					<FieldErrors />
				</Field>

				<Fieldset
					{form}
					name={`${side}.team`}
					class="space-y-3 rounded-md border border-gray-100 p-3 dark:border-gray-800"
				>
					<Legend class="text-sm font-medium">{sideLabel(side)} Team</Legend>

					<Field {form} name={`${side}.team.pointChar`}>
						<Control>
							{#snippet children({ props })}
								<Label>Point Char</Label>
								<Select {...props} bind:value={$formData[side].team.pointChar}>
									{#each CHARACTERS as c (c)}
										<option value={c}>{c}</option>
									{/each}
								</Select>
							{/snippet}
						</Control>
						<FieldErrors />
					</Field>

					<Field {form} name={`${side}.team.assistChar`}>
						<Control>
							{#snippet children({ props })}
								<Label>Assist Char</Label>
								<Select {...props} bind:value={$formData[side].team.assistChar}>
									{#each CHARACTERS as c (c)}
										<option value={c}>{c}</option>
									{/each}
								</Select>
							{/snippet}
						</Control>
						<FieldErrors />
					</Field>

					<Field {form} name={`${side}.team.fuse`}>
						<Control>
							{#snippet children({ props })}
								<Label>Fuse</Label>
								<Select {...props} bind:value={$formData[side].team.fuse}>
									{#each FUSE as f (f)}
										<option value={f}>{f}</option>
									{/each}
								</Select>
							{/snippet}
						</Control>
						<FieldErrors />
					</Field>
				</Fieldset>
			</Fieldset>
		{/each}
	</div>

	<button class="rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700">
		{submitLabel}
	</button>
</form>
