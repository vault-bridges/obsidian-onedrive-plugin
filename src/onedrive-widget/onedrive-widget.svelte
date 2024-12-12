<script lang="ts">
import { PersistQueryClientProvider } from '@tanstack/svelte-query-persist-client'
import { extractKeyValuePairs } from '../markdown-utils'
import FileInfo from './file-info.svelte'
import { persister, queryClient } from './query-client'

const { source } = $props()

const { id, title } = extractKeyValuePairs(source)
</script>

<PersistQueryClientProvider client={queryClient} persistOptions={{persister}}>
	<FileInfo fileId={id} title={title} />
</PersistQueryClientProvider>
