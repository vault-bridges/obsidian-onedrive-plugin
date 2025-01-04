<script  lang="ts">
import type { DriveItem } from '@microsoft/microsoft-graph-types'
import { moment } from 'obsidian'
import { humanFileSize } from '../file-info-utils'

type Props = {
	fileInfo: DriveItem
}
const { fileInfo }: Props = $props()

const fileSize = fileInfo.size ? humanFileSize(fileInfo.size) : 'Unknown'
</script>
<div class="setting-item">
	<div class="setting-item-info">
		<div class="setting-item-name">Name</div>
		<div class="setting-item-description">{fileInfo.name}</div>
	</div>
</div>
<div class="setting-item">
	<div class="setting-item-info">
		<div class="setting-item-name">Path in OneDrive</div>
		<div class="setting-item-description">{fileInfo.parentReference?.path}</div>
	</div>
</div>
<div class="setting-item">
	<div class="setting-item-info">
		<div class="setting-item-name">Mime type</div>
		<div class="setting-item-description">{fileInfo.file?.mimeType}</div>
	</div>
</div>
<div class="setting-item">
	<div class="setting-item-info">
		<div class="setting-item-name">Size</div>
		<div class="setting-item-description">{fileSize} ({fileInfo.size})</div>
	</div>
</div>
<div class="setting-item">
	<div class="setting-item-info">
		<div class="setting-item-name">Created</div>
		<div class="setting-item-description">
			By {fileInfo.createdBy?.user?.displayName} on {moment(fileInfo.createdDateTime).format('LLL')}
		</div>
	</div>
</div>
<div class="setting-item">
	<div class="setting-item-info">
		<div class="setting-item-name">Last updated</div>
		<div class="setting-item-description">
			By {fileInfo.lastModifiedBy?.user?.displayName} on {moment(fileInfo.lastModifiedDateTime).format('LLL')}
		</div>
	</div>
</div>
