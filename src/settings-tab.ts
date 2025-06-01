import { type ButtonComponent, Notice, PluginSettingTab, Setting } from 'obsidian'
import type { OneDrivePlugin } from './onedrive-plugin'

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
		this.renderConflictSetting(containerEl)
		this.renderSupportedFilesSetting(containerEl)
		new Setting(this.containerEl).setName('Rendering').setHeading()
		this.renderRenderingSetting(containerEl)
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
						window.open(file.webUrl, '_blank')
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

	private renderConflictSetting(containerEl: HTMLElement) {
		new Setting(containerEl)
			.setName('Conflict resolution')
			.setDesc('Upload files with the same name as existing files')
			.addDropdown((dropdown) =>
				dropdown
					.addOptions({ fail: 'Fail', rename: 'Rename', replace: 'Replace' })
					.setValue(this.plugin.settings.conflictBehavior)
					.onChange(async (value) => {
						this.plugin.settings.conflictBehavior = value as 'fail' | 'rename' | 'replace'
						await this.plugin.saveSettings()
					}),
			)
	}

	private renderSupportedFilesSetting(containerEl: HTMLElement) {
		new Setting(containerEl)
			.setName('Supported files')
			.setDesc('Comma separated list of MIME types to upload')
			.addText((text) =>
				text.setValue(this.plugin.settings.supportedFiles).onChange(async (value) => {
					this.plugin.settings.supportedFiles = value
				}),
			)
	}

	private renderRenderingSetting(containerEl: HTMLElement) {
		new Setting(containerEl)
			.setName('Display preview')
			.setDesc('Display preview of uploaded files')
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.showPreview).onChange(async (value) => {
					this.plugin.settings.showPreview = value
					await this.plugin.saveSettings()
				}),
			)
	}
}
