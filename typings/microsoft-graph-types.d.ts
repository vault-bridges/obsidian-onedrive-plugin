import type { DriveItem as BaseDriveItem } from '@microsoft/microsoft-graph-types'

declare module '@microsoft/microsoft-graph-types' {
	interface DriveItem extends BaseDriveItem {
		'@microsoft.graph.downloadUrl'?: string
	}
}
