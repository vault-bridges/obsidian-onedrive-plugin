<script lang="ts">
import { createQuery } from '@tanstack/svelte-query'
import { shell } from 'src/electron'
import { getContext } from 'svelte'
import type OneDrivePlugin from '../../main'

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

async function download() {
	if (!$fileInfo.data) return
	const url = $fileInfo.data['@microsoft.graph.downloadUrl']
	const name = $fileInfo.data.name
	if (!url || !name) return
	const response = await fetch(url)
	const blob = await response.blob()
	const urlObj = URL.createObjectURL(blob)
	const link = document.createElement('a')
	link.text = name
	link.href = urlObj
	link.download = name
	link.click()
}

async function open() {
	if (!$fileInfo.data) return
	const url = $fileInfo.data['@microsoft.graph.downloadUrl']
	const name = $fileInfo.data.name
	if (!url || !name) return
	const response = await fetch(url)
	const arrayBuffer = await response.arrayBuffer()

	const filePath = `${plugin.pluginPath}/.cache/${name}`
	await plugin.app.vault.createBinary(filePath, arrayBuffer).catch((error) => {
		console.log(error)
	})

	const res = await shell
		.openPath(`${plugin.vaultPath}/${plugin.pluginPath}/.cache/${name}`)
		.catch((error) => {
			console.log(error)
		})
	console.log(res)
}
</script>

<div class="one-drive">
	<div>{title}</div>
	{#if !fileId}Uploading...{/if}
	{#if $fileInfo.isLoading}Loading...{/if}
	{#if $fileInfo.isError}{$fileInfo.error.message}{/if}
	{#if $fileInfo.isSuccess && $fileInfo.data}
		<a href={$fileInfo.data.webUrl}>Open in OneDrive</a>
		<button onclick={download}>Download</button>
		<button onclick={open}>Open</button>
	{/if}
</div>

<style>
	.one-drive {
		border: 1px dotted black;
	}
</style>
