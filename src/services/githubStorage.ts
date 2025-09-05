// GitHub Storage Service for Inventory Management
class GitHubStorage {
    private owner: string = 'wissamyah';
    private repo: string = 'suprememanagement';
    private path: string = 'data/inventory.json';
    private branch: string = 'data';
    private token: string | null = null;
    private apiBase: string = 'https://api.github.com';
    private saveLock: boolean = false;
    private saveQueue: Promise<any> | null = null;

    constructor() {
        // Initialize properties in constructor if needed
    }

    // Initialize with token
    async initialize(token: string): Promise<boolean> {
        this.token = token;
        // Store token securely in sessionStorage (encrypted in production)
        sessionStorage.setItem('gh_token', this.encryptToken(token));
        
        // Verify token validity
        const isValid = await this.verifyToken();
        if (!isValid) {
            throw new Error('Invalid GitHub token');
        }
        
        return true;
    }

    // Simple encryption for token (use proper encryption in production)
    encryptToken(token: string): string {
        // In production, use a proper encryption library
        return btoa(token);
    }

    // Decrypt token
    decryptToken(encryptedToken: string): string | null {
        try {
            return atob(encryptedToken);
        } catch {
            return null;
        }
    }

    // Check if token exists and is valid
    async checkAuthentication(): Promise<boolean> {
        const encryptedToken = sessionStorage.getItem('gh_token');
        if (!encryptedToken) {
            return false;
        }

        this.token = this.decryptToken(encryptedToken);
        return await this.verifyToken();
    }

    // Verify token with GitHub API
    async verifyToken(): Promise<boolean> {
        if (!this.token) return false;

        try {
            const response = await fetch(`${this.apiBase}/user`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            return response.ok;
        } catch (error) {
            console.error('Token verification failed:', error);
            return false;
        }
    }

    // Get file content from GitHub
    async getFileContent(): Promise<any> {
        try {
            // Add timestamp to prevent caching
            const response = await fetch(
                `${this.apiBase}/repos/${this.owner}/${this.repo}/contents/${this.path}?ref=${this.branch}&t=${Date.now()}`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                }
            );

            if (response.status === 404) {
                // File doesn't exist, return empty data
                return {
                    content: null,
                    sha: null,
                    data: this.getDefaultData()
                };
            }

            if (!response.ok) {
                throw new Error(`GitHub API error: ${response.status}`);
            }

            const fileData = await response.json();
            const content = atob(fileData.content);
            
            return {
                content: content,
                sha: fileData.sha,
                data: JSON.parse(content)
            };
        } catch (error) {
            console.error('Error fetching file from GitHub:', error);
            throw error;
        }
    }

