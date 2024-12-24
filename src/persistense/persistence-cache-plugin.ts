import type { TokenCacheContext } from '@azure/msal-common/node'
import type { Persistence } from './persistence'

export class PersistenceCachePlugin {
	persistence: Persistence
	lastSync: number
	currentCache: string | null
	lockFilePath: string
	private logger

	constructor(persistence: Persistence) {
		this.persistence = persistence
		// initialize logger
		this.logger = persistence.getLogger()
		// create file lock
		this.lockFilePath = `${this.persistence.getFilePath()}.lockfile`
		// initialize default values
		this.lastSync = 0
		this.currentCache = null
	}

	async beforeCacheAccess(cacheContext: TokenCacheContext) {
		this.logger.info('Executing before cache access')
		const reloadNecessary = await this.persistence.reloadNecessary(this.lastSync)
		if (!reloadNecessary && this.currentCache !== null) {
			if (cacheContext.cacheHasChanged) {
				this.logger.verbose('Cache context has changed')
			}
			return
		}
		this.logger.info(`Reload necessary. Last sync time: ${this.lastSync}`)
		this.currentCache = await this.persistence.load()
		this.lastSync = new Date().getTime()
		if (this.currentCache) {
			cacheContext.tokenCache.deserialize(this.currentCache)
		} else {
			this.logger.info('Cache empty.')
		}
		this.logger.info(`Last sync time updated to: ${this.lastSync}`)
	}

	async afterCacheAccess(cacheContext: TokenCacheContext) {
		this.logger.info('Executing after cache access')

		if (cacheContext.cacheHasChanged) {
			this.logger.info('Msal in-memory cache has changed. Writing changes to persistence')
			this.currentCache = cacheContext.tokenCache.serialize()
			await this.persistence.save(this.currentCache)
		} else {
			this.logger.info('Msal in-memory cache has not changed. Did not write to persistence')
		}
	}
}
