// GitHub Storage Service for Data Management
class GitHubStorage {
    private owner: string = 'wissamyah';
    private repo: string = 'suprememanagement';
    private path: string = 'data/data.json';
    private branch: string = 'data';
    private token: string | null = null;
    private apiBase: string = 'https://api.github.com';
    private saveQueue: Promise<any> | null = null;
    private lastSaveTime: number = 0;
    private minSaveInterval: number = 2000; // Minimum 2 seconds between saves
    // private retryAttempts: Map<string, number> = new Map(); // Reserved for future use

    constructor() {
        // Initialize properties in constructor if needed
    }

    // Initialize with token
    async initialize(token: string): Promise<boolean> {
        this.token = token;
        // Store token securely in sessionStorage with encryption
        const encryptedToken = await this.encryptToken(token);
        sessionStorage.setItem('gh_token', encryptedToken);
        
        // Verify token validity
        const isValid = await this.verifyToken();
        if (!isValid) {
            throw new Error('Invalid GitHub token');
        }
        
        return true;
    }

    // Enhanced token encryption using browser's crypto API
    async encryptToken(token: string): Promise<string> {
        try {
            // Generate a random salt
            const salt = crypto.getRandomValues(new Uint8Array(16));
            const encoder = new TextEncoder();
            const data = encoder.encode(token);
            
            // Create a key from a fixed phrase (in production, use environment variable)
            const keyMaterial = await crypto.subtle.importKey(
                'raw',
                encoder.encode('supreme-mgmt-2024-secure-key-v2'),
                { name: 'PBKDF2' },
                false,
                ['deriveBits', 'deriveKey']
            );
            
            // Derive a key using PBKDF2
            const key = await crypto.subtle.deriveKey(
                {
                    name: 'PBKDF2',
                    salt,
                    iterations: 100000,
                    hash: 'SHA-256'
                },
                keyMaterial,
                { name: 'AES-GCM', length: 256 },
                false,
                ['encrypt']
            );
            
            // Encrypt the token
            const iv = crypto.getRandomValues(new Uint8Array(12));
            const encrypted = await crypto.subtle.encrypt(
                { name: 'AES-GCM', iv },
                key,
                data
            );
            
            // Combine salt, iv, and encrypted data
            const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
            combined.set(salt, 0);
            combined.set(iv, salt.length);
            combined.set(new Uint8Array(encrypted), salt.length + iv.length);
            
            // Convert to base64 for storage
            return btoa(String.fromCharCode(...combined));
        } catch (error) {
            console.error('Encryption failed, falling back to basic encoding:', error);
            // Fallback to basic encoding if crypto API is not available
            return btoa(token);
        }
    }

    // Decrypt token
    async decryptToken(encryptedToken: string): Promise<string | null> {
        try {
            // Convert from base64
            const combined = Uint8Array.from(atob(encryptedToken), c => c.charCodeAt(0));
            
            // Extract salt, iv, and encrypted data
            const salt = combined.slice(0, 16);
            const iv = combined.slice(16, 28);
            const encrypted = combined.slice(28);
            
            const encoder = new TextEncoder();
            
            // Recreate the key
            const keyMaterial = await crypto.subtle.importKey(
                'raw',
                encoder.encode('supreme-mgmt-2024-secure-key-v2'),
                { name: 'PBKDF2' },
                false,
                ['deriveBits', 'deriveKey']
            );
            
            const key = await crypto.subtle.deriveKey(
                {
                    name: 'PBKDF2',
                    salt,
                    iterations: 100000,
                    hash: 'SHA-256'
                },
                keyMaterial,
                { name: 'AES-GCM', length: 256 },
                false,
                ['decrypt']
            );
            
            // Decrypt the token
            const decrypted = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv },
                key,
                encrypted
            );
            
