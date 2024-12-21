import { shell } from 'electron'
import { type ButtonComponent, Notice, PluginSettingTab, Setting } from 'obsidian'
import type OneDrivePlugin from '../main'

export class OneDriveSettingTab extends PluginSettingTab {
	plugin: OneDrivePlugin

	constructor(plugin: OneDrivePlugin) {
		super(plugin.app, plugin)
		this.plugin = plugin
	}

	display() {
		this.containerEl.empty()

		new Setting(this.containerEl).setName('Account').setHeading()

		if (this.plugin.account) {
			this.renderLoggedInSettings(this.containerEl)
		} else {
			this.renderLoggedOutSettings(this.containerEl)
		}
	}

	private renderLoggedInSettings(containerEl: HTMLElement) {
		this.renderAccountSetting(containerEl)
		this.renderDirectorySetting(containerEl)
	}

	private renderLoggedOutSettings(containerEl: HTMLElement) {
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

	private renderAccountSetting(containerEl: HTMLElement) {
		if (!this.plugin.account) return
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
	}

	private renderDirectorySetting(containerEl: HTMLElement) {
		new Setting(containerEl)
			.setName('OneDrive directory')
			.setDesc('OneDrive directory to store files in')
			.addText((text) =>
				text.setValue(this.plugin.settings.oneDriveDirectory).onChange(async (value) => {
					this.plugin.settings.oneDriveDirectory = value
					await this.plugin.saveSettings()
				}),
			)
			.addButton((button) => this.setupDirectoryButton(button))
	}

	private async setupDirectoryButton(button: ButtonComponent) {
		button.setDisabled(true).setButtonText('Check...')
		const files = await this.plugin.client.listRootDirectories()
		const directoryName = this.plugin.settings.oneDriveDirectory
		const file = files.find((file) => file.name === directoryName)

		if (file) {
			button
				.setButtonText('Open')
				.setDisabled(false)
				.onClick(async () => {
					if (file.webUrl) {
						await shell.openExternal(file.webUrl)
					}
				})
		} else {
			button
				.setButtonText('Create')
				.setDisabled(false)
				.onClick(async () => {
					await this.plugin.client.createFolder(directoryName)
					new Notice('Folder created')
					this.display()
				})
		}
	}
}
