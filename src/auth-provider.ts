import {
	InteractionRequiredAuthError,
	PublicClientApplication,
	type RedirectRequest,
	type SilentRequest,
} from '@azure/msal-browser'
import type { AccountInfo, AuthenticationResult } from '@azure/msal-common'
import { Notice } from 'obsidian'
import { msalConfig } from './auth-config'

export class AuthProvider {
	private readonly scopes: Array<string>
	private clientApplication!: PublicClientApplication
	private account: AccountInfo | null

	constructor() {
		/**
		 * Initialize a public client application. For more information, visit:
		 * https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-node/docs/initialize-public-client-application.md
		 */
		this.account = null
		this.scopes = ['Files.ReadWrite.AppFolder']
	}

	async init() {
		this.clientApplication = new PublicClientApplication(msalConfig)

		await this.clientApplication.initialize()

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

	async handleRedirect(hash: string) {
		const authResponse = await this.clientApplication.handleRedirectPromise(hash)
		return this.handleResponse(authResponse)
	}

	async logout() {
		return this.clientApplication.logoutRedirect()
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

	private async getTokenSilent(tokenRequest: SilentRequest) {
		try {
			return await this.clientApplication.acquireTokenSilent(tokenRequest)
		} catch (error) {
			if (error instanceof InteractionRequiredAuthError) {
				console.log('Silent token acquisition failed, acquiring token interactive')
				return await this.getTokenInteractive(tokenRequest)
			}
			console.error(error)
			throw error
		}
	}

	private async getTokenInteractive(tokenRequest: RedirectRequest) {
		await this.clientApplication.acquireTokenRedirect(tokenRequest)
		return null
	}

	/**
	 * Handles the response from a popup or redirect. If response is null, will check if we have any accounts and attempt to sign in.
	 * @param response
	 */
	private async handleResponse(response: AuthenticationResult | null) {
		this.account = response?.account || (await this.getAccount())
		return this.account
	}

	/**
	 * Calls getAllAccounts and determines the correct account to sign into, currently defaults to first account found in cache.
	 * https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-common/docs/Accounts.md
	 */
	private async getAccount() {
		const currentAccounts = this.clientApplication.getAllAccounts()

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
