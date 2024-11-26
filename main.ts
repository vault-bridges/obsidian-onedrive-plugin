import type { AccountInfo, AuthenticationResult } from '@azure/msal-common'
import { type Editor, FileSystemAdapter, MarkdownView, Modal, Notice, Plugin } from 'obsidian'
import { msalConfig } from './src/auth-config'
import { AuthProvider } from './src/auth-provider'
import { shell } from './src/electron'
import { GraphClient } from './src/graph-client'
import { OneDriveSettingTab } from './src/settings-tab'

interface OneDrivePluginSettings {
	oneDriveDirectory: string
	account: AuthenticationResult | null
}

const DEFAULT_SETTINGS: OneDrivePluginSettings = {
	oneDriveDirectory: 'Obsidian',
	account: null,
}

export class OneDrivePlugin extends Plugin {
	account: AccountInfo | null
	settings: OneDrivePluginSettings
	authProvider: AuthProvider
	client: GraphClient
	basePath: string
	pluginPath: string

	async onload() {
		if (this.app.vault.adapter instanceof FileSystemAdapter) {
			this.basePath = this.app.vault.adapter.getBasePath()
			this.pluginPath = [
				this.app.vault.configDir,
				'plugins',
				this.app.vault.adapter.getName(),
			].join('/')
			this.authProvider = new AuthProvider(msalConfig, `${this.basePath}/${this.pluginPath}`)
		}
		await this.loadSettings()
		this.account = await this.authProvider.init()
		this.client = new GraphClient(this.authProvider)

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('dice', 'Sample Plugin', (evt: MouseEvent) => {
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
			editorCallback: (editor: Editor, view: MarkdownView) => {
				console.log(editor.getSelection())
				editor.replaceSelection('Sample Editor Command')
			},
		})
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: 'open-sample-modal-complex',
			name: 'Open sample modal (complex)',
			checkCallback: (checking: boolean) => {
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
				console.log('start upload')
				const driveItem = await this.client.uploadFile(file, this.settings.oneDriveDirectory)
				if (driveItem) {
					new Notice('File uploaded')
					const data = { id: driveItem.id }
					editor.replaceRange(
						`\`\`\`onedrive
${JSON.stringify(data, null, 2)}
\`\`\`
`,
						editor.getCursor(),
					)
				} else {
					new Notice('File upload failed')
				}
			}
		})

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new OneDriveSettingTab(this.app, this))

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt)
		})

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000))

		this.registerMarkdownCodeBlockProcessor('onedrive', (source, el, ctx) => {
			const fileCard = el.createEl('div')
			console.log(JSON.parse(source))
			this.client.getFileInfo(JSON.parse(source).id).then((file) => {
				console.log(file)
				console.log(file['@microsoft.graph.downloadUrl'])
				fileCard.innerText = file.name
				fileCard.createDiv()
				fileCard.createEl('a', { href: file.webUrl, text: 'Open in OneDrive' })
				fileCard
					.createEl('button', { text: 'Download' })
					.addEventListener('click', async function () {
						this.disabled = true
						this.innerText = 'Downloading...'
						const url = file['@microsoft.graph.downloadUrl']
						const response = await fetch(url)
						const blob = await response.blob()
						const urlObj = URL.createObjectURL(blob)
						const link = document.createElement('a')
						link.text = file.name
						link.href = urlObj
						link.download = file.name
						link.click()
						this.disabled = false
						this.innerText = 'Download'
					})

				const path = this.pluginPath
				const absPath = `${this.basePath}/${this.pluginPath}`
				const vault = this.app.vault
				fileCard.createEl('button', { text: 'Open' }).addEventListener('click', async function () {
					this.disabled = true
					this.innerText = 'Opening...'
					const url = file['@microsoft.graph.downloadUrl']
					const response = await fetch(url)
					const arrayBuffer = await response.arrayBuffer()

					const filePath = `${path}/.cache/${file.name}`
					await vault.createBinary(filePath, arrayBuffer).catch((error) => {
						console.log(error)
					})

					const res = await shell.openPath(`${absPath}/.cache/${file.name}`).catch((error) => {
						console.log(error)
					})
					console.log(res)

					this.disabled = false
					this.innerText = 'Open'
				})
			})
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

export default OneDrivePlugin
