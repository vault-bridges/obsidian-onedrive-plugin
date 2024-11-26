interface Window {
	electron: {
		shell: {
			openExternal: (url: string) => Promise<void>
			openPath: (path: string) => Promise<string>
		}
	}
}
