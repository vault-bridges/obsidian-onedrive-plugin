export function humanFileSize(size: number) {
	const exponent = size === 0 ? 0 : Math.floor(Math.log(size) / Math.log(1024))
	return `${+(size / 1024 ** exponent).toFixed(2)} ${['B', 'kB', 'MB', 'GB', 'TB'][exponent]}`
}
