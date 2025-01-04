import { BrowserCacheLocation, type Configuration, LogLevel } from '@azure/msal-browser'

export const msalConfig: Configuration = {
	auth: {
		clientId: '4b5ea737-ac61-46f0-a4cd-1d6498b545ec',
		redirectUri: 'obsidian://onedrive',
	},
	system: {
		loggerOptions: {
			loggerCallback(loglevel, message) {
				switch (loglevel) {
					case LogLevel.Error:
						return console.error(message)
					case LogLevel.Warning:
						return console.warn(message)
					case LogLevel.Info:
						return console.info(message)
					case LogLevel.Verbose:
						return console.debug(message)
					case LogLevel.Trace:
						return console.trace(message)
					default:
						console.error(`Unknown log level: "${loglevel}", message:`, message)
				}
			},
			piiLoggingEnabled: false,
			logLevel: LogLevel.Warning,
		},
	},
	cache: {
		cacheLocation: BrowserCacheLocation.LocalStorage,
	},
}
