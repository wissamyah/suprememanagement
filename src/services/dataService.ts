import { storage } from '../utils/storage';

interface DataServiceConfig {
  useGitHub: boolean;
  githubToken?: string;
  githubOwner?: string;
  githubRepo?: string;
  githubPath?: string;
  autosaveInterval?: number; // in milliseconds
}

interface DataStore {
  version: string;
  lastUpdated: string | null;
  inventory: {
    products: any[];
    categories: any[];
    movements: any[];
    productionEntries: any[];
  };
  customers: {
    customers: any[];
    sales: any[];
    loadings: any[];
  };
  suppliers: {
    suppliers: any[];
    paddyTrucks: any[];
  };
  ledgers: {
    entries: any[];
  };
  settings: {
    companyName: string;
    currency: string;
    dateFormat: string;
  };
}

class DataService {
  private config: DataServiceConfig;
  private dataCache: DataStore | null = null;
  private saveTimer: NodeJS.Timeout | null = null;
  private isDirty: boolean = false;

  constructor(config?: Partial<DataServiceConfig>) {
    this.config = {
      useGitHub: false,
      autosaveInterval: 30000, // 30 seconds default
      ...config
    };
    
    // Initialize with default structure
    this.initializeDataStructure();
    
    // Start autosave if enabled
    if (this.config.autosaveInterval && this.config.autosaveInterval > 0) {
      this.startAutosave();
    }
  }

  private initializeDataStructure(): void {
    const existingData = this.loadFromLocalStorage();
    if (!existingData) {
      this.dataCache = this.getDefaultDataStructure();
      this.saveToLocalStorage();
    } else {
      this.dataCache = existingData;
    }
  }

  private getDefaultDataStructure(): DataStore {
    return {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      inventory: {
        products: [],
        categories: [],
        movements: [],
        productionEntries: []
      },
      customers: {
        customers: [],
        sales: [],
        loadings: []
      },
      suppliers: {
        suppliers: [],
        paddyTrucks: []
      },
      ledgers: {
        entries: []
      },
      settings: {
        companyName: 'Supreme Management',
        currency: '₦',
        dateFormat: 'DD/MM/YYYY'
      }
    };
  }

  // Local Storage Methods
  private loadFromLocalStorage(): DataStore | null {
    try {
      const data = storage.get<DataStore>('dataStore');
      return data;
    } catch (error) {
      console.error('Error loading from localStorage:', error);
      return null;
    }
  }

