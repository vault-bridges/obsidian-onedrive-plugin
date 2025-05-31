import type { AccountInfo } from '@azure/msal-common'
import { type App, type Editor, MarkdownView, Notice, Plugin, type PluginManifest } from 'obsidian'
import { mount } from 'svelte'
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
		this.account = await this.authProvider.init()
		this.client = new GraphClient(this.authProvider)

		this.app.workspace.on('editor-drop', async (evt, editor) => {
			if (evt.defaultPrevented) return
			const file = evt.dataTransfer?.files[0]
			if (file?.type === 'application/pdf') {
				evt.preventDefault()
				await this.uploadFile(file, editor)
			}
		})

		this.addSettingTab(this.settingsTab)

		this.registerMarkdownCodeBlockProcessor('onedrive', (source, el) => {
			mount(OneDriveWidget, { target: el, props: { source }, context: new Map([['plugin', this]]) })
		})

		if (__DEV__) {
			this.registerMarkdownCodeBlockProcessor('onedrive-dev', async (source, el) => {
				const { default: OneDriveWidgetDev } = await import(
					'./src/onedrive-widget/onedrive-widget-dev.svelte'
				)
				mount(OneDriveWidgetDev, {
					target: el,
					props: { source },
					context: new Map([['plugin', this]]),
				})
			})
		}

		this.registerObsidianProtocolHandler('onedrive', async (path) => {
			this.account = await this.authProvider.handleRedirect(path.hash)
			this.settingsTab.display()
		})

		this.addCommand({
			id: 'upload-file',
			name: 'Upload file',
			callback: () => {
				const input = document.createElement('input')
				input.type = 'file'
				input.onchange = (_) => {
					if (input.files) {
						const files = Array.from(input.files)
						const view = this.app.workspace.getActiveViewOfType(MarkdownView)
						if (view && files.length > 0) {
							this.uploadFile(files[0], view.editor)
						}
					}
				}
				input.click()
			},
		})

		this.addCommand({
			id: 'upload-current-note-files',
			name: 'Upload files from the current note',
			editorCallback: async (editor, ctx) => {
				if (ctx instanceof MarkdownView) {
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
			},
		})
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

	subscribe(callback: Callback) {
		this.callbacks.push(callback)
	}

	async uploadFile(file: File, editor: Editor) {
		new Notice('Start upload')
		const initialCursor = editor.getCursor()
		const title = file.name.replace(/.[^.]+$/, '') // Remove file extension
		const placeholder = getCodeBlock({ title })
		const placeholderLineCount = placeholder.split('\n').length
		editor.replaceRange(placeholder, initialCursor)
		const driveItem = await this.client.uploadFile(file, this.settings)
		if (driveItem?.id) {
			queryClient.setQueryData(['file', driveItem.id], driveItem)
			new Notice('File uploaded')
			const record = { id: driveItem.id, title }
			editor.replaceRange(getCodeBlock(record), initialCursor, {
				line: initialCursor.line + placeholderLineCount,
				ch: 0,
			})
		} else {
			new Notice('File upload failed')
		}
	}
}
