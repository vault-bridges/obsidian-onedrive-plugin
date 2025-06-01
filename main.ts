import type { AccountInfo } from '@azure/msal-common'
import { type App, type Editor, Notice, Plugin, type PluginManifest } from 'obsidian'
import { type Component, mount } from 'svelte'
import { AuthProvider } from './src/auth-provider'
import { GraphClient } from './src/graph-client'
import { getCodeBlock } from './src/markdown-utils'
import { OneDriveWidget } from './src/onedrive-widget'
import { queryClient } from './src/onedrive-widget/query-client'
import { OneDriveSettingTab } from './src/settings-tab'

export interface OneDrivePluginSettings {
	oneDriveDirectory: string
	showPreview: boolean
	conflictBehavior: 'rename' | 'fail' | 'replace'
}

const DEFAULT_SETTINGS: OneDrivePluginSettings = {
	oneDriveDirectory: 'Obsidian',
	showPreview: false,
	conflictBehavior: 'fail',
}

type Callback = (value: typeof DEFAULT_SETTINGS) => void

export default class OneDrivePlugin extends Plugin {
	account: AccountInfo | null = null
	settings!: OneDrivePluginSettings
	authProvider: AuthProvider
	client!: GraphClient
	pluginPath: string
	callbacks: Callback[] = []
	settingsTab: OneDriveSettingTab

	constructor(app: App, manifest: PluginManifest) {
		super(app, manifest)
		this.pluginPath = manifest.dir ?? ''
		this.authProvider = new AuthProvider()
		this.settingsTab = new OneDriveSettingTab(this)
	}

	async onload() {
		await this.loadSettings()
		await this.initClient()
		this.registerEventHandlers()
		this.registerMarkdownProcessors()
		this.registerCommands()
		this.registerProtocolHandlers()
		this.addSettingTab(this.settingsTab)
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData())
	}

	async saveSettings() {
		await this.saveData(this.settings)
		for (const callback of this.callbacks) {
			callback(this.settings)
		}
	}

	async initClient() {
		this.account = await this.authProvider.init()
		this.client = new GraphClient(this.authProvider)
	}

	registerEventHandlers() {
		this.app.workspace.on('editor-drop', async (event, editor) => {
			if (event.defaultPrevented) return
			if (!event.dataTransfer) return
			for (const file of Array.from(event.dataTransfer.files)) {
				if (file?.type === 'application/pdf') {
					event.preventDefault()
					await this.uploadFile(file, editor)
				}
			}
		})
	}

	mountSvelteComponent(component: Component<{ source: string }>, el: HTMLElement, source: string) {
		mount(component, {
			target: el,
			props: { source },
			context: new Map([['plugin', this]]),
		})
	}

	registerMarkdownProcessors() {
		this.registerMarkdownCodeBlockProcessor('onedrive', (source, el) => {
			this.mountSvelteComponent(OneDriveWidget, el, source)
		})

		if (__DEV__) {
			this.registerMarkdownCodeBlockProcessor('onedrive-dev', async (source, el) => {
				const { default: OneDriveWidgetDev } = await import(
					'./src/onedrive-widget/onedrive-widget-dev.svelte'
				)
				this.mountSvelteComponent(OneDriveWidgetDev, el, source)
			})
		}
	}

	async handleUploadFileCommand(editor: Editor) {
		const input = document.createElement('input')
		input.type = 'file'
		input.onchange = (_) => {
			if (!input.files) return
			const files = Array.from(input.files)
			if (files.length > 0) {
				this.uploadFile(files[0], editor)
			}
		}
		input.click()
		input.remove()
	}

	async handleUploadCurrentNoteFilesCommand(editor: Editor) {
		const content = editor.getValue()
		const fileRegex = /\[\[([^\]]+)]]/g
		const matches = Array.from(content.matchAll(fileRegex))
		const fileLinks = matches.map((match) => match[1].split('|')[0])
		for (const fileLink of fileLinks) {
			const file = this.app.vault.getFileByPath(fileLink)
			if (file) {
				const fileBinary = await this.app.vault.readBinary(file)
				const fileObj = new File([fileBinary], file.name)
				await this.uploadFile(fileObj, editor)
			} else {
				console.error(`File not found: ${fileLink}`)
			}
		}
	}

	registerCommands() {
		this.addCommand({
			id: 'upload-file',
			name: 'Upload file',
			editorCallback: this.handleUploadFileCommand.bind(this),
		})

		this.addCommand({
			id: 'upload-current-note-files',
			name: 'Upload files from the current note',
			editorCallback: this.handleUploadCurrentNoteFilesCommand.bind(this),
		})
	}

	registerProtocolHandlers() {
		this.registerObsidianProtocolHandler('onedrive', async (path) => {
			this.account = await this.authProvider.handleRedirect(path.hash)
			this.settingsTab.display()
		})
	}

	subscribe(callback: Callback) {
		this.callbacks.push(callback)
	}

	async uploadFile(file: File, editor: Editor) {
		new Notice('Start upload')
		const title = file.name.replace(/.[^.]+$/, '') // Remove file extension
		const placeholderLineCount = this.insertCodeBlock(editor, { title })
		const driveItem = await this.client.uploadFile(file, this.settings)
		if (driveItem?.id) {
			queryClient.setQueryData(['file', driveItem.id], driveItem)
			new Notice('File uploaded')
			this.updateCodeBlock(editor, { id: driveItem.id, title }, placeholderLineCount)
		} else {
			new Notice('File upload failed')
		}
	}

	/**
	 * Initial code block placement, without moving the cursor
	 */
	insertCodeBlock(editor: Editor, data: Record<string, string>) {
		const initialCursor = editor.getCursor()
		const codeBlock = getCodeBlock(data)
		editor.replaceRange(codeBlock, initialCursor)
		return codeBlock.split('\n').length
	}

	/**
	 * Update the code block with new data, moves cursor to the end of the code block
	 */
	updateCodeBlock(editor: Editor, data: Record<string, string>, placeholderLineCount: number) {
		const initialCursor = editor.getCursor()
		const codeBlock = getCodeBlock(data)
		const codeBlockLineCount = codeBlock.split('\n').length
		editor.replaceRange(codeBlock, initialCursor, {
			line: initialCursor.line + placeholderLineCount,
			ch: 0,
		})
		editor.setCursor({ line: initialCursor.line + codeBlockLineCount, ch: 0 })
	}
}