  private saveToLocalStorage(): void {
    try {
      if (this.dataCache) {
        this.dataCache.lastUpdated = new Date().toISOString();
        storage.set('dataStore', this.dataCache);
      }
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }

  // GitHub API Methods (prepared for future implementation)
  private async loadFromGitHub(): Promise<DataStore | null> {
    if (!this.config.githubToken || !this.config.githubOwner || !this.config.githubRepo || !this.config.githubPath) {
      console.error('GitHub configuration is incomplete');
      return null;
    }

    try {
      const url = `https://api.github.com/repos/${this.config.githubOwner}/${this.config.githubRepo}/contents/${this.config.githubPath}`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `token ${this.config.githubToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const content = atob(data.content);
        return JSON.parse(content);
      }
      
      return null;
    } catch (error) {
      console.error('Error loading from GitHub:', error);
      return null;
    }
  }

  private async saveToGitHub(): Promise<boolean> {
    if (!this.config.githubToken || !this.config.githubOwner || !this.config.githubRepo || !this.config.githubPath) {
      console.error('GitHub configuration is incomplete');
      return false;
    }

    if (!this.dataCache) return false;

    try {
      const url = `https://api.github.com/repos/${this.config.githubOwner}/${this.config.githubRepo}/contents/${this.config.githubPath}`;
      
      // First, get the current file to get its SHA
      const getResponse = await fetch(url, {
        headers: {
          'Authorization': `token ${this.config.githubToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      let sha = '';
      if (getResponse.ok) {
        const fileData = await getResponse.json();
        sha = fileData.sha;
      }

      // Update the file
      const content = btoa(JSON.stringify(this.dataCache, null, 2));
      const updateResponse = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `token ${this.config.githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: `Update data: ${new Date().toISOString()}`,
          content: content,
          sha: sha || undefined
        })
      });

      return updateResponse.ok;
    } catch (error) {
      console.error('Error saving to GitHub:', error);
      return false;
    }
  }

  // Public Methods
  public async load(): Promise<DataStore | null> {
    if (this.config.useGitHub) {
      const githubData = await this.loadFromGitHub();
      if (githubData) {
        this.dataCache = githubData;
        // Also save to localStorage as cache
        this.saveToLocalStorage();
        return githubData;
      }
    }
    
    // Fall back to localStorage
    const localData = this.loadFromLocalStorage();
    this.dataCache = localData || this.getDefaultDataStructure();
    return this.dataCache;
  }

  public async save(): Promise<boolean> {
    if (!this.dataCache) return false;

    this.dataCache.lastUpdated = new Date().toISOString();
    
    // Always save to localStorage first
    this.saveToLocalStorage();
    
    // If GitHub is enabled, save there too
    if (this.config.useGitHub) {
      const success = await this.saveToGitHub();
      if (!success) {
        console.warn('Failed to save to GitHub, data saved locally only');
      }
      return success;
    }
    
    this.isDirty = false;
    return true;
  }

  // Data Access Methods
  public getData(path: string): any {
    if (!this.dataCache) {
      this.load();
    }
    
    const pathParts = path.split('.');
    let current: any = this.dataCache;
    
    for (const part of pathParts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return undefined;
      }
    }
    
    return current;
  }

  public setData(path: string, value: any): void {
    if (!this.dataCache) {
      this.dataCache = this.getDefaultDataStructure();
    }
    
    const pathParts = path.split('.');
    let current: any = this.dataCache;
    
    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i];
      if (!(part in current) || typeof current[part] !== 'object') {
        current[part] = {};
      }
      current = current[part];
    }
    
    const lastPart = pathParts[pathParts.length - 1];
    current[lastPart] = value;
    
    this.isDirty = true;
    
    // Save immediately to localStorage
    this.saveToLocalStorage();
  }

  // Autosave functionality
  private startAutosave(): void {
    if (this.saveTimer) {
      clearInterval(this.saveTimer);
    }
    
    this.saveTimer = setInterval(() => {
      if (this.isDirty) {
        this.save();
      }
    }, this.config.autosaveInterval);
  }

  public stopAutosave(): void {
    if (this.saveTimer) {
      clearInterval(this.saveTimer);
      this.saveTimer = null;
    }
  }

  // Utility methods
  public async exportData(): Promise<string> {
    await this.load();
    return JSON.stringify(this.dataCache, null, 2);
  }

  public async importData(jsonString: string): Promise<boolean> {
    try {
      const data = JSON.parse(jsonString);
      this.dataCache = data;
      await this.save();
      return true;
    } catch (error) {
      console.error('Error importing data:', error);
      return false;
    }
  }

  public async clearAllData(): Promise<void> {
    this.dataCache = this.getDefaultDataStructure();
    await this.save();
  }

  // Check if GitHub is configured
  public isGitHubConfigured(): boolean {
    return !!(
      this.config.githubToken &&
      this.config.githubOwner &&
      this.config.githubRepo &&
      this.config.githubPath
    );
  }

  // Update configuration
  public updateConfig(config: Partial<DataServiceConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Restart autosave if interval changed
    if (config.autosaveInterval !== undefined) {
      this.stopAutosave();
      if (config.autosaveInterval > 0) {
        this.startAutosave();
      }
    }
  }
}

// Create a singleton instance
const dataService = new DataService({
  useGitHub: false, // Start with localStorage, can be changed later
  autosaveInterval: 30000 // Autosave every 30 seconds
});

export default dataService;