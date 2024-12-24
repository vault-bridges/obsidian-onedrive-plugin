import { Logger, type LoggerOptions } from '@azure/msal-common/node'
import { LogLevel } from '@azure/msal-node'
import type { Vault } from 'obsidian'

export class FilePersistence {
	private readonly filePath: string
	private readonly logger: Logger
	private readonly vault: Vault

	constructor(vault: Vault, fileLocation: string, loggerOptions?: LoggerOptions) {
		this.logger = new Logger(loggerOptions || FilePersistence.createDefaultLoggerOptions())
		this.filePath = fileLocation
		this.vault = vault
	}

	static async create(vault: Vault, fileLocation: string, loggerOptions?: LoggerOptions) {
		const filePersistence = new FilePersistence(vault, fileLocation, loggerOptions)
		await filePersistence.createCacheFile()
		return filePersistence
	}

	async save(contents: string) {
		await this.vault.adapter.write(this.getFilePath(), contents)
	}

	async saveBuffer(contents: Uint8Array) {
		const arrayBuffer = contents.buffer.slice(
			contents.byteOffset,
			contents.byteOffset + contents.byteLength,
		) as ArrayBuffer
		await this.vault.adapter.writeBinary(this.getFilePath(), arrayBuffer)
	}

	async load() {
		return this.vault.adapter.read(this.getFilePath())
	}

	async loadBuffer() {
		return this.vault.adapter.readBinary(this.getFilePath())
	}

	async delete() {
		await this.vault.adapter.remove(this.getFilePath())
	}

	getFilePath() {
		return this.filePath
	}

	async reloadNecessary(lastSync: number) {
		return lastSync < (await this.timeLastModified())
	}

	getLogger() {
		return this.logger
	}

	createForPersistenceValidation() {
		const testCacheFileLocation = `${this.dirname(this.filePath)}/test.cache`
		return FilePersistence.create(this.vault, testCacheFileLocation)
	}

	static createDefaultLoggerOptions() {
		return {
			loggerCallback: () => {
				// allow users to not set loggerCallback
			},
			piiLoggingEnabled: false,
			logLevel: LogLevel.Info,
		}
	}

	async timeLastModified() {
		const stats = await this.vault.adapter.stat(this.getFilePath())
		if (!stats) throw new Error('File not found')
		return stats.mtime
	}

	async createCacheFile() {
		await this.createFileDirectory()
		// File is created only if it does not exist
		if (!(await this.vault.adapter.exists(this.filePath))) {
			await this.vault.adapter.write(this.filePath, '')
			this.logger.info(`File created at ${this.filePath}`)
		} else {
			this.logger.info(`File already exists at ${this.filePath}`)
		}
	}

	async createFileDirectory() {
		await this.vault.adapter.mkdir(this.dirname(this.filePath))
	}

	dirname(path: string) {
		return path.split('/').slice(0, -1).join('/')
	}
}
