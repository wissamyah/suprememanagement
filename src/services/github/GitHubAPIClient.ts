import type { DataState, GitHubConfig } from './types';

export class GitHubAPIClient {
  private config: GitHubConfig;
  private currentSha: string | null = null;

  // Helper function to properly encode UTF-8 strings to base64
  private encodeBase64(str: string): string {
    // Convert string to UTF-8 bytes then to base64
    const utf8Bytes = new TextEncoder().encode(str);
    const binaryString = Array.from(utf8Bytes)
      .map(byte => String.fromCharCode(byte))
      .join('');
    return btoa(binaryString);
  }

  // Helper function to properly decode base64 to UTF-8 strings
  private decodeBase64(base64: string): string {
    // Decode base64 to binary string then to UTF-8
    const binaryString = atob(base64);
    const bytes = new Uint8Array(
      Array.from(binaryString).map(char => char.charCodeAt(0))
    );
    return new TextDecoder().decode(bytes);
  }

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
        const errorText = await response.text();
        console.error('GitHub API error response:', errorText);
        throw new Error(`GitHub API error: ${response.status} - ${errorText.substring(0, 200)}`);
      }

      // Get response text first to debug
      const responseText = await response.text();

      if (!responseText || responseText.trim() === '') {
        throw new Error('GitHub API returned empty response. Check if the file exists and your token has read permissions.');
      }

      let fileData;
      try {
        fileData = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse GitHub response:', responseText.substring(0, 500));
        throw new Error(`Invalid JSON response from GitHub API. Response: ${responseText.substring(0, 200)}`);
      }

      if (!fileData.content) {
        console.error('GitHub response missing content field:', fileData);
        throw new Error('GitHub API response missing content field. The file may be too large or the token lacks permissions.');
      }

      // Properly decode base64 with UTF-8 support
      const content = this.decodeBase64(fileData.content);

      if (!content || content.trim() === '') {
        throw new Error('Decoded file content is empty. The data.json file may be empty in your repository.');
      }

      let data;
      try {
        data = JSON.parse(content);
      } catch (parseError) {
        console.error('Failed to parse file content:', content.substring(0, 500));
        throw new Error(`Invalid JSON in data.json file: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
      }

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

    // Properly encode to base64 with UTF-8 support
    const content = this.encodeBase64(JSON.stringify(fullData, null, 2));
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