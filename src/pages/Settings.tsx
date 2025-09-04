import { useState } from 'react';
import { GlassCard } from '../components/ui/GlassCard';
import { Button } from '../components/ui/Button';
import { useData } from '../contexts/DataContext';
import { useToast } from '../hooks/useToast';
import { ToastContainer } from '../components/ui/Toast';
import { 
  Save, 
  Github, 
  Database, 
  Download, 
  Upload, 
  Trash2,
  Cloud,
  HardDrive,
  Check,
  X
} from 'lucide-react';

export const Settings = () => {
  const { 
    githubConfigured, 
    configureGitHub, 
    toggleGitHub, 
    exportAllData, 
    importAllData,
    clearAllData,
    saveData,
    isSaving,
    lastSaved
  } = useData();
  
  const { toasts, showSuccess, showError, showWarning, removeToast } = useToast();
  
  const [githubSettings, setGithubSettings] = useState({
    token: '',
    owner: '',
    repo: '',
    path: 'data/database.json'
  });
  
  const [useGitHubStorage, setUseGitHubStorage] = useState(false);
  const [showToken, setShowToken] = useState(false);

  const handleGitHubConfig = () => {
    if (!githubSettings.token || !githubSettings.owner || !githubSettings.repo) {
      showError('Please fill in all GitHub configuration fields');
      return;
    }
    
    configureGitHub(
      githubSettings.token,
      githubSettings.owner,
      githubSettings.repo,
      githubSettings.path
    );
    
    showSuccess('GitHub configuration saved successfully');
  };

  const handleToggleStorage = (useGitHub: boolean) => {
    setUseGitHubStorage(useGitHub);
    toggleGitHub(useGitHub);
    showSuccess(`Switched to ${useGitHub ? 'GitHub' : 'Local'} storage`);
  };

  const handleExport = async () => {
    try {
      const data = await exportAllData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `supreme_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showSuccess('Data exported successfully');
    } catch (error) {
      showError('Failed to export data');
    }
  };

  const handleImport = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      try {
        const text = await file.text();
        const success = await importAllData(text);
        if (success) {
          showSuccess('Data imported successfully');
          window.location.reload(); // Reload to reflect new data
        } else {
          showError('Failed to import data. Please check the file format.');
        }
      } catch (error) {
        showError('Error reading file');
      }
    };
    input.click();
  };

  const handleClearData = async () => {
    if (!confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
      return;
    }
    
    if (!confirm('This will DELETE ALL YOUR DATA. Are you absolutely sure?')) {
      return;
    }
    
    try {
      await clearAllData();
      showSuccess('All data cleared successfully');
      window.location.reload();
    } catch (error) {
      showError('Failed to clear data');
    }
  };

  const handleManualSave = async () => {
    const success = await saveData();
    if (success) {
      showSuccess('Data saved successfully');
    } else {
      showError('Failed to save data');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-muted">Configure data storage and application settings</p>
      </div>

      {/* Storage Status */}
      <GlassCard>
        <h2 className="text-xl font-semibold mb-4">Storage Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 glass rounded-lg ${!useGitHubStorage ? 'bg-green-500/20' : ''}`}>
              <HardDrive size={24} className={!useGitHubStorage ? 'text-green-400' : 'text-gray-400'} />
            </div>
            <div>
              <p className="font-medium">Local Storage</p>
              <p className="text-sm text-muted">
                {!useGitHubStorage ? 'Currently Active' : 'Available'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className={`p-3 glass rounded-lg ${useGitHubStorage ? 'bg-green-500/20' : ''}`}>
              <Cloud size={24} className={useGitHubStorage ? 'text-green-400' : 'text-gray-400'} />
            </div>
            <div>
              <p className="font-medium">GitHub Storage</p>
              <p className="text-sm text-muted">
                {githubConfigured 
                  ? (useGitHubStorage ? 'Currently Active' : 'Configured')
                  : 'Not Configured'}
              </p>
            </div>
          </div>
        </div>
        
        {lastSaved && (
          <div className="mt-4 p-3 glass rounded-lg">
            <p className="text-sm text-muted">
              Last saved: {lastSaved.toLocaleString()}
            </p>
          </div>
        )}
        
        <div className="mt-4">
          <Button 
            variant="primary" 
            onClick={handleManualSave}
            disabled={isSaving}
          >
            <Save size={20} />
            {isSaving ? 'Saving...' : 'Save Now'}
          </Button>
        </div>
      </GlassCard>

      {/* GitHub Configuration */}
      <GlassCard>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Github size={24} />
          GitHub Configuration
        </h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Personal Access Token</label>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                value={githubSettings.token}
                onChange={(e) => setGithubSettings({ ...githubSettings, token: e.target.value })}
                className="w-full px-4 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20 pr-12"
                placeholder="ghp_xxxxxxxxxxxx"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-200"
              >
                {showToken ? <X size={20} /> : <Check size={20} />}
              </button>
            </div>
            <p className="text-xs text-muted mt-1">
              Create a token at GitHub Settings → Developer settings → Personal access tokens
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Repository Owner</label>
              <input
                type="text"
                value={githubSettings.owner}
                onChange={(e) => setGithubSettings({ ...githubSettings, owner: e.target.value })}
                className="w-full px-4 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20"
                placeholder="username"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Repository Name</label>
              <input
                type="text"
                value={githubSettings.repo}
                onChange={(e) => setGithubSettings({ ...githubSettings, repo: e.target.value })}
                className="w-full px-4 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20"
                placeholder="suprememanagement-data"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">File Path</label>
            <input
              type="text"
              value={githubSettings.path}
              onChange={(e) => setGithubSettings({ ...githubSettings, path: e.target.value })}
              className="w-full px-4 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20"
              placeholder="data/database.json"
            />
          </div>
          
          <div className="flex gap-3">
            <Button variant="primary" onClick={handleGitHubConfig}>
              Save Configuration
            </Button>
            
            {githubConfigured && (
              <Button 
                variant={useGitHubStorage ? 'secondary' : 'primary'}
                onClick={() => handleToggleStorage(!useGitHubStorage)}
              >
                {useGitHubStorage ? 'Switch to Local' : 'Switch to GitHub'}
              </Button>
            )}
          </div>
        </div>
      </GlassCard>

      {/* Data Management */}
      <GlassCard>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Database size={24} />
          Data Management
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass p-4 rounded-lg">
            <h3 className="font-medium mb-2 flex items-center gap-2">
              <Download size={20} />
              Export Data
            </h3>
            <p className="text-sm text-muted mb-3">
              Download all your data as a JSON file
            </p>
            <Button variant="secondary" onClick={handleExport} className="w-full">
              Export
            </Button>
          </div>
          
          <div className="glass p-4 rounded-lg">
            <h3 className="font-medium mb-2 flex items-center gap-2">
              <Upload size={20} />
              Import Data
            </h3>
            <p className="text-sm text-muted mb-3">
              Restore data from a JSON backup file
            </p>
            <Button variant="secondary" onClick={handleImport} className="w-full">
              Import
            </Button>
          </div>
          
          <div className="glass p-4 rounded-lg border border-red-500/20">
            <h3 className="font-medium mb-2 flex items-center gap-2 text-red-400">
              <Trash2 size={20} />
              Clear All Data
            </h3>
            <p className="text-sm text-muted mb-3">
              Permanently delete all application data
            </p>
            <Button 
              variant="danger" 
              onClick={handleClearData} 
              className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-400"
            >
              Clear Data
            </Button>
          </div>
        </div>
      </GlassCard>

      {/* Instructions */}
      <GlassCard>
        <h2 className="text-xl font-semibold mb-4">GitHub Setup Instructions</h2>
        <ol className="space-y-3 text-sm">
          <li className="flex gap-2">
            <span className="text-muted">1.</span>
            <div>
              <p>Create a new GitHub repository for your data (e.g., "suprememanagement-data")</p>
            </div>
          </li>
          <li className="flex gap-2">
            <span className="text-muted">2.</span>
            <div>
              <p>Generate a Personal Access Token:</p>
              <ul className="list-disc list-inside text-muted mt-1 ml-4">
                <li>Go to GitHub Settings → Developer settings → Personal access tokens</li>
                <li>Click "Generate new token (classic)"</li>
                <li>Select "repo" scope for full repository access</li>
                <li>Copy the generated token</li>
              </ul>
            </div>
          </li>
          <li className="flex gap-2">
            <span className="text-muted">3.</span>
            <div>
              <p>Enter your configuration above and save</p>
            </div>
          </li>
          <li className="flex gap-2">
            <span className="text-muted">4.</span>
            <div>
              <p>Click "Switch to GitHub" to start using GitHub storage</p>
            </div>
          </li>
        </ol>
      </GlassCard>
      
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
};