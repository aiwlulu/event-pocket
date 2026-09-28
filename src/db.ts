export type EventPass = {
  id: string
  title: string
  date: string
  note: string
  image: string | null
  createdAt: string
  updatedAt: string
}

const DB_NAME = 'event-pocket'
const STORE_NAME = 'events'
const DB_VERSION = 1

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Could not open local storage.'))
  })
}

async function withStore<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode)
    const request = action(transaction.objectStore(STORE_NAME))
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Local storage request failed.'))
    transaction.onabort = () => reject(transaction.error ?? new Error('Local storage transaction failed.'))
    transaction.oncomplete = () => db.close()
  })
}

export function getEvents(): Promise<EventPass[]> {
  return withStore('readonly', (store) => store.getAll())
}

export function saveEvent(event: EventPass): Promise<IDBValidKey> {
  return withStore('readwrite', (store) => store.put(event))
}

export function deleteEvent(id: string): Promise<undefined> {
  return withStore('readwrite', (store) => store.delete(id))
}

export async function replaceEvents(events: EventPass[]): Promise<void> {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    store.clear()
    for (const event of events) store.put(event)
    transaction.oncomplete = () => {
      db.close()
      resolve()
    }
    transaction.onerror = () => reject(transaction.error ?? new Error('Could not import backup.'))
    transaction.onabort = () => reject(transaction.error ?? new Error('Could not import backup.'))
  })
}

export async function clearEvents(): Promise<void> {
  await withStore('readwrite', (store) => store.clear())
}
