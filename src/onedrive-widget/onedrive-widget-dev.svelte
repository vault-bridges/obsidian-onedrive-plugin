<script lang="ts">
import { readable } from 'svelte/store'
import { extractKeyValuePairs } from '../markdown-utils'
import FileInfo from './file-info.svelte'

const { source } = $props()

const { id, title, state, error } = extractKeyValuePairs(source)

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
const fileInfo = readable<any>({
	isSuccess: state === 'success',
	isLoading: state === 'loading',
	isError: state === 'error',
	error: { message: error },
	data: {
		size: 1024 * 1024,
	},
})
</script>

<FileInfo fileInfo={fileInfo} title={title} fileId={id} />
