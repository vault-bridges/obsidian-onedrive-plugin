import type { DriveItem } from '@microsoft/microsoft-graph-types'
import { type App, Modal } from 'obsidian'
import { mount } from 'svelte'
import FileInfoSvelte from './file-info-modal.svelte'

export class FileInfoModal extends Modal {
	constructor(app: App, fileInfo: DriveItem) {
		super(app)
		this.setTitle('File Info')
		mount(FileInfoSvelte, { target: this.contentEl, props: { fileInfo } })
	}
}
