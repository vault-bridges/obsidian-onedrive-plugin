import type { Logger } from '@azure/msal-common/node'

export interface Persistence {
	save(contents: string): Promise<void>
	load(): Promise<string | null>
	delete(): Promise<boolean>
	reloadNecessary(lastSync: number): Promise<boolean>
	getFilePath(): string
	getLogger(): Logger
	verifyPersistence(): Promise<boolean>
	createForPersistenceValidation(): Promise<Persistence>
}
