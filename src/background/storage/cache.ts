/**
 * TTL-based cache for AI responses stored in messenger.storage.local.
 */

const CACHE_KEY = "corvus_cache"
const DEFAULT_TTL_MS = 30 * 60 * 1000 // 30 minutes
const MAX_ENTRIES = 100

interface CacheEntry {
  key: string
  value: string
  expiresAt: number
}

interface CacheStore {
  entries: CacheEntry[]
}

async function loadCache(): Promise<CacheStore> {
  const data = await messenger.storage.local.get(CACHE_KEY)
  return (data[CACHE_KEY] as CacheStore) ?? { entries: [] }
}

async function saveCache(store: CacheStore): Promise<void> {
  await messenger.storage.local.set({ [CACHE_KEY]: store })
}

function pruneExpired(store: CacheStore): CacheStore {
  const now = Date.now()
  store.entries = store.entries.filter(e => e.expiresAt > now)
  return store
}

export async function cacheGet(key: string): Promise<string | null> {
  const store = pruneExpired(await loadCache())
  const entry = store.entries.find(e => e.key === key)
  if (!entry) return null
  if (entry.expiresAt <= Date.now()) {
    store.entries = store.entries.filter(e => e.key !== key)
    await saveCache(store)
    return null
  }
  return entry.value
}

export async function cacheSet(key: string, value: string, ttlMs: number = DEFAULT_TTL_MS): Promise<void> {
  const store = pruneExpired(await loadCache())

  // Remove existing entry with same key
  store.entries = store.entries.filter(e => e.key !== key)

  // Evict oldest if at capacity
  if (store.entries.length >= MAX_ENTRIES) {
    store.entries.sort((a, b) => a.expiresAt - b.expiresAt)
    store.entries = store.entries.slice(store.entries.length - MAX_ENTRIES + 1)
  }

  store.entries.push({
    key,
    value,
    expiresAt: Date.now() + ttlMs,
  })

  await saveCache(store)
}

export async function cacheDelete(key: string): Promise<void> {
  const store = await loadCache()
  store.entries = store.entries.filter(e => e.key !== key)
  await saveCache(store)
}

export async function cacheClear(): Promise<void> {
  await saveCache({ entries: [] })
}

export async function cacheStats(): Promise<{ entries: number; sizeEstimate: number }> {
  const store = pruneExpired(await loadCache())
  const json = JSON.stringify(store)
  return {
    entries: store.entries.length,
    sizeEstimate: new TextEncoder().encode(json).byteLength,
  }
}
