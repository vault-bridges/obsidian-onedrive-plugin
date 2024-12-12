export function getCodeBlock(data: Record<string, string>) {
	return `
\`\`\`onedrive
${formatKeyValuePairs(data)}
\`\`\`
`
}

export function formatKeyValuePairs(data: Record<string, string>) {
	return Object.entries(data)
		.map((entry) => entry.join(': '))
		.join('\n')
}

export function extractKeyValuePairs(codeBlock: string): Record<string, string> {
	return Object.fromEntries(codeBlock.split('\n').map((line) => line.split(/: (.+)/).slice(0, 2)))
}
