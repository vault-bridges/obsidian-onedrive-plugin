import type { AccountInfo } from '@azure/msal-common'
import { FileSystemAdapter, Notice, Plugin } from 'obsidian'
import { mount } from 'svelte'
import { msalConfig } from './src/auth-config'
import { AuthProvider } from './src/auth-provider'
import { GraphClient } from './src/graph-client'
import { getCodeBlock } from './src/markdown-utils'
import { OneDriveWidget } from './src/onedrive-widget'
import { OneDriveSettingTab } from './src/settings-tab'

interface OneDrivePluginSettings {
	oneDriveDirectory: string
}

const DEFAULT_SETTINGS: OneDrivePluginSettings = {
	oneDriveDirectory: 'Obsidian',
}

export default class OneDrivePlugin extends Plugin {
	account!: AccountInfo | null
	settings!: OneDrivePluginSettings
	authProvider!: AuthProvider
	client!: GraphClient
	vaultPath!: string
	pluginPath!: string

	async onload() {
		if (this.app.vault.adapter instanceof FileSystemAdapter) {
			this.vaultPath = this.app.vault.adapter.getBasePath()
			this.pluginPath = [
				this.app.vault.configDir,
				'plugins',
				this.app.vault.adapter.getName(),
			].join('/')
			this.authProvider = new AuthProvider(msalConfig, `${this.vaultPath}/${this.pluginPath}`)
		}
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
				const placeholder = getCodeBlock({ title: file.name })
				const placeholderLineCount = placeholder.split('\n').length
				editor.replaceRange(placeholder, initialCursor)
				const driveItem = await this.client.uploadFile(file, this.settings.oneDriveDirectory)
				if (driveItem?.id) {
					new Notice('File uploaded')
					const record = { id: driveItem.id, title: file.name }
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
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData())
	}

	async saveSettings() {
		await this.saveData(this.settings)
	}
}
