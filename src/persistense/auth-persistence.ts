import type { LoggerOptions } from '@azure/msal-common/node'
import { del, get, set } from 'idb-keyval'
import type { Vault } from 'obsidian'
import { FilePersistence } from './file-persistence'
import type { Persistence } from './persistence'

export class AuthPersistence implements Persistence {
	private readonly vault: Vault
	protected readonly accountName
	private filePersistence: FilePersistence

	private constructor(vault: Vault, filePersistence: FilePersistence, accountName: string) {
		this.vault = vault
		this.filePersistence = filePersistence
		this.accountName = accountName
	}

	public static async create(
		vault: Vault,
		fileLocation: string,
		accountName: string,
		loggerOptions?: LoggerOptions,
	): Promise<AuthPersistence> {
		const filePersistence = await FilePersistence.create(vault, fileLocation, loggerOptions)
		return new AuthPersistence(vault, filePersistence, accountName)
	}

	public async save(contents: string) {
		await set(this.accountName, contents)
		// Write dummy data to update file mtime
		await this.filePersistence.save('{}')
	}

	public async load() {
		return await get(this.accountName)
	}

	public async delete() {
		await this.filePersistence.delete()
		await del(this.accountName)
		return true
	}

	public async reloadNecessary(lastSync: number) {
		return this.filePersistence.reloadNecessary(lastSync)
	}

	public getFilePath() {
		return this.filePersistence.getFilePath()
	}

	public getLogger() {
		return this.filePersistence.getLogger()
	}

	public createForPersistenceValidation() {
		const testCacheFileLocation = `${this.filePersistence.getFilePath()}/test.cache`
		return AuthPersistence.create(
			this.vault,
			testCacheFileLocation,
			'persistenceValidationAccountName',
		)
	}

	async verifyPersistence() {
		console.error('verifyPersistence is not implemented for AuthPersistence')
		return true
	}
}
