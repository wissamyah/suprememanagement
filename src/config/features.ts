// Feature flags for gradual rollout and A/B testing
export const FEATURES = {
  // Enable GitHub-direct data access (no localStorage)
  // PERMANENTLY ENABLED - No longer using localStorage
  USE_GITHUB_DIRECT: true,
  
  // Enable debug logging for GitHub operations
  DEBUG_GITHUB_OPS: false,
  
  // Show offline indicator in UI
  SHOW_OFFLINE_INDICATOR: true,
  
  // Enable optimistic updates
  OPTIMISTIC_UPDATES: true,
  
  // Batch operation delay in ms
  BATCH_DELAY: 2000,
  
  // Cache TTL in minutes
  CACHE_TTL_MINUTES: 5,
  
  // Max offline queue size
  MAX_OFFLINE_QUEUE: 100,
  
  // Auto-retry failed operations
  AUTO_RETRY: true,
  
  // Retry delay in seconds
  RETRY_DELAY_SECONDS: 5,
  
  // Max retry attempts
  MAX_RETRY_ATTEMPTS: 3
};

// Helper to get feature flag from environment or localStorage
export function getFeatureFlag(flag: keyof typeof FEATURES): any {
  // Check environment variable first
  const envKey = `REACT_APP_${flag}`;
  const envValue = (import.meta.env as any)[envKey];
  
  if (envValue !== undefined) {
    // Parse boolean values
    if (envValue === 'true') return true;
    if (envValue === 'false') return false;
    // Parse numbers
    if (!isNaN(Number(envValue))) return Number(envValue);
    return envValue;
  }
  
  // Check localStorage override (for runtime toggling)
  try {
    const override = localStorage.getItem(`feature_${flag}`);
    if (override !== null) {
      const parsed = JSON.parse(override);
      return parsed;
    }
  } catch (error) {
    // Ignore localStorage errors
  }
  
  // Return default value
  return FEATURES[flag];
}

// Helper to set feature flag override in localStorage
export function setFeatureFlag(flag: keyof typeof FEATURES, value: any): void {
  try {
    localStorage.setItem(`feature_${flag}`, JSON.stringify(value));
    console.log(`Feature flag ${flag} set to ${value}. Reload the page for changes to take effect.`);
  } catch (error) {
    console.error(`Failed to set feature flag ${flag}:`, error);
  }
}

// Helper to clear feature flag override
export function clearFeatureFlag(flag: keyof typeof FEATURES): void {
  try {
    localStorage.removeItem(`feature_${flag}`);
    console.log(`Feature flag ${flag} reset to default. Reload the page for changes to take effect.`);
  } catch (error) {
    console.error(`Failed to clear feature flag ${flag}:`, error);
  }
}

// Export convenience function to check if using GitHub direct
export function isUsingGitHubDirect(): boolean {
  return getFeatureFlag('USE_GITHUB_DIRECT');
}