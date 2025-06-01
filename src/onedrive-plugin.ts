import type { AccountInfo } from '@azure/msal-common'
import mime from 'mime'
import { type App, type Editor, Notice, Plugin, type PluginManifest } from 'obsidian'
import { type Component, mount } from 'svelte'
import { AuthProvider } from './auth-provider'
import { GraphClient } from './graph-client'
import { getCodeBlock } from './markdown-utils'
import { OneDriveWidget } from './onedrive-widget'
import { queryClient } from './onedrive-widget/query-client'
import { OneDriveSettingTab } from './settings-tab'

export interface OneDrivePluginSettings {
	oneDriveDirectory: string
	showPreview: boolean
	conflictBehavior: 'rename' | 'fail' | 'replace'
	supportedFiles: string
}

const DEFAULT_SETTINGS: OneDrivePluginSettings = {
	oneDriveDirectory: 'Obsidian',
	showPreview: false,
	conflictBehavior: 'fail',
	supportedFiles: 'image/*,video/*,audio/*,application/*',
}

type Callback = (value: typeof DEFAULT_SETTINGS) => void

export class OneDrivePlugin extends Plugin {
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

	onunload() {
		this.callbacks = []
		queryClient.clear()
	}

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
				if (!this.isFileSupported(file)) continue
				event.preventDefault()
				await this.uploadFile(file, editor)
			}
		})
	}

	mountSvelteComponent(component: Component<{ source: string }>, el: HTMLElement, source: string) {
		const context = new Map([['plugin', this]])
		mount(component, { target: el, props: { source }, context })
	}

	registerMarkdownProcessors() {
		this.registerMarkdownCodeBlockProcessor('onedrive', (source, el) => {
			this.mountSvelteComponent(OneDriveWidget, el, source)
		})

		if (__DEV__) {
			this.registerMarkdownCodeBlockProcessor('onedrive-dev', async (source, el) => {
				const { default: OneDriveWidgetDev } = await import(
					'./onedrive-widget/onedrive-widget-dev.svelte'
				)
				this.mountSvelteComponent(OneDriveWidgetDev, el, source)
			})
		}
	}

	handleUploadFileCommand(editor: Editor) {
		const input = document.createElement('input')
		input.type = 'file'
		input.accept = 'image/*,video/*,audio/*,application/*'
		input.multiple = true
		input.onchange = async (_) => {
			if (!input.files) return
			for (const file of Array.from(input.files)) {
				if (!this.isFileSupported(file)) continue
				await this.uploadFile(file, editor)
			}
		}
		input.click()
		input.remove()
	}

	async handleUploadCurrentNoteFilesCommand(editor: Editor) {
		const content = editor.getValue()
		const fileLinks = this.extractFileLinksFromContent(content)
		const nonMarkdownFiles = this.app.vault.getFiles().filter((file) => file.extension !== 'md')

		for (const { fileName, displayTitle } of fileLinks) {
			if (!fileName.includes('.')) continue // Skip links to notes
			const vaultFile = nonMarkdownFiles.find((file) => file.path.includes(fileName))
			if (!vaultFile) continue

			try {
				const fileBinary = await this.app.vault.readBinary(vaultFile)
				const type = mime.getType(fileName) ?? 'application/octet-stream'
				const file = new File([fileBinary], vaultFile.name, { type })
				if (!this.isFileSupported(file)) continue
				await this.uploadFile(file, editor, displayTitle)
			} catch (error) {
				console.error(`Error processing file ${fileName}:`, error)
			}
		}
	}

	extractFileLinksFromContent(content: string) {
		const fileRegex = /\[\[([^\]]+)]]/g
		const matches = Array.from(content.matchAll(fileRegex))

		return matches.map((match) => {
			const [fileName, displayTitle] = match[1].split('|')
			return { fileName, displayTitle }
		})
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

	isFileSupported(file: File) {
		const supportedFileList = this.settings.supportedFiles.split(',')
		if (supportedFileList.length === 0) {
			this.notice('No supported files specified in settings')
			return false
		}
		const isFileSupported = supportedFileList.some((fileType) =>
			new RegExp(fileType).test(file.type),
		)
		if (!isFileSupported) {
			this.notice(`File type not supported: ${file.type}`)
		}
		return isFileSupported
	}

	async uploadFile(file: File, editor: Editor, defaultTitle?: string) {
		this.notice(`Start upload file: ${file.name}`)
		const title = defaultTitle ?? file.name.replace(/.[^.]+$/, '') // Remove file extension
		const placeholderLineCount = this.insertCodeBlock(editor, { title })
		const driveItem = await this.client.uploadFile(file, this.settings)
		if (driveItem?.id) {
			queryClient.setQueryData(['file', driveItem.id], driveItem)
			this.notice(`File uploaded: ${file.name}`)
			this.updateCodeBlock(editor, { id: driveItem.id, title }, placeholderLineCount)
		} else {
			this.notice(`File upload failed: ${file.name}`)
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
		const cursorPosition = editor.getCursor()
		const codeBlock = getCodeBlock(data)
		const codeBlockLineCount = codeBlock.split('\n').length
		const placeholderEndPosition = { line: cursorPosition.line + placeholderLineCount - 1, ch: 0 }
		const codeBlockEndPos = { line: cursorPosition.line + codeBlockLineCount - 1, ch: 0 }
		editor.replaceRange(codeBlock, cursorPosition, placeholderEndPosition)
		editor.setCursor(codeBlockEndPos)
	}

	notice(message: string) {
		const pluginName = this.manifest.name
		const div = document.createElement('div')
		div.innerHTML = `<div>${pluginName}</div><div>${message}</div>`
		const docFragment = document.createDocumentFragment()
		docFragment.appendChild(div)
		new Notice(docFragment)
	}
}
