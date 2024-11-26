import { type App, Notice, PluginSettingTab, Setting } from 'obsidian'
import type { OneDrivePlugin } from '../main'
import { shell } from './electron'

export class OneDriveSettingTab extends PluginSettingTab {
	plugin: OneDrivePlugin

	constructor(app: App, plugin: OneDrivePlugin) {
		super(app, plugin)
		this.plugin = plugin
	}

	display() {
		const { containerEl } = this

		containerEl.empty()

		if (this.plugin.account) {
			new Setting(containerEl)
				.setName('OneDrive account')
				.setDesc(`Logged in as ${this.plugin.account.name} (${this.plugin.account.username})`)
				.addButton((button) =>
					button.setButtonText('Logout').onClick(async () => {
						await this.plugin.authProvider.logout()
						this.plugin.account = null
						this.display()
					}),
				)

			new Setting(containerEl)
				.setName('OneDrive directory')
				.setDesc('OneDrive directory to store files in')
				.addText((text) =>
					text.setValue(this.plugin.settings.oneDriveDirectory).onChange(async (value) => {
						this.plugin.settings.oneDriveDirectory = value
						await this.plugin.saveSettings()
					}),
				)
				.addButton((button) => {
					this.plugin.client.listRootDirectories().then((files) => {
						const file = files.find((file) => file.name === this.plugin.settings.oneDriveDirectory)
						if (file) {
							button
								.setButtonText('Open')
								.setDisabled(false)
								.onClick(async () => {
									if (file.webUrl) {
										shell.openExternal(file.webUrl)
									}
								})
						} else {
							button
								.setButtonText('Create')
								.setDisabled(false)
								.onClick(async () => {
									const folder = await this.plugin.client
										.createFolder(this.plugin.settings.oneDriveDirectory)
										.catch((error) => {
											new Notice(`Can't create directory with error "${error.message}"`)
										})
									console.log(folder)
									if (folder) {
										new Notice('Folder created')
										this.display()
									}
								})
						}
					})
					return button.setDisabled(true).setButtonText('Check...')
				})
		} else {
			new Setting(containerEl)
				.setName('OneDrive account')
				.setDesc('Login to OneDrive')
				.addButton((button) =>
					button
						.setCta()
						.setButtonText('Login')
						.onClick(async () => {
							button.setDisabled(true)
							this.plugin.account = await this.plugin.authProvider.login()
							this.display()
						}),
				)
		}
	}
}
