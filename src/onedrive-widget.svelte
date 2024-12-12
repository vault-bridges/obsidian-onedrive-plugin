<script lang="ts">
import type { DriveItem } from '@microsoft/microsoft-graph-types'
import { shell } from './electron'
import { extractKeyValuePairs } from './markdown-utils'
import store from './store.svelte'

const { source } = $props()

const plugin = store.plugin
const { id, title } = extractKeyValuePairs(source)

let file = $state<DriveItem>()

async function download() {
	if (!file) return
	const url = file['@microsoft.graph.downloadUrl']
	const response = await fetch(url)
	const blob = await response.blob()
	const urlObj = URL.createObjectURL(blob)
	const link = document.createElement('a')
	link.text = file.name
	link.href = urlObj
	link.download = file.name
	link.click()
}

async function open() {
	const url = file['@microsoft.graph.downloadUrl']
	const response = await fetch(url)
	const arrayBuffer = await response.arrayBuffer()

	const filePath = `${plugin?.pluginPath}/.cache/${file.name}`
	await plugin.app.vault.createBinary(filePath, arrayBuffer).catch((error) => {
		console.log(error)
	})

	const res = await shell
		.openPath(`${plugin.vaultPath}/${plugin?.pluginPath}/.cache/${file.name}`)
		.catch((error) => {
			console.log(error)
		})
	console.log(res)
}

if (plugin && id) {
	;(async () => {
		file = await plugin.client.getFileInfo(id)
		console.log(file)
	})()
}
</script>

<div class="one-drive">
	<div>{title}</div>
	{#if !id && !file}Uploading...{/if}
	{#if id && !file}Loading...{/if}
	{#if file}
		<a href={file.webUrl}>Open in OneDrive</a>
		<button onclick={download}>Download</button>
		<button onclick={open}>Open</button>
	{/if}
</div>

<style>
	.one-drive {
		border: 1px dotted black;
	}
</style>
