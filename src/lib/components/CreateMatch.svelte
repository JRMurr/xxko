<script lang="ts">
	import type { SuperValidated, Infer, FormOptions } from 'sveltekit-superforms';
	import { superForm } from 'sveltekit-superforms';
	import {
		Field,
		Control,
		// TODO: might need to wrap formsnap label with flowbite label
		// right now all uses of label used to be this
		// Label as ControlLabel,
		FieldErrors,
		Fieldset,
		Legend
	} from 'formsnap';
	import { zod4Client } from 'sveltekit-superforms/adapters'; // <-- client adapter
	import { matchSchema } from '$lib/schemas';
	import { CHARACTERS, FUSE, MATCH_SIDE } from '$lib/constants';
	import Input from 'flowbite-svelte/Input.svelte';
	import Label from 'flowbite-svelte/Label.svelte';
	import Select from 'flowbite-svelte/Select.svelte';

	let {
		data,
		onResult = () => {}
	}: {
		data: SuperValidated<Infer<typeof matchSchema>>;
		onResult?: FormOptions['onResult'];
	} = $props();

	const form = superForm(data, {
		validators: zod4Client(matchSchema),
		dataType: 'json',
		onResult
	});

	const { form: formData, enhance, message } = form;

	const sideLabel = (s: (typeof MATCH_SIDE)[number]) => (s === 'left' ? 'Left Side' : 'Right Side');
</script>

<form use:enhance class="mx-auto flex max-w-3xl flex-col gap-6" method="POST" action="/match/new">
	{#if $message}
		<div class="message">{$message}</div>
	{/if}

	<Field {form} name="video">
		<Control>
			{#snippet children({ props })}
				<Label>YouTube URL</Label>
				<Input {...props} placeholder="https://youtu.be/..." bind:value={$formData.video} />
			{/snippet}
		</Control>
		<!-- <Description>We'll extract the ID; shorts/embed links are fine.</Description> -->
		<FieldErrors />
	</Field>

	{#each MATCH_SIDE as side (side)}
		<Fieldset {form} name={side}>
			<Legend>{sideLabel(side)}</Legend>

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

			<Fieldset {form} name={`${side}.team`}>
				<Legend>{sideLabel(side)} Team</Legend>

				<Field {form} name={`${side}.team.pointChar`}>
					<Control>
						{#snippet children({ props })}
							<Label>Point Char</Label>
							<Select {...props} bind:value={$formData[side].team.pointChar}>
								{#each CHARACTERS as c (c)}<option value={c}>{c}</option>{/each}
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
								{#each CHARACTERS as c (c)}<option value={c}>{c}</option>{/each}
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
								{#each FUSE as f (f)}<option value={f}>{f}</option>{/each}
							</Select>
						{/snippet}
					</Control>
					<FieldErrors />
				</Field>

				<!-- <Field {form} name={`${side}.team.charSwapBeforeRound`}>
					<Control>
						{#snippet children({ props })}
							<input
								{...props}
								type="checkbox"
								bind:checked={$formData[side].team.charSwapBeforeRound}
							/>
							<Label
								>If there was a tag before round swap after the first round. (Only really matters if
								using Juggernaut/Side Kick)</Label
							>
						{/snippet}
					</Control>
					<FieldErrors />
				</Field> -->
			</Fieldset>
		</Fieldset>
	{/each}

	<button class="rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700"
		>Submit</button
	>
</form>
