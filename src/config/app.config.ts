// Application Configuration
// This file centralizes all configuration settings for the application

export const APP_CONFIG = {
  // GitHub Configuration
  github: {
    owner: 'wissamyah',
    repo: 'suprememanagement',
    branch: 'data',
    dataPath: 'data/inventory.json',
    apiBase: 'https://api.github.com',
    // Rate limiting
    minSaveInterval: 2000, // Minimum 2 seconds between saves
    maxRetries: 3,
    retryDelay: 2000, // Base retry delay in ms (exponential backoff)
  },
  
  // Storage Configuration
  storage: {
    prefix: 'supreme_mgmt_',
    tokenKey: 'gh_token',
    syncQueueKey: 'sync_queue',
    lastSyncKey: 'lastSync',
  },
  
  // Sync Configuration
  sync: {
    autoSyncDelay: 5000, // Auto-sync after 5 seconds of inactivity
    retryDelay: 10000, // Retry failed syncs after 10 seconds
    statusResetDelay: 3000, // Reset status messages after 3 seconds
  },
  
  // Security Configuration
  security: {
    tokenEncryption: {
      iterations: 100000,
      saltLength: 16,
      ivLength: 12,
      algorithm: 'AES-GCM',
      keyLength: 256,
      hash: 'SHA-256',
    },
    // In production, this should come from environment variable
    encryptionKey: import.meta.env.VITE_ENCRYPTION_KEY || 'supreme-mgmt-2024-secure-key-v2',
  },
  
  // UI Configuration
  ui: {
    toastDuration: 3000,
    animationDuration: 200,
    debounceDelay: 300,
  },
  
  // Data Structure Version
  dataVersion: '2.0.0',
  
  // Feature Flags
  features: {
    enableAutoSync: true,
    enableEncryption: true,
    enableRateLimiting: true,
    enableRetryLogic: true,
    enableOfflineMode: true,
  },
  
  // Error Messages
  errors: {
    authRequired: 'Authentication required. Please enter your GitHub token.',
    invalidToken: 'Invalid GitHub token. Please check and try again.',
    syncFailed: 'Failed to sync data with GitHub. Will retry automatically.',
    networkError: 'Network error. Please check your connection.',
    rateLimitExceeded: 'GitHub API rate limit exceeded. Please wait before trying again.',
    conflictError: 'File was modified externally. Please refresh and try again.',
  },
};

// Export individual configs for convenience
export const GITHUB_CONFIG = APP_CONFIG.github;
export const STORAGE_CONFIG = APP_CONFIG.storage;
export const SYNC_CONFIG = APP_CONFIG.sync;
export const SECURITY_CONFIG = APP_CONFIG.security;
export const UI_CONFIG = APP_CONFIG.ui;
export const FEATURE_FLAGS = APP_CONFIG.features;
export const ERROR_MESSAGES = APP_CONFIG.errors;