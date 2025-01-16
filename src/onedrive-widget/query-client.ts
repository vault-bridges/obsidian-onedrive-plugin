import { QueryClient } from '@tanstack/svelte-query'
import type { PersistedClient, Persister } from '@tanstack/svelte-query-persist-client'
import { del, get, set } from 'idb-keyval'

/**
 * Creates an Indexed DB persister
 * @see https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
 */
function createIDBPersister(idbValidKey: IDBValidKey = 'obsidian-onedrive-plugin') {
	return {
		persistClient: async (client: PersistedClient) => {
			await set(idbValidKey, client)
		},
		restoreClient: async () => {
			return await get<PersistedClient>(idbValidKey)
		},
		removeClient: async () => {
			await del(idbValidKey)
		},
	} satisfies Persister
}

export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			// biome-ignore lint/style/useNumberNamespace: should be the same as maxAge persist option
			gcTime: Infinity,
		},
	},
})

export const persister = createIDBPersister()
