// Storage utility - GitHub Direct mode only
// This is maintained for backward compatibility but no longer uses localStorage

export const storage = {
  get: <T>(_key: string): T | null => {
    // In GitHub Direct mode, we don't use localStorage
    console.warn(`storage.get() called - GitHub Direct mode doesn't use localStorage`);
    return null;
  },

  set: <T>(_key: string, _value: T): void => {
    // In GitHub Direct mode, we don't use localStorage
    console.warn(`storage.set() called - GitHub Direct mode doesn't use localStorage`);
  },

  remove: (_key: string): void => {
    // In GitHub Direct mode, we don't use localStorage
    console.warn(`storage.remove() called - GitHub Direct mode doesn't use localStorage`);
  },

  clear: (): void => {
    // In GitHub Direct mode, clearing means clearing GitHub data
    console.warn('storage.clear() called - Use githubDataManager.clearAllData() instead');
  }
};

export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};