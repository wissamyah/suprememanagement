import { useState, useContext } from 'react';
import { GlassCard } from '../components/ui/GlassCard';
import { Button } from '../components/ui/Button';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { ToastContainer } from '../components/ui/Toast';
import { 
  Trash2, 
  Database, 
  AlertTriangle,
  Download,
  TestTube,
  Shield,
  Code
} from 'lucide-react';
import { useToast } from '../hooks/useToast';
import { GitHubContext } from '../App';
import { generateTestData } from '../utils/testDataGenerator';
import { githubDataManager } from '../services/githubDataManager';

export const Settings = () => {
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showGenerateConfirm, setShowGenerateConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const { isAuthenticated } = useContext(GitHubContext);
  const { toasts, showSuccess, showError, showWarning, removeToast } = useToast();
  
  // Check if we're in development mode (localhost)
  const isDevelopment = window.location.hostname === 'localhost' || 
                        window.location.hostname === '127.0.0.1';

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

  const handleGenerateTestData = async () => {
    setIsGenerating(true);
    
    try {
      if (!isAuthenticated) {
        showError('You must be authenticated to generate test data');
        setIsGenerating(false);
        setShowGenerateConfirm(false);
        return;
      }
      
      const testData = generateTestData();
      
      console.log('Generated test data:', {
        products: testData.products.length,
        customers: testData.customers.length,
        sales: testData.sales.length,
        ledgerEntries: testData.ledgerEntries.length,
        bookedStock: testData.bookedStock.length,
        loadings: testData.loadings?.length || 0
      });
      
      // Save test data directly to GitHub
      await githubDataManager.updateData('products', testData.products, true);
      await githubDataManager.updateData('customers', testData.customers, true);
      await githubDataManager.updateData('sales', testData.sales, true);
      await githubDataManager.updateData('movements', testData.movements, true);
      await githubDataManager.updateData('categories', testData.categories, true);
      await githubDataManager.updateData('ledgerEntries', testData.ledgerEntries, true);
      await githubDataManager.updateData('bookedStock', testData.bookedStock, true);
      await githubDataManager.updateData('loadings', testData.loadings || [], true);
      
      showSuccess(`Generated test data: ${testData.products.length} products, ${testData.customers.length} customers, ${testData.sales.length} sales, ${testData.ledgerEntries.length} ledger entries, ${testData.bookedStock.length} bookings, ${testData.loadings?.length || 0} loadings`);
      
      setIsGenerating(false);
      
    } catch (error) {
      console.error('Error generating test data:', error);
      showError('Failed to generate test data');
      setIsGenerating(false);
    }
    
    setShowGenerateConfirm(false);
  };

  const handleExportAllData = async () => {
    try {
      // Get all data from GitHub
      const allData = {
        products: githubDataManager.getData('products'),
        categories: githubDataManager.getData('categories'),
        movements: githubDataManager.getData('movements'),
        productionEntries: githubDataManager.getData('productionEntries'),
        customers: githubDataManager.getData('customers'),
        sales: githubDataManager.getData('sales'),
        ledgerEntries: githubDataManager.getData('ledgerEntries'),
        bookedStock: githubDataManager.getData('bookedStock'),
        loadings: githubDataManager.getData('loadings')
      };
      
      // Create and download JSON file
      const dataStr = JSON.stringify(allData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      const exportFileDefaultName = `supreme_backup_${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      showSuccess('Data exported successfully');
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

      {/* Development Tools Section - Only show in development */}
      {isDevelopment && (
        <GlassCard>
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <Code className="text-purple-400" size={24} />
              <h2 className="text-xl font-semibold">Development Tools</h2>
              <span className="px-2 py-1 text-xs bg-purple-500/20 text-purple-400 rounded-full">
                Dev Mode
              </span>
            </div>

            {/* Test Data Generator */}
            <div className="p-4 glass rounded-lg">
              <div className="flex items-start gap-3">
                <TestTube className="text-yellow-400 mt-1" size={20} />
                <div className="flex-1">
                  <h3 className="font-medium mb-1">Generate Test Data</h3>
                  <p className="text-sm text-muted mb-3">
                    Quickly populate your database with sample data for testing. This will create products, customers, sales, complete ledger entries with various transaction types (advance payments, sales, payments, credit notes, adjustments), booked stock, and loadings using realistic Nigerian data.
                  </p>
                  <Button 
                    variant="primary" 
                    onClick={() => setShowGenerateConfirm(true)}
                    disabled={isGenerating}
                    loading={isGenerating}
                    loadingText="Generating..."
                  >
                    <TestTube size={16} />
                    Generate Test Data
                  </Button>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="p-4 glass rounded-lg">
              <h3 className="font-medium mb-3">Quick Console Commands</h3>
              <div className="space-y-2 font-mono text-xs">
                <div className="p-2 bg-black/30 rounded">
                  <span className="text-green-400">// Clear all data</span><br/>
                  githubDataManager.clearAllData()
                </div>
                <div className="p-2 bg-black/30 rounded">
                  <span className="text-green-400">// Get all data</span><br/>
                  githubDataManager.getAllData()
                </div>
                <div className="p-2 bg-black/30 rounded">
                  <span className="text-green-400">// Force sync</span><br/>
                  githubDataManager.forceSync()
                </div>
              </div>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Security Note */}
      <GlassCard>
        <div className="flex items-start gap-3">
          <Shield className="text-blue-400 mt-1" size={20} />
          <div>
            <h3 className="font-medium mb-1">Data Security</h3>
            <p className="text-sm text-muted">
              Your data is stored locally in your browser and optionally synced to your private GitHub repository. 
              No data is sent to external servers. Always backup your data before performing reset operations.
            </p>
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

      {/* Generate Test Data Confirmation Modal */}
      <ConfirmModal
        isOpen={showGenerateConfirm}
        onClose={() => setShowGenerateConfirm(false)}
        onConfirm={handleGenerateTestData}
        title="Generate Test Data"
        message="This will replace your existing data with sample test data. Your current data will be lost unless you've made a backup. Continue?"
        confirmText="Generate Test Data"
      />

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
};