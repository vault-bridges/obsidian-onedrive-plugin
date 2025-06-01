<script lang="ts">
import type { DriveItem } from '@microsoft/microsoft-graph-types'
import { File } from 'lucide-svelte'
import { Menu, Notice, Platform, normalizePath } from 'obsidian'
import { getContext } from 'svelte'
import type { OneDrivePlugin } from '../onedrive-plugin'
import { FileInfoModal } from './file-info-modal'

type Props = {
	fileInfo: DriveItem
}
const { fileInfo }: Props = $props()
const plugin = getContext<OneDrivePlugin>('plugin')

async function download() {
	if (!fileInfo) return
	const url = fileInfo['@microsoft.graph.downloadUrl']
	const name = fileInfo.name
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
	if (!fileInfo) return
	const url = fileInfo['@microsoft.graph.downloadUrl']
	const name = fileInfo.name
	if (!url || !name) return

	const dirPath = `${plugin.pluginPath}/.cache`
	const filePath = normalizePath(`${dirPath}/${name}`)

	if (!(await plugin.app.vault.adapter.exists(dirPath))) {
		await plugin.app.vault.adapter.mkdir(dirPath)
	}

	if (!(await plugin.app.vault.adapter.exists(filePath))) {
		const response = await fetch(url)
		const arrayBuffer = await response.arrayBuffer()
		await plugin.app.vault.adapter.writeBinary(filePath, arrayBuffer)
	}

	// @ts-expect-error
	window.app.openWithDefaultApp(filePath)
}

function openInOneDrive() {
	if (fileInfo.webUrl) {
		window.open(fileInfo.webUrl, '_blank', 'noopener, noreferrer')
	} else {
		new Notice('File url not found')
	}
}

async function copyOneDriveUrl() {
	if (fileInfo.webUrl) {
		await window.navigator.clipboard.writeText(fileInfo.webUrl)
		new Notice('Copied to clipboard')
	} else {
		new Notice('File url not found')
	}
}

async function showFileInfo() {
	if (fileInfo) {
		new FileInfoModal(plugin.app, fileInfo).open()
	} else {
		new Notice('File info not found')
	}
}

function showMenu(event: MouseEvent) {
	const menu = new Menu()
	menu.addItem((item) => item.setTitle('Open in OneDrive').onClick(openInOneDrive))
	menu.addItem((item) => item.setTitle('Copy OneDrive URL').onClick(copyOneDriveUrl))
	menu.addItem((item) => item.setTitle('Open').onClick(open))
	if (Platform.isDesktop) {
		menu.addItem((item) => item.setTitle('Save as...').onClick(download))
	}
	menu.addItem((item) => item.setTitle('File info').onClick(showFileInfo))
	const target = event.target
	if (target instanceof HTMLElement) {
		const rect = target.getBoundingClientRect()
		menu.showAtPosition({ x: rect.left, y: rect.bottom })
	} else {
		menu.showAtMouseEvent(event)
	}
}
</script>


<button class="clickable-icon file-menu" onclick={showMenu}>
	<File width="24" height="24" class="svg-icon" />
	<span class="file-menu-text">pdf</span>
</button>

<style>
	.file-menu {
		position: relative;
	}
	.file-menu-text {
		position: absolute;
		font-size: 8px;
		font-weight: var(--font-black);
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--text-normal);
		transform: translateY(3px);
		text-transform: uppercase;
	}
</style>
