<script lang="ts">
import type { DriveItem } from '@microsoft/microsoft-graph-types'
import type { CreateQueryResult } from '@tanstack/svelte-query'
import { Ban, LoaderCircle } from 'lucide-svelte'
import { getContext } from 'svelte'
import type { OneDrivePlugin } from '../onedrive-plugin'
import { humanFileSize } from '../file-info-utils'
import FileMenu from './file-menu.svelte'

type Props = {
	fileId: string
	title: string
	fileInfo: CreateQueryResult<DriveItem>
}

const plugin = getContext<OneDrivePlugin>('plugin')

const { fileId, title, fileInfo }: Props = $props()
let showPreview = $state(plugin.settings.showPreview)

plugin.subscribe((value) => {
	showPreview = value.showPreview
})
</script>

<div class="one-drive">
	<div class="header">
		{#if $fileInfo.isSuccess}
			<FileMenu fileInfo={$fileInfo.data} />
		{:else if ($fileInfo.isLoading || !fileId)}
			<div class="loader-spinner file-icon">
				<LoaderCircle class="svg-icon"/>
			</div>
		{:else if $fileInfo.isError}
			<div class="file-icon">
				<Ban class="svg-icon" />
			</div>
		{/if}
		<div>
			{#if !fileId}Uploading: {/if}
			{#if $fileInfo.isError}{$fileInfo.error.message}: {/if}
			<strong>{title}</strong>
			{#if $fileInfo.isSuccess}
				<span class="file-size">• {humanFileSize($fileInfo.data.size??0)}</span>
			{/if}
		</div>
	</div>
	{#if showPreview && $fileInfo.data?.thumbnails}
		{#each $fileInfo.data.thumbnails as thumbnail}
			<img src={thumbnail.large?.url} alt="">
		{/each}
	{/if}
</div>

<style>
	.one-drive {
		--p-spacing: 0;
		--icon-size: var(--icon-xl);
		padding: var(--size-4-2);
		border-radius: var(--radius-s);
		background-color: var(--background-primary-alt);
	}
	.header {
		display: flex;
		column-gap: var(--size-4-1);
		align-items: center;
	}
	.file-icon {
		display: flex;
		justify-content: center;
		align-items: center;
		margin: 0;
		width: 44px;
		height: 40px;
		padding: var(--size-2-2) var(--size-2-3);
		color: var(--interactive-accent);
	}
	.file-size {
		font-size: var(--font-ui-small);
		color: var(--text-muted);
	}
</style>
