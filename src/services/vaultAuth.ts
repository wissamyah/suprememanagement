// Vault-based authentication service
// Encrypts GitHub token with user password and stores in GitHub repo

interface VaultData {
  encrypted: string;
  salt: string;
  iv: string;
  version: string;
}

class VaultAuthService {
  private readonly VAULT_BRANCH = 'supreme-vault';
  private readonly VAULT_PATH = 'vault/auth.json';
  private readonly ITERATIONS = 100000;
  
  // Check if vault exists
  async checkVaultExists(token: string): Promise<boolean> {
    try {
      const response = await fetch(
        `https://api.github.com/repos/wissamyah/suprememanagement/contents/${this.VAULT_PATH}?ref=${this.VAULT_BRANCH}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      );
      return response.ok;
    } catch {
      return false;
    }
  }
  
  // Derive encryption key from password
  private async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: this.ITERATIONS,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }
  
  // Setup vault with encrypted token
  async setupVault(token: string, password: string): Promise<void> {
    console.log('[VaultAuth] Starting vault setup');
    
    // Generate crypto materials
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Derive key and encrypt
    const key = await this.deriveKey(password, salt);
    const encoder = new TextEncoder();
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoder.encode(token)
    );
    
    // Prepare vault data
    const vaultData: VaultData = {
      encrypted: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
      salt: btoa(String.fromCharCode(...salt)),
      iv: btoa(String.fromCharCode(...iv)),
      version: '1.0'
    };
    
    // IMPORTANT: Store vault locally FIRST before trying GitHub
    console.log('[VaultAuth] Saving vault to localStorage');
    localStorage.setItem('supreme_vault_cache', JSON.stringify(vaultData));
    localStorage.setItem('supreme_vault_setup', 'true');
    
    // Check if branch exists
    const branchResponse = await fetch(
      `https://api.github.com/repos/wissamyah/suprememanagement/branches/${this.VAULT_BRANCH}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );
    
    if (!branchResponse.ok) {
      // Create branch from main
      const mainRef = await fetch(
        'https://api.github.com/repos/wissamyah/suprememanagement/git/refs/heads/main',
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      ).then(r => r.json());
      
      await fetch(
        'https://api.github.com/repos/wissamyah/suprememanagement/git/refs',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ref: `refs/heads/${this.VAULT_BRANCH}`,
            sha: mainRef.object.sha
          })
        }
      );
    }
    
    // Check if file exists
    const fileResponse = await fetch(
      `https://api.github.com/repos/wissamyah/suprememanagement/contents/${this.VAULT_PATH}?ref=${this.VAULT_BRANCH}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );
    
    let sha: string | undefined;
    if (fileResponse.ok) {
      const existing = await fileResponse.json();
      sha = existing.sha;
    }
    
    // Save vault data
    const body: any = {
      message: 'Update vault',
      content: btoa(JSON.stringify(vaultData, null, 2)),
      branch: this.VAULT_BRANCH
    };
    
    if (sha) {
      body.sha = sha;
    }
    
    const saveResponse = await fetch(
      `https://api.github.com/repos/wissamyah/suprememanagement/contents/${this.VAULT_PATH}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      }
    );
    
    if (!saveResponse.ok) {
      console.warn('[VaultAuth] Failed to save vault to GitHub, but local copy is saved');
      // Don't throw error since we have local copy
    } else {
      console.log('[VaultAuth] Vault successfully saved to GitHub');
    }
  }
  
  // Login with password
  async loginWithPassword(password: string): Promise<string> {
    let vaultData: VaultData;
    
    // First, check if we have a local copy of the vault
    const localVault = localStorage.getItem('supreme_vault_cache');
    
    if (!localVault) {
      console.log('[VaultAuth] No local vault, trying to fetch from GitHub');
      
      // Try to fetch from GitHub (works for public repos)
      try {
        const vaultResponse = await fetch(
          `https://api.github.com/repos/wissamyah/suprememanagement/contents/${this.VAULT_PATH}?ref=${this.VAULT_BRANCH}`
        );
        
        if (vaultResponse.ok) {
          const vaultFile = await vaultResponse.json();
          vaultData = JSON.parse(atob(vaultFile.content));
          
          // Cache locally for future use
          localStorage.setItem('supreme_vault_cache', JSON.stringify(vaultData));
          localStorage.setItem('supreme_vault_setup', 'true');
          console.log('[VaultAuth] Vault synced from GitHub successfully');
        } else {
          throw new Error('Cannot access vault. For private repos, use "Skip and use token directly" first to sync, then setup password.');
        }
      } catch (error) {
        throw new Error('Cannot access vault. For private repos, use "Skip and use token directly" first to sync, then setup password.');
      }
    } else {
      // Use local cached vault
      console.log('[VaultAuth] Using local vault cache');
      vaultData = JSON.parse(localVault);
    }
    
    // Decode crypto materials
    const salt = new Uint8Array(atob(vaultData.salt).split('').map(c => c.charCodeAt(0)));
    const iv = new Uint8Array(atob(vaultData.iv).split('').map(c => c.charCodeAt(0)));
    const encrypted = new Uint8Array(atob(vaultData.encrypted).split('').map(c => c.charCodeAt(0)));
    
    // Derive key and decrypt
    const key = await this.deriveKey(password, salt);
    
    try {
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        encrypted
      );
      
      const token = new TextDecoder().decode(decrypted);
      
      // Verify token is valid
      const verifyResponse = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      
      if (!verifyResponse.ok) {
        throw new Error('Decrypted token is invalid');
      }
      
      return token;
    } catch (error) {
      throw new Error('Invalid password');
    }
  }
  
  // Check if vault is setup
  isVaultSetup(): boolean {
    return localStorage.getItem('supreme_vault_setup') === 'true';
  }
  
  // For private repos, we need token to check/create vault
  // This is used during initial setup only
  async initializeVaultForPrivateRepo(token: string, password: string): Promise<void> {
    console.log('[VaultAuth] Initializing vault for private repo');
    
    // Always setup vault locally regardless of GitHub status
    await this.setupVault(token, password);
    
    // The setupVault method already handles both local and GitHub storage
    console.log('[VaultAuth] Vault initialization complete');
  }
  
  // Clear vault setup (for reset)
  clearVaultSetup(): void {
    localStorage.removeItem('supreme_vault_setup');
    localStorage.removeItem('supreme_vault_cache');
  }
  
  // Sync vault from GitHub (requires token)
  async syncVault(token: string): Promise<void> {
    try {
      const vaultResponse = await fetch(
        `https://api.github.com/repos/wissamyah/suprememanagement/contents/${this.VAULT_PATH}?ref=${this.VAULT_BRANCH}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      );
      
      if (vaultResponse.ok) {
        const vaultFile = await vaultResponse.json();
        const vaultData: VaultData = JSON.parse(atob(vaultFile.content));
        localStorage.setItem('supreme_vault_cache', JSON.stringify(vaultData));
      }
    } catch (error) {
      console.error('Failed to sync vault:', error);
    }
  }
}

export const vaultAuth = new VaultAuthService();