            const decoder = new TextDecoder();
            return decoder.decode(decrypted);
        } catch (error) {
            // Fallback for tokens encrypted with old method
            try {
                return atob(encryptedToken);
            } catch {
                return null;
            }
        }
    }

    // Check if currently authenticated (synchronous check)
    isAuthenticated(): boolean {
        return this.token !== null && sessionStorage.getItem('gh_token') !== null;
    }

    // Check if token exists and is valid
    async checkAuthentication(): Promise<boolean> {
        const encryptedToken = sessionStorage.getItem('gh_token');
        if (!encryptedToken) {
            return false;
        }

        this.token = await this.decryptToken(encryptedToken);
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
    async saveFileContent(data: any, message: string = 'Update data'): Promise<any> {
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
                
                // If it's a SHA mismatch, always retry with fresh SHA
                if (response.status === 409) {
                    console.log('Conflict detected (likely SHA mismatch), fetching fresh SHA...');
                    
                    // Wait a moment to avoid rapid API calls
                    await new Promise(resolve => setTimeout(resolve, 500));
                    
                    // Get fresh SHA
                    const freshData = await this.getFileContent();
                    const freshSha = freshData.sha;
                    
                    console.log('Retrying with fresh SHA:', freshSha);
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
                        console.log('Retry with fresh SHA successful!');
                        return await retryResponse.json();
                    }
                    
                    const retryError = await retryResponse.json();
                    console.error('Retry failed:', retryError);
                    
                    // If it's still a conflict, the file was likely modified externally
                    if (retryResponse.status === 409) {
                        throw new Error('File was modified externally. Please refresh and try again.');
                    }
                    
                    throw new Error(`GitHub API error after retry: ${retryError.message || retryResponse.status}`);
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
            ledgerEntries: [],
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

    // Clear all data - saves empty data structure to GitHub
    async clearAllData(): Promise<boolean> {
        if (!this.isAuthenticated()) {
            console.log('Not authenticated, skipping GitHub clear');
            return false;
        }

        try {
            // Create empty data structure
            const emptyData = {
                products: [],
                product_categories: [],
                inventory_movements: [],
                production_entries: [],
                customers: [],
                sales: []
            };

            // Save empty data to GitHub
            console.log('Clearing all data in GitHub...');
            const result = await this.saveAllData(emptyData);
            
            if (result) {
                console.log('Successfully cleared all data in GitHub');
            } else {
                console.error('Failed to clear data in GitHub');
            }
            
            return result;
        } catch (error) {
            console.error('Error clearing GitHub data:', error);
            return false;
        }
    }

    // Save all data with queue to prevent concurrent saves and rate limiting
    async saveAllData(data: any): Promise<boolean> {
        // Implement rate limiting
        const now = Date.now();
        const timeSinceLastSave = now - this.lastSaveTime;
        
        if (timeSinceLastSave < this.minSaveInterval) {
            const delay = this.minSaveInterval - timeSinceLastSave;
            console.log(`Rate limiting: waiting ${delay}ms before save`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        // If a save is already in progress, wait for it to complete
        if (this.saveQueue) {
            console.log('Save already in progress, waiting for it to complete...');
            try {
                await this.saveQueue;
            } catch (error) {
                console.log('Previous save failed, continuing with new save');
            }
        }

        // Create a new save promise with retry logic
        this.saveQueue = this._doSaveWithRetry(data);
        
        try {
            const result = await this.saveQueue;
            this.lastSaveTime = Date.now();
            return result;
        } finally {
            this.saveQueue = null;
        }
    }

    // Save with automatic retry on failure
    private async _doSaveWithRetry(data: any, attemptNumber: number = 1): Promise<boolean> {
        const maxRetries = 3;
        const retryDelay = 2000 * attemptNumber; // Exponential backoff
        
        try {
            return await this._doSave(data);
        } catch (error: any) {
            if (attemptNumber < maxRetries) {
                console.log(`Save attempt ${attemptNumber} failed, retrying in ${retryDelay}ms...`);
                await new Promise(resolve => setTimeout(resolve, retryDelay));
                return this._doSaveWithRetry(data, attemptNumber + 1);
            }
            console.error(`Save failed after ${maxRetries} attempts:`, error);
            throw error;
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

            const result = await this.saveFileContent(fullData, 'Update data');
            console.log('GitHub save successful', result?.commit?.sha);
            
            // Keep localStorage as backup for each data type
            if (data.products) localStorage.setItem('products', JSON.stringify(data.products));
            if (data.categories) localStorage.setItem('product_categories', JSON.stringify(data.categories));
            if (data.movements) localStorage.setItem('inventory_movements', JSON.stringify(data.movements));
            if (data.productionEntries) localStorage.setItem('production_entries', JSON.stringify(data.productionEntries));
            if (data.customers) localStorage.setItem('customers', JSON.stringify(data.customers));
            
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