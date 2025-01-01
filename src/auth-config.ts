import { BrowserCacheLocation, type Configuration, LogLevel } from '@azure/msal-browser'

export const msalConfig: Configuration = {
	auth: {
		clientId: '4b5ea737-ac61-46f0-a4cd-1d6498b545ec',
		redirectUri: 'obsidian://onedrive',
	},
	system: {
		loggerOptions: {
			loggerCallback(loglevel, message) {
				console.log(message)
			},
			piiLoggingEnabled: false,
			logLevel: LogLevel.Warning,
		},
	},
	cache: {
		cacheLocation: BrowserCacheLocation.LocalStorage,
	},
}
