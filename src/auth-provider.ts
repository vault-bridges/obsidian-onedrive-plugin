import type { AccountInfo, AuthenticationResult } from '@azure/msal-common'
import {
	InteractionRequiredAuthError,
	PublicClientApplication,
	type SilentFlowRequest,
} from '@azure/msal-node'
import { PersistenceCachePlugin } from '@azure/msal-node-extensions'
import { shell } from 'electron'
import { Notice } from 'obsidian'
import { msalConfig } from './auth-config'
import { AuthPersistence } from './auth-persistence'

type BaseTokenRequest = {
	scopes: Array<string>
}

export class AuthProvider {
	private readonly scopes: Array<string>
	private readonly cachePath: string
	private clientApplication!: PublicClientApplication
	private account: AccountInfo | null

	constructor(pluginPath: string) {
		/**
		 * Initialize a public client application. For more information, visit:
		 * https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-node/docs/initialize-public-client-application.md
		 */
		this.account = null
		this.scopes = ['Files.ReadWrite.AppFolder']
		this.cachePath = [pluginPath, 'cache.json'].join('/')
	}

	async init() {
		const persistence = await AuthPersistence.create(
			this.cachePath,
			'obsidian-onedrive-plugin-account',
			msalConfig.system?.loggerOptions,
		)
		this.clientApplication = new PublicClientApplication({
			...msalConfig,
			cache: {
				cachePlugin: new PersistenceCachePlugin(persistence),
			},
		})

		return this.getAccount()
	}

	async login() {
		try {
			const authResponse = await this.getToken()
			return this.handleResponse(authResponse)
		} catch (error) {
			const message = error instanceof Error ? error.message : error
			new Notice(`Failed to log in: ${message}`)
			console.error(error)
			return null
		}
	}

	async logout() {
		const cache = this.clientApplication.getTokenCache()
		for (const account of await cache.getAllAccounts()) {
			await cache.removeAccount(account)
		}
		this.account = null
	}

	private async getToken() {
		const account = this.account || (await this.getAccount())
		const tokenRequest = { scopes: this.scopes }

		if (account) {
			return await this.getTokenSilent({ ...tokenRequest, account })
		}
		return await this.getTokenInteractive(tokenRequest)
	}

	async getAuthToken() {
		try {
			const account = this.account || (await this.getAccount())
			if (account) {
				return await this.clientApplication.acquireTokenSilent({ scopes: this.scopes, account })
			}
			return null
		} catch (e) {
			return null
		}
	}

	private async getTokenSilent(tokenRequest: SilentFlowRequest) {
		try {
			return await this.clientApplication.acquireTokenSilent(tokenRequest)
		} catch (error) {
			if (error instanceof InteractionRequiredAuthError) {
				console.log('Silent token acquisition failed, acquiring token interactive')
				return await this.getTokenInteractive(tokenRequest)
			}
			console.log(error)
			throw error
		}
	}

	private async getTokenInteractive(tokenRequest: BaseTokenRequest) {
		return this.clientApplication.acquireTokenInteractive({
			...tokenRequest,
			openBrowser: async (url) => shell.openExternal(url),
			successTemplate: '<h1>Successfully signed in!</h1> <p>You can close this window now.</p>',
			errorTemplate:
				'<h1>Oops! Something went wrong</h1> <p>Check the console for more information.</p>',
		})
	}

	/**
	 * Handles the response from a popup or redirect. If response is null, will check if we have any accounts and attempt to sign in.
	 * @param response
	 */
	private async handleResponse(response: AuthenticationResult) {
		this.account = response?.account || (await this.getAccount())
		return this.account
	}

	/**
	 * Calls getAllAccounts and determines the correct account to sign into, currently defaults to first account found in cache.
	 * https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-common/docs/Accounts.md
	 */
	private async getAccount() {
		const cache = this.clientApplication.getTokenCache()
		const currentAccounts = await cache.getAllAccounts()

		if (!currentAccounts) {
			console.log('No accounts detected')
			return null
		}

		if (currentAccounts.length > 1) {
			// Add choose account code here
			console.log('Multiple accounts detected, need to add choose account code.')
			return currentAccounts[0]
		}
		if (currentAccounts.length === 1) {
			return currentAccounts[0]
		}
		return null
	}
}
