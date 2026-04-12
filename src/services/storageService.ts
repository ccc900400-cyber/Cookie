
import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'CookieAppDB';
const STORE_ANALYSIS = 'analysis_history';
const STORE_CHAT = 'chat_history';
const STORE_MINUTES = 'minutes_history';
const VERSION = 2;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_ANALYSIS)) {
          db.createObjectStore(STORE_ANALYSIS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_CHAT)) {
          db.createObjectStore(STORE_CHAT, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_MINUTES)) {
          db.createObjectStore(STORE_MINUTES, { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

export const storageService = {
  // Analysis History
  async saveAnalysis(item: any) {
    const db = await getDB();
    return db.put(STORE_ANALYSIS, item);
  },

  async getAllAnalysis() {
    const db = await getDB();
    const items = await db.getAll(STORE_ANALYSIS);
    return items.sort((a, b) => Number(b.id) - Number(a.id));
  },

  async clearAnalysis() {
    const db = await getDB();
    return db.clear(STORE_ANALYSIS);
  },

  // Chat History
  async saveChatMessage(message: any) {
    const db = await getDB();
    return db.put(STORE_CHAT, message);
  },

  async saveAllChatMessages(messages: any[]) {
    const db = await getDB();
    const tx = db.transaction(STORE_CHAT, 'readwrite');
    await tx.store.clear();
    for (const msg of messages) {
      await tx.store.put(msg);
    }
    return tx.done;
  },

  async getAllChatMessages() {
    const db = await getDB();
    const items = await db.getAll(STORE_CHAT);
    return items.sort((a, b) => a.timestamp - b.timestamp);
  },

  async clearChat() {
    const db = await getDB();
    return db.clear(STORE_CHAT);
  },

  // Minutes History
  async saveMinutes(item: any) {
    const db = await getDB();
    return db.put(STORE_MINUTES, item);
  },

  async getAllMinutes() {
    const db = await getDB();
    const items = await db.getAll(STORE_MINUTES);
    return items.sort((a, b) => Number(b.id) - Number(a.id));
  },

  async deleteMinutes(id: string) {
    const db = await getDB();
    return db.delete(STORE_MINUTES, id);
  },

  async clearMinutes() {
    const db = await getDB();
    return db.clear(STORE_MINUTES);
  }
};
