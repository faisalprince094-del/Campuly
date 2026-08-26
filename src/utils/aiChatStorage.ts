import { Conversation } from '../types';

const DB_NAME = 'Campusly_AIChat_DB';
const DB_VERSION = 1;
const STORE_NAME = 'conversations';
const LOCAL_STORAGE_KEY = 'campusly_ai_conversations_backup';

// Initial default demo conversation if empty
export const createDefaultConversation = (): Conversation => ({
  id: `conv_${Date.now()}`,
  title: 'Understanding Assets vs. Liabilities',
  mode: 'study_tutor',
  messages: [
    {
      id: 'msg_welcome_1',
      role: 'user',
      content: 'What is the difference between assets and liabilities in simple terms?',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: 'msg_welcome_2',
      role: 'assistant',
      content: `### Assets vs. Liabilities: Key Difference 📊

**Assets** are valuable resources that a person or business owns or controls that generate future economic value.
**Liabilities** are financial obligations, debts, or claims that you owe to external creditors.

---

### Comparison Breakdown

| Aspect | Assets (What You Own) | Liabilities (What You Owe) |
| :--- | :--- | :--- |
| **Cash Impact** | Puts money into your pocket | Takes money out of your pocket |
| **Examples** | Cash in bank, equipment, inventory, receivables | Student loans, credit card debt, accounts payable |
| **Accounting Balance** | Debit balance (Left side) | Credit balance (Right side) |

---

### Simple Rule of Thumb
* **Asset** = Future economic benefit (+💰)
* **Liability** = Future economic obligation (-💸)

*The Core Accounting Equation:*
$$\\text{Assets} = \\text{Liabilities} + \\text{Owner's Equity}$$

Feel free to ask for a simpler explanation, examples, or test yourself with a quick 5-question quiz!`,
      createdAt: new Date(Date.now() - 3500000).toISOString(),
    },
  ],
  createdAt: new Date(Date.now() - 3600000).toISOString(),
  updatedAt: new Date(Date.now() - 3500000).toISOString(),
});

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported'));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getConversations(): Promise<Conversation[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => {
        const result: Conversation[] = request.result || [];
        if (result.length === 0) {
          // Check local storage backup or seed default
          const fallback = getFromLocalStorage();
          if (fallback.length > 0) {
            resolve(fallback);
          } else {
            const defaultConv = createDefaultConversation();
            saveConversation(defaultConv).catch(() => {});
            resolve([defaultConv]);
          }
        } else {
          // Sort newest updated first
          result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
          resolve(result);
        }
      };
      request.onerror = () => {
        resolve(getFromLocalStorage());
      };
    });
  } catch (err) {
    return getFromLocalStorage();
  }
}

export async function saveConversation(conversation: Conversation): Promise<void> {
  // Update local storage backup immediately
  saveToLocalStorage(conversation);

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(conversation);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    // Fallback was already done
  }
}

export async function deleteConversation(id: string): Promise<void> {
  removeFromLocalStorage(id);

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    // Fallback was already done
  }
}

// ======================== LOCAL STORAGE FALLBACKS ========================
function getFromLocalStorage(): Conversation[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      const def = createDefaultConversation();
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify([def]));
      return [def];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveToLocalStorage(conversation: Conversation) {
  if (typeof window === 'undefined') return;
  try {
    const current = getFromLocalStorage();
    const index = current.findIndex((c) => c.id === conversation.id);
    if (index >= 0) {
      current[index] = conversation;
    } else {
      current.unshift(conversation);
    }
    current.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(current));
  } catch (err) {
    console.warn('LocalStorage save error:', err);
  }
}

function removeFromLocalStorage(id: string) {
  if (typeof window === 'undefined') return;
  try {
    const current = getFromLocalStorage();
    const updated = current.filter((c) => c.id !== id);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('LocalStorage delete error:', err);
  }
}
