<script lang="ts">
	import SuperDebug, { superForm } from 'sveltekit-superforms';
	import { Field, Control, Label, Description, FieldErrors, Fieldset, Legend } from 'formsnap';
	import { zod4Client } from 'sveltekit-superforms/adapters'; // <-- client adapter
	import { matchSchema } from '$lib/schemas';
	import { CHARACTERS, FUSE } from '$lib/constants';

	let { data } = $props();

	const form = superForm(data.form, {
		validators: zod4Client(matchSchema),
		dataType: 'json'
	});
	const { form: formData, enhance, message } = form;
</script>

<h1>Create Match</h1>
<SuperDebug data={$formData} />

<form use:enhance class="mx-auto flex max-w-3xl flex-col gap-6" method="POST">
	{#if $message}
		<div class="message">{$message}</div>
	{/if}
	<!-- Video -->
	<Field {form} name="video.url">
		<Control>
			{#snippet children({ props })}
				<Label>YouTube URL</Label>
				<input {...props} placeholder="https://youtu.be/..." bind:value={$formData.video.url} />
			{/snippet}
		</Control>
		<Description>We'll extract the ID; shorts/embed links are fine.</Description>
		<FieldErrors />
	</Field>

	<!-- Left side -->
	<Fieldset {form} name="left">
		<Legend>Left Side</Legend>

		<Field {form} name="left.pointPlayerName">
			<Control>
				{#snippet children({ props })}
					<Label>Point Player</Label>
					<input {...props} bind:value={$formData.left.pointPlayerName} />
				{/snippet}
			</Control>
			<FieldErrors />
		</Field>

		<Field {form} name="left.assistPlayerName">
			<Control>
				{#snippet children({ props })}
					<Label>Assist Player (optional)</Label>
					<input {...props} bind:value={$formData.left.assistPlayerName} />
				{/snippet}
			</Control>
			<FieldErrors />
		</Field>

		<Fieldset {form} name="left.team">
			<Legend>Left Team</Legend>

			<Field {form} name="left.team.pointChar">
				<Control>
					{#snippet children({ props })}
						<Label>Point Char</Label>
						<select {...props} bind:value={$formData.left.team.pointChar}>
							{#each CHARACTERS as c}<option value={c}>{c}</option>{/each}
						</select>
					{/snippet}
				</Control>
				<FieldErrors />
			</Field>

			<Field {form} name="left.team.assistChar">
				<Control>
					{#snippet children({ props })}
						<Label>Assist Char</Label>
						<select {...props} bind:value={$formData.left.team.assistChar}>
							{#each CHARACTERS as c}<option value={c}>{c}</option>{/each}
						</select>
					{/snippet}
				</Control>
				<FieldErrors />
			</Field>

			<Field {form} name="left.team.fuse">
				<Control>
					{#snippet children({ props })}
						<Label>Fuse</Label>
						<select {...props} bind:value={$formData.left.team.fuse}>
							{#each FUSE as f}<option value={f}>{f}</option>{/each}
						</select>
					{/snippet}
				</Control>
				<FieldErrors />
			</Field>

			<Field {form} name="left.team.charSwapBeforeRound">
				<Control>
					{#snippet children({ props })}
						<input
							{...props}
							type="checkbox"
							bind:checked={$formData.left.team.charSwapBeforeRound}
						/>
						<Label>Char swap before round</Label>
					{/snippet}
				</Control>
				<FieldErrors />
			</Field>
		</Fieldset>
	</Fieldset>

	<!-- Right side -->
	<Fieldset {form} name="right">
		<Legend>Right Side</Legend>

		<Field {form} name="right.pointPlayerName">
			<Control>
				{#snippet children({ props })}
					<Label>Point Player</Label>
					<input {...props} bind:value={$formData.right.pointPlayerName} />
				{/snippet}
			</Control>
			<FieldErrors />
		</Field>

		<Field {form} name="right.assistPlayerName">
			<Control>
				{#snippet children({ props })}
					<Label>Assist Player (optional)</Label>
					<input {...props} bind:value={$formData.right.assistPlayerName} />
				{/snippet}
			</Control>
			<FieldErrors />
		</Field>

		<Fieldset {form} name="right.team">
			<Legend>Right Team</Legend>

			<Field {form} name="right.team.pointChar">
				<Control>
					{#snippet children({ props })}
						<Label>Point Char</Label>
						<select {...props} bind:value={$formData.right.team.pointChar}>
							{#each CHARACTERS as c}<option value={c}>{c}</option>{/each}
						</select>
					{/snippet}
				</Control>
				<FieldErrors />
			</Field>

			<Field {form} name="right.team.assistChar">
				<Control>
					{#snippet children({ props })}
						<Label>Assist Char</Label>
						<select {...props} bind:value={$formData.right.team.assistChar}>
							{#each CHARACTERS as c}<option value={c}>{c}</option>{/each}
						</select>
					{/snippet}
				</Control>
				<FieldErrors />
			</Field>

			<Field {form} name="right.team.fuse">
				<Control>
					{#snippet children({ props })}
						<Label>Fuse</Label>
						<select {...props} bind:value={$formData.right.team.fuse}>
							{#each FUSE as f}<option value={f}>{f}</option>{/each}
						</select>
					{/snippet}
				</Control>
				<FieldErrors />
			</Field>

			<Field {form} name="right.team.charSwapBeforeRound">
				<Control>
					{#snippet children({ props })}
						<input
							{...props}
							type="checkbox"
							bind:checked={$formData.right.team.charSwapBeforeRound}
						/>
						<Label>Char swap before round</Label>
					{/snippet}
				</Control>
				<FieldErrors />
			</Field>
		</Fieldset>
	</Fieldset>

	<button class="rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700"
		>Submit</button
	>
</form>
