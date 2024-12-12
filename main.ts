import type { AccountInfo, AuthenticationResult } from '@azure/msal-common'
import { FileSystemAdapter, MarkdownView, Modal, Notice, Plugin } from 'obsidian'
import { mount } from 'svelte'
import { msalConfig } from './src/auth-config'
import { AuthProvider } from './src/auth-provider'
import { shell } from './src/electron'
import { GraphClient } from './src/graph-client'
import { extractKeyValuePairs, getCodeBlock } from './src/markdown-utils'
import OnedriveWidget from './src/onedrive-widget.svelte'
import { OneDriveSettingTab } from './src/settings-tab'
import store from './src/store.svelte'

interface OneDrivePluginSettings {
	oneDriveDirectory: string
	account: AuthenticationResult | null
}

const DEFAULT_SETTINGS: OneDrivePluginSettings = {
	oneDriveDirectory: 'Obsidian',
	account: null,
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

		store.plugin = this

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('dice', 'Sample Plugin', (evt) => {
			// Called when the user clicks the icon.
			new Notice('This is a notice!')
		})
		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class')

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem()
		statusBarItemEl.setText('Status Bar Text')

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'open-sample-modal-simple',
			name: 'Open sample modal (simple)',
			callback: () => {
				new SampleModal(this.app).open()
			},
		})
		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'sample-editor-command',
			name: 'Sample editor command',
			editorCallback: (editor, view) => {
				console.log(editor.getSelection())
				editor.replaceSelection('Sample Editor Command')
			},
		})
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: 'open-sample-modal-complex',
			name: 'Open sample modal (complex)',
			checkCallback: (checking) => {
				// Conditions to check
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView)
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new SampleModal(this.app).open()
					}

					// This command will only show up in Command Palette when the check function returns true
					return true
				}
			},
		})

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

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new OneDriveSettingTab(this.app, this))

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt) => {
			console.log('click', evt)
		})

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000))

		this.registerMarkdownCodeBlockProcessor('onedrive', (source, el) => {
			mount(OnedriveWidget, { target: el, props: { source } })
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

class SampleModal extends Modal {
	onOpen() {
		const { contentEl } = this
		contentEl.setText('Woah!')
	}

	onClose() {
		const { contentEl } = this
		contentEl.empty()
	}
}
