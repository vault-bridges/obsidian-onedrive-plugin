<script lang="ts">
import { createQuery } from '@tanstack/svelte-query'
import { LoaderCircle } from 'lucide-svelte'
import { getContext } from 'svelte'
import type OneDrivePlugin from '../../main'
import FileMenu from './file-menu.svelte'

type Props = {
	fileId: string
	title: string
}
const { fileId, title }: Props = $props()
const plugin = getContext<OneDrivePlugin>('plugin')

const fileInfo = createQuery({
	queryKey: ['file', fileId],
	queryFn: () => plugin.client.getFileInfo(fileId),
	enabled: !!fileId,
})
</script>

<div class="one-drive">
	<div class="header">
		{#if $fileInfo.isSuccess}
			<FileMenu fileInfo={$fileInfo.data} />
		{:else}
			<div class="loader-spinner">
				<LoaderCircle class="svg-icon"/>
			</div>
		{/if}
		<h6>{title}</h6>
	</div>
	{#if !fileId}Uploading...{/if}
	{#if $fileInfo.isLoading}Loading...{/if}
	{#if $fileInfo.isError}{$fileInfo.error.message}{/if}
	{#if $fileInfo.data && $fileInfo.data.thumbnails && false}
		<div>
			a preview will be here
<!--			<img src={$fileInfo.data.thumbnails[0].large?.url} alt="">-->
		</div>
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
		/*margin-block-end: var(--size-4-2);*/
	}
	.loader-spinner {
		display: flex;
		justify-content: center;
		align-items: center;
		margin: 0;
		padding: var(--size-2-2) var(--size-2-3);
	}
</style>
