// 写真表示用の画像を端末内（IndexedDB）に保存する。サーバーには送信しない。

const DB_NAME = 'smartphone-standby';
const STORE = 'photos';

export interface StoredPhoto {
  id: number;
  blob: Blob;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = fn(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(req.result);
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function listPhotos(): Promise<StoredPhoto[]> {
  try {
    return await run<StoredPhoto[]>('readonly', (s) => s.getAll() as IDBRequest<StoredPhoto[]>);
  } catch {
    return [];
  }
}

export async function addPhotos(files: Iterable<File>): Promise<void> {
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    await run('readwrite', (s) => s.add({ blob: file, added: Date.now() }));
  }
}

export async function clearPhotos(): Promise<void> {
  await run('readwrite', (s) => s.clear());
}
