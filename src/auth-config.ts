import { type Configuration, LogLevel } from '@azure/msal-node'

export const msalConfig: Configuration = {
	auth: {
		clientId: '4b5ea737-ac61-46f0-a4cd-1d6498b545ec',

		authority: 'https://login.microsoftonline.com/common',
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
}