    // Update or create file on GitHub
    async saveFileContent(data: any, message: string = 'Update inventory data'): Promise<any> {
        try {
            // Always get fresh SHA right before saving to avoid conflicts
            let sha = null;
            try {
                console.log('Fetching current file SHA...');
                const current = await this.getFileContent();
                sha = current.sha;
                console.log('Current SHA:', sha);
            } catch (error) {
                // File doesn't exist, will create new
                console.log('Creating new file on GitHub');
            }

            const content = btoa(JSON.stringify(data, null, 2));

            const body: any = {
                message: `${message} - ${new Date().toISOString()}`,
                content: content,
                branch: this.branch
            };

            if (sha) {
                body.sha = sha;
            }

            console.log('Sending PUT request to GitHub API...', {
                url: `${this.apiBase}/repos/${this.owner}/${this.repo}/contents/${this.path}`,
                branch: this.branch,
                hasSha: !!sha
            });

            const response = await fetch(
                `${this.apiBase}/repos/${this.owner}/${this.repo}/contents/${this.path}`,
                {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(body)
                }
            );

            if (!response.ok) {
                const error = await response.json();
                console.error('GitHub API error response:', error);
                
                // If it's a SHA mismatch, retry with fresh SHA
                if (response.status === 409 && error.message?.includes('does not match')) {
                    console.log('SHA mismatch detected, retrying with fresh SHA...');
                    
                    // Get fresh SHA
                    const freshData = await this.getFileContent();
                    const freshSha = freshData.sha;
                    
                    if (freshSha && freshSha !== sha) {
                        console.log('Got fresh SHA:', freshSha);
                        body.sha = freshSha;
                        
                        // Retry the request with fresh SHA
                        const retryResponse = await fetch(
                            `${this.apiBase}/repos/${this.owner}/${this.repo}/contents/${this.path}`,
                            {
                                method: 'PUT',
                                headers: {
                                    'Authorization': `Bearer ${this.token}`,
                                    'Accept': 'application/vnd.github.v3+json',
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify(body)
                            }
                        );
                        
                        if (retryResponse.ok) {
                            console.log('Retry successful!');
                            return await retryResponse.json();
                        }
                        
                        const retryError = await retryResponse.json();
                        console.error('Retry failed:', retryError);
                        throw new Error(`GitHub API error after retry: ${retryError.message || retryResponse.status}`);
                    }
                }
                
                throw new Error(`GitHub API error: ${error.message || response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error saving file to GitHub:', error);
            throw error;
        }
    }

    // Get default data structure
    getDefaultData(): any {
        return {
            products: [],
            categories: [],
            movements: [],
            productionEntries: [],
            customers: [],
            suppliers: [],
            sales: [],
            loadings: [],
            metadata: {
                lastUpdated: new Date().toISOString(),
                version: '2.0.0'
            }
        };
    }

    // Load all data
    async loadAllData(): Promise<any> {
        try {
            const result = await this.getFileContent();
            return result.data || this.getDefaultData();
        } catch (error) {
            console.error('Error loading data from GitHub:', error);
            // Return default structure if GitHub fails
            return this.getDefaultData();
        }
    }

    // Save all data with queue to prevent concurrent saves
    async saveAllData(data: any): Promise<boolean> {
        // If a save is already in progress, wait for it to complete
        if (this.saveQueue) {
            console.log('Save already in progress, waiting for it to complete...');
            try {
                await this.saveQueue;
            } catch (error) {
                console.log('Previous save failed, continuing with new save');
            }
        }

        // Create a new save promise
        this.saveQueue = this._doSave(data);
        
        try {
            const result = await this.saveQueue;
            return result;
        } finally {
            this.saveQueue = null;
        }
    }

    // Internal save method
    private async _doSave(data: any): Promise<boolean> {
        try {
            console.log('Saving data to GitHub...', {
                products: data.products?.length || 0,
                categories: data.categories?.length || 0,
                movements: data.movements?.length || 0,
                branch: this.branch,
                path: this.path
            });

            const fullData = {
                ...data,
                metadata: {
                    lastUpdated: new Date().toISOString(),
                    version: '2.0.0'
                }
            };

            const result = await this.saveFileContent(fullData, 'Update inventory data');
            console.log('GitHub save successful', result?.commit?.sha);
            
            // Keep localStorage as backup for each data type
            if (data.products) localStorage.setItem('products', JSON.stringify(data.products));
            if (data.categories) localStorage.setItem('product_categories', JSON.stringify(data.categories));
            if (data.movements) localStorage.setItem('inventory_movements', JSON.stringify(data.movements));
            if (data.productionEntries) localStorage.setItem('production_entries', JSON.stringify(data.productionEntries));
            
            localStorage.setItem('lastSync', new Date().toISOString());
            
            return true;
        } catch (error) {
            console.error('Error saving data to GitHub:', error);
            throw error;
        }
    }

    // Legacy method for backward compatibility
    async loadInventory(): Promise<any[]> {
        const data = await this.loadAllData();
        return data.products || [];
    }

    // Legacy method for backward compatibility
    async saveInventory(inventory: any[]): Promise<boolean> {
        const currentData = await this.loadAllData();
        currentData.products = inventory;
        return this.saveAllData(currentData);
    }

    // Clear authentication
    clearAuthentication(): void {
        this.token = null;
        sessionStorage.removeItem('gh_token');
    }

    // Get repository info
    async getRepoInfo(): Promise<any> {
        try {
            const response = await fetch(
                `${this.apiBase}/repos/${this.owner}/${this.repo}`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`GitHub API error: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching repo info:', error);
            throw error;
        }
    }

    // Check rate limit
    async checkRateLimit(): Promise<any> {
        try {
            const response = await fetch(`${this.apiBase}/rate_limit`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (!response.ok) {
                throw new Error(`GitHub API error: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error checking rate limit:', error);
            throw error;
        }
    }
}

// Create singleton instance
const githubStorage = new GitHubStorage();
export default githubStorage;