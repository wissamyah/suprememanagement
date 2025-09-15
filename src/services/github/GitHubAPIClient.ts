import type { DataState, GitHubConfig } from './types';

export class GitHubAPIClient {
  private config: GitHubConfig;
  private currentSha: string | null = null;

  constructor(config: GitHubConfig) {
    this.config = config;
  }

  updateToken(token: string): void {
    this.config.token = token;
  }

  async verifyToken(): Promise<boolean> {
    if (!this.config.token) return false;

    try {
      const response = await fetch(`${this.config.apiBase}/user`, {
        headers: {
          'Authorization': `Bearer ${this.config.token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      return response.ok;
    } catch (error) {
      console.error('Token verification failed:', error);
      return false;
    }
  }

  async fetchData(): Promise<{ data: DataState; sha: string } | null> {
    if (!this.config.token) {
      throw new Error('No authentication token');
    }

    try {
      const response = await fetch(
        `${this.config.apiBase}/repos/${this.config.owner}/${this.config.repo}/contents/${this.config.path}?ref=${this.config.branch}&t=${Date.now()}`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      );

      if (response.status === 404) {
        // File doesn't exist
        return null;
      }

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const fileData = await response.json();
      const content = atob(fileData.content);
      const data = JSON.parse(content);

      this.currentSha = fileData.sha;

      return {
        data: {
          products: data.products || [],
          categories: data.categories || [],
          movements: data.movements || [],
          productionEntries: data.productionEntries || [],
          customers: data.customers || [],
          sales: data.sales || [],
          ledgerEntries: data.ledgerEntries || [],
          bookedStock: data.bookedStock || [],
          loadings: data.loadings || [],
          suppliers: data.suppliers || [],
          paddyTrucks: data.paddyTrucks || []
        },
        sha: fileData.sha
      };
    } catch (error) {
      console.error('Error fetching data from GitHub:', error);
      throw error;
    }
  }

  async saveData(data: DataState, sha?: string): Promise<string> {
    if (!this.config.token) {
      throw new Error('No authentication token');
    }

    const fullData = {
      ...data,
      metadata: {
        lastUpdated: new Date().toISOString(),
        version: '3.0.0'
      }
    };

    const content = btoa(JSON.stringify(fullData, null, 2));
    const body: any = {
      message: `Update data - ${new Date().toISOString()}`,
      content: content,
      branch: this.config.branch
    };

    // Use provided SHA or current SHA
    const shaToUse = sha || this.currentSha;
    if (shaToUse) {
      body.sha = shaToUse;
    }

    const response = await fetch(
      `${this.config.apiBase}/repos/${this.config.owner}/${this.config.repo}/contents/${this.config.path}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.config.token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      }
    );

    if (!response.ok) {
      if (response.status === 409) {
        // SHA mismatch - conflict
        throw new Error('SHA_CONFLICT');
      }
      throw new Error(`GitHub save failed: ${response.status}`);
    }

    const result = await response.json();
    this.currentSha = result.content.sha;
    return result.content.sha;
  }

  async checkConnection(): Promise<boolean> {
    if (!this.config.token) {
      return navigator.onLine;
    }

    try {
      const response = await fetch(`${this.config.apiBase}/user`, {
        method: 'HEAD',
        headers: {
          'Authorization': `Bearer ${this.config.token}`,
          'Accept': 'application/vnd.github.v3+json'
        },
        cache: 'no-cache'
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  getCurrentSha(): string | null {
    return this.currentSha;
  }

  setCurrentSha(sha: string): void {
    this.currentSha = sha;
  }
}