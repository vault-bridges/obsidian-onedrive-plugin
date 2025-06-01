<script lang="ts">
import { createQuery } from '@tanstack/svelte-query'
import { getContext } from 'svelte'
import type { OneDrivePlugin } from '../onedrive-plugin'
import FileInfo from './file-info.svelte'

type Props = {
	fileId: string
	title: string
}

const plugin = getContext<OneDrivePlugin>('plugin')

const { fileId, title }: Props = $props()

const fileInfo = createQuery({
	queryKey: ['file', fileId],
	queryFn: () => plugin.client.getFileInfo(fileId),
	enabled: !!fileId,
})
</script>

<FileInfo fileInfo={fileInfo} title={title} fileId={fileId} />
