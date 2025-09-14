import { useState, useContext, useRef } from 'react';
import { GlassCard } from '../components/ui/GlassCard';
import { Button } from '../components/ui/Button';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { ToastContainer } from '../components/ui/Toast';
import {
  Trash2,
  Database,
  AlertTriangle,
  Download,
  Upload,
  Shield,
  FileJson
} from 'lucide-react';
import { useToast } from '../hooks/useToast';
import { GitHubContext } from '../App';
import { githubDataManager } from '../services/githubDataManager';
import {
  createBackup,
  exportBackup,
  readBackupFile,
  restoreBackup,
  validateBackup,
  getBackupSummary,
  type RestoreOptions
} from '../utils/backup';

export const Settings = () => {
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importData, setImportData] = useState<any>(null);
  const [importSummary, setImportSummary] = useState<string>('');
  const [restoreMode, setRestoreMode] = useState<'replace' | 'merge' | 'append'>('replace');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { isAuthenticated } = useContext(GitHubContext);
  const { toasts, showSuccess, showError, showWarning, removeToast } = useToast();

  const handleResetData = async () => {
    setIsResetting(true);
    
    try {
      // Clear all data in GitHub
      if (isAuthenticated) {
        showWarning('Clearing all data...');
        await githubDataManager.clearAllData();
        showSuccess('All data has been reset successfully');
      } else {
        showError('You must be authenticated to reset data');
      }
    } catch (error) {
      console.error('Error resetting data:', error);
      showError('Failed to reset data');
    } finally {
      setIsResetting(false);
      setShowResetConfirm(false);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      showError('Please select a JSON file');
      return;
    }

    setIsImporting(true);

    try {
      // Read the backup file
      const backupData = await readBackupFile(file);

      // Validate the backup
      const validation = validateBackup(backupData);

      if (!validation.valid) {
        showError(`Invalid backup format: ${validation.errors[0]}`);
        if (validation.errors.length > 1) {
          console.error('All validation errors:', validation.errors);
        }
        setIsImporting(false);
        return;
      }

      // Create summary
      const summary = getBackupSummary(backupData);

      setImportData(backupData);
      setImportSummary(summary);
      setShowImportConfirm(true);
    } catch (error) {
      console.error('Error reading file:', error);
      showError('Failed to read file. Please ensure it is a valid backup file.');
    } finally {
      setIsImporting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  const handleImportData = async () => {
    if (!importData) return;

    setIsImporting(true);

    try {
      if (!isAuthenticated) {
        showError('You must be authenticated to import data');
        setIsImporting(false);
        setShowImportConfirm(false);
        return;
      }

      showWarning('Restoring backup...');

      // Use the new restore utility with selected mode
      const restoreOptions: RestoreOptions = {
        mode: restoreMode, // Use the selected restore mode
        preserveRelationships: true,
        validateIntegrity: true
      };

      const result = await restoreBackup(importData, restoreOptions);

      if (result.success) {
        const totalRecords = Object.values(result.recordCounts).reduce((sum, count) => sum + count, 0);
        showSuccess(`Backup restored successfully! ${totalRecords} records imported.`);

        // Show any warnings
        result.warnings.forEach(warning => showWarning(warning));
      } else {
        showError('Failed to restore backup');
        result.errors.forEach(error => console.error(error));
      }

      // Clear import data
      setImportData(null);
      setImportSummary('');
    } catch (error) {
      console.error('Error importing data:', error);
      showError('Failed to import data');
    } finally {
      setIsImporting(false);
      setShowImportConfirm(false);
    }
  };

  const handleExportAllData = async () => {
    try {
      // Create a complete backup using the new utility
      const backup = createBackup();

      // Export the backup to file
      exportBackup(backup);

      showSuccess(`Complete backup exported (${backup.metadata.totalRecords} total records)`);
    } catch (error) {
      console.error('Error exporting data:', error);
      showError('Failed to export data');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-muted">Manage your application settings and data</p>
      </div>

      {/* Data Management Section */}
      <GlassCard>
        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-4">
            <Database className="text-blue-400" size={24} />
            <h2 className="text-xl font-semibold">Data Management</h2>
          </div>

          {/* Backup Section */}
          <div className="p-4 glass rounded-lg">
            <div className="flex items-start gap-3">
              <Download className="text-green-400 mt-1" size={20} />
              <div className="flex-1">
                <h3 className="font-medium mb-1">Backup Data</h3>
                <p className="text-sm text-muted mb-3">
                  Export all your data to a JSON file for backup purposes
                </p>
                <Button variant="secondary" onClick={() => handleExportAllData()}>
                  <Download size={16} />
                  Export All Data
                </Button>
              </div>
            </div>
          </div>

          {/* Import Section */}
          <div className="p-4 glass rounded-lg">
            <div className="flex items-start gap-3">
              <Upload className="text-blue-400 mt-1" size={20} />
              <div className="flex-1">
                <h3 className="font-medium mb-1">Import Data</h3>
                <p className="text-sm text-muted mb-3">
                  Import data from a previously exported JSON file. This will replace all existing data.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="import-file-input"
                />
                <Button 
                  variant="primary" 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isImporting}
                  loading={isImporting}
                >
                  <FileJson size={16} />
                  Import Data from JSON
                </Button>
              </div>
            </div>
          </div>

          {/* Reset Data Section */}
          <div className="p-4 glass rounded-lg border border-red-500/20">
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-red-400 mt-1" size={20} />
              <div className="flex-1">
                <h3 className="font-medium mb-1 text-red-400">Reset All Data</h3>
                <p className="text-sm text-muted mb-3">
                  This will permanently delete all your local data including products, customers, sales, inventory movements, booked stock, and loadings.
                  {isAuthenticated && " GitHub data will remain unchanged until next sync."}
                </p>
                <Button 
                  variant="danger" 
                  onClick={() => setShowResetConfirm(true)}
                  disabled={isResetting}
                  loading={isResetting}
                >
                  <Trash2 size={16} />
                  Reset All Data
                </Button>
              </div>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* GitHub Direct Mode Status */}
      <GlassCard>
        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-4">
            <Database className="text-green-400" size={24} />
            <h2 className="text-xl font-semibold">Data Storage Mode</h2>
            <span className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded-full">
              GitHub Direct
            </span>
          </div>

          <div className="p-4 glass rounded-lg">
            <div className="flex items-start gap-3">
              <Shield className="text-blue-400 mt-1" size={20} />
              <div className="flex-1">
                <h3 className="font-medium mb-1">GitHub Direct Mode</h3>
                <p className="text-sm text-muted mb-3">
                  Your app now uses GitHub as the primary data store. This eliminates multi-device sync issues
                  and ensures all your devices always have the same data.
                </p>
                
                <div className="mt-3 p-2 bg-green-500/10 rounded text-xs text-green-400">
                  ✓ GitHub Direct mode is permanently active. All data operations go directly to GitHub.
                </div>
                
                <div className="mt-3 p-2 bg-blue-500/10 rounded text-xs text-blue-400">
                  ℹ️ Requires internet connection for write operations. Data is cached for fast reads.
                </div>
              </div>
            </div>
          </div>
        </div>
      </GlassCard>


      {/* Reset Confirmation Modal */}
      <ConfirmModal
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={handleResetData}
        title="Reset All Data"
        message="Are you absolutely sure you want to delete all your local data? This action cannot be undone. Please make sure you have exported a backup if needed."
        confirmText="Yes, Reset Everything"
      />

      {/* Import Data Confirmation Modal */}
      <ConfirmModal
        isOpen={showImportConfirm}
        onClose={() => {
          setShowImportConfirm(false);
          setImportData(null);
          setImportSummary('');
          setRestoreMode('replace');
        }}
        onConfirm={handleImportData}
        title="Restore Backup"
        message={
          <div>
            <div className="mb-4">
              <p className="mb-3">Choose how to restore your backup:</p>
              <div className="space-y-2">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="restoreMode"
                    value="replace"
                    checked={restoreMode === 'replace'}
                    onChange={() => setRestoreMode('replace')}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium">Replace All</div>
                    <div className="text-xs text-muted">Delete existing data and replace with backup</div>
                  </div>
                </label>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="restoreMode"
                    value="merge"
                    checked={restoreMode === 'merge'}
                    onChange={() => setRestoreMode('merge')}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium">Merge</div>
                    <div className="text-xs text-muted">Update existing records and add new ones</div>
                  </div>
                </label>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="restoreMode"
                    value="append"
                    checked={restoreMode === 'append'}
                    onChange={() => setRestoreMode('append')}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium">Append Only</div>
                    <div className="text-xs text-muted">Add only new records, skip existing ones</div>
                  </div>
                </label>
              </div>
            </div>
            <div className="p-3 bg-black/30 rounded-lg text-sm font-mono">
              <p className="font-semibold mb-2">Backup Summary:</p>
              <pre className="whitespace-pre-wrap text-xs">{importSummary}</pre>
            </div>
          </div>
        }
        confirmText="Restore Backup"
      />

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
};