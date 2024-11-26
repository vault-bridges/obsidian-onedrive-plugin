import {
	Client,
	FileUpload,
	type OneDriveLargeFileUploadOptions,
	OneDriveLargeFileUploadTask,
	type Range,
	type UploadEventHandlers,
} from '@microsoft/microsoft-graph-client'
import type { DriveItem } from '@microsoft/microsoft-graph-types'
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
		const filesResponse = await client.api('/me/drive/root/children').get()
		const files: DriveItem[] = filesResponse.value
		return files
	}

	async createFolder(name: string) {
		const client = await this.getClient()
		return await client.api('/me/drive/root/children').post({
			name,
			folder: {},
			'@microsoft.graph.conflictBehavior': 'fail',
		})
	}

	async uploadFile(file: File, path: string) {
		const client = await this.getClient()

		const progress = (range?: Range, extraCallbackParam?: unknown) => {
			console.log(range, extraCallbackParam)
		}

		const uploadEventHandlers: UploadEventHandlers = {
			progress,
			extraCallbackParam: true,
		}

		const options: OneDriveLargeFileUploadOptions = {
			path: `/${path}`,
			fileName: file.name,
			rangeSize: 1024 * 1024,
			conflictBehavior: 'fail',
			uploadEventHandlers,
		}

		const fileObject = new FileUpload(await file.arrayBuffer(), file.name, file.size)

		const uploadTask = await OneDriveLargeFileUploadTask.createTaskWithFileObject(
			client,
			fileObject,
			options,
		)
		const uploadResult = await uploadTask.upload()
		return uploadResult.responseBody as DriveItem
	}

	async getFileInfo(fileId: string) {
		const client = await this.getClient()
		return await client.api(`/me/drive/items/${fileId}`).get()
	}
}
