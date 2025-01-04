import type { AccountInfo } from '@azure/msal-common'
import { type App, Notice, Plugin, type PluginManifest } from 'obsidian'
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

	constructor(app: App, manifest: PluginManifest) {
		super(app, manifest)
		this.pluginPath = manifest.dir ?? ''
		this.authProvider = new AuthProvider()
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
		})

		this.addSettingTab(new OneDriveSettingTab(this))

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

		this.registerObsidianProtocolHandler('onedrive', (path) => {
			this.authProvider.handleRedirect(path.hash)
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
}
