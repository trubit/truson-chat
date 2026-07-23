// One-time migration of Zustand persist keys from the old brand name to the
// new brand name. This module is imported FIRST in main.tsx so it runs before
// any store module is evaluated (and before the persist middleware reads
// localStorage). Once the new key exists the old key is removed and this
// becomes a no-op on every subsequent load.

const migrateKey = (oldKey: string, newKey: string): void => {
  try {
    const oldData = localStorage.getItem(oldKey);
    if (oldData && !localStorage.getItem(newKey)) {
      localStorage.setItem(newKey, oldData);
      localStorage.removeItem(oldKey);
    }
  } catch {
    // localStorage may be unavailable (private-browsing, SSR, etc.)
  }
};

migrateKey('truson_auth', 'linkora_auth');
migrateKey('truson_notifications', 'linkora_notifications');
migrateKey('truson-stickers', 'linkora-stickers');
migrateKey('truson_theme', 'linkora_theme');
