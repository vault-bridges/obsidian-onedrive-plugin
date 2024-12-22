import {
	Client,
	FileUpload,
	type OneDriveLargeFileUploadOptions,
	OneDriveLargeFileUploadTask,
	type Range,
	type UploadEventHandlers,
} from '@microsoft/microsoft-graph-client'
import type { DriveItem } from '@microsoft/microsoft-graph-types'
import { Notice } from 'obsidian'
import type { OneDrivePluginSettings } from '../main'
import type { AuthProvider } from './auth-provider'

export class GraphClient {
	authProvider: AuthProvider
	constructor(authProvider: AuthProvider) {
		this.authProvider = authProvider
	}

	async getClient() {
		const authResult = await this.authProvider.getAuthToken()
		if (!authResult) throw new Error('No auth token')
		return Client.init({
			authProvider: (done) => {
				done(null, authResult.accessToken)
			},
		})
	}

	async listRootDirectories() {
		const client = await this.getClient()
		const filesResponse = await client
			.api('/drive/special/approot/children')
			.get()
			.catch((error) => {
				const message = error instanceof Error ? error.message : error
				new Notice(`Failed to check directories: ${message}`)
				console.error(error)
				return { value: [] }
			})
		const files: DriveItem[] = filesResponse.value
		return files
	}

	async createFolder(name: string) {
		const client = await this.getClient()
		const response = await client
			.api('/drive/special/approot/children')
			.post({ name, folder: {}, '@microsoft.graph.conflictBehavior': 'fail' })
			.catch((error) => {
				const message = error instanceof Error ? error.message : error
				new Notice(`Can't create directory: ${message}`)
				console.error(error)
			})
		return response as DriveItem
	}

	async uploadFile(file: File, settings: OneDrivePluginSettings) {
		const client = await this.getClient()

		const progress = (range?: Range, extraCallbackParam?: unknown) => {
			console.log(range, extraCallbackParam)
		}

		const uploadEventHandlers: UploadEventHandlers = {
			progress,
			extraCallbackParam: true,
		}

		const options: OneDriveLargeFileUploadOptions = {
			uploadSessionURL: `/drive/special/approot:/${settings.oneDriveDirectory}/${file.name}:/createUploadSession`,
			fileName: file.name,
			rangeSize: 1024 * 1024,
			conflictBehavior: settings.conflictBehavior,
			uploadEventHandlers,
		}

		const fileObject = new FileUpload(await file.arrayBuffer(), file.name, file.size)

		const uploadTask = await OneDriveLargeFileUploadTask.createTaskWithFileObject(
			client,
			fileObject,
			options,
		).catch((error) => {
			const message = error instanceof Error ? error.message : error
			new Notice(`Can't upload file: ${message}`)
			console.error(error)
		})
		if (!uploadTask) return
		const uploadResult = await uploadTask.upload()
		return uploadResult.responseBody as DriveItem
	}

	async getFileInfo(fileId: string) {
		const client = await this.getClient()
		return (await client
			.api(`/me/drive/items/${fileId}`)
			.query({ expand: 'thumbnails' })
			.get()) as DriveItem
	}
}
