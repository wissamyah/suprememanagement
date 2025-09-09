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

export const Settings = () => {
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importData, setImportData] = useState<any>(null);
  const [importSummary, setImportSummary] = useState<string>('');
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

  const validateImportedData = (data: any): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    // Check if it's an object
    if (typeof data !== 'object' || data === null) {
      errors.push('Invalid data format: expected an object');
      return { isValid: false, errors };
    }
    
    // Define allowed keys
    const allowedKeys = ['products', 'categories', 'movements', 'productionEntries', 
                         'customers', 'sales', 'ledgerEntries', 'bookedStock', 
                         'loadings', 'suppliers', 'paddyTrucks', 'metadata'];
    
    // Check for unknown keys
    const dataKeys = Object.keys(data);
    const unknownKeys = dataKeys.filter(key => !allowedKeys.includes(key));
    if (unknownKeys.length > 0) {
      errors.push(`Unknown data types: ${unknownKeys.join(', ')}`);
    }
    
    // Validate arrays
    const arrayFields = allowedKeys.filter(key => key !== 'metadata');
    arrayFields.forEach(field => {
      if (data[field] && !Array.isArray(data[field])) {
        errors.push(`${field} must be an array`);
      }
    });
    
    // Validate required fields for each data type
    if (data.products && Array.isArray(data.products)) {
      data.products.forEach((product: any, index: number) => {
        if (!product.id) errors.push(`Product at index ${index} missing 'id'`);
        if (!product.name) errors.push(`Product at index ${index} missing 'name'`);
      });
    }
    
    if (data.customers && Array.isArray(data.customers)) {
      data.customers.forEach((customer: any, index: number) => {
        if (!customer.id) errors.push(`Customer at index ${index} missing 'id'`);
        if (!customer.name) errors.push(`Customer at index ${index} missing 'name'`);
      });
    }
    
    if (data.sales && Array.isArray(data.sales)) {
      data.sales.forEach((sale: any, index: number) => {
        if (!sale.id) errors.push(`Sale at index ${index} missing 'id'`);
        if (!sale.customerId) errors.push(`Sale at index ${index} missing 'customerId'`);
        if (!sale.items || !Array.isArray(sale.items)) {
          errors.push(`Sale at index ${index} missing or invalid 'items' array`);
        }
      });
    }
    
    return { isValid: errors.length === 0, errors };
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
      const text = await file.text();
      const data = JSON.parse(text);
      
      // Validate the data
      const validation = validateImportedData(data);
      
      if (!validation.isValid) {
        showError(`Invalid data format: ${validation.errors[0]}`);
        if (validation.errors.length > 1) {
          console.error('All validation errors:', validation.errors);
        }
        setIsImporting(false);
        return;
      }
      
      // Create summary
      const summary = `
        • Products: ${data.products?.length || 0}
        • Categories: ${data.categories?.length || 0}
        • Customers: ${data.customers?.length || 0}
        • Sales: ${data.sales?.length || 0}
        • Inventory Movements: ${data.movements?.length || 0}
        • Production Entries: ${data.productionEntries?.length || 0}
        • Ledger Entries: ${data.ledgerEntries?.length || 0}
        • Booked Stock: ${data.bookedStock?.length || 0}
        • Loadings: ${data.loadings?.length || 0}
        • Suppliers: ${data.suppliers?.length || 0}
        • Paddy Trucks: ${data.paddyTrucks?.length || 0}
      `.trim();
      
      setImportData(data);
      setImportSummary(summary);
      setShowImportConfirm(true);
    } catch (error) {
      console.error('Error reading file:', error);
      showError('Failed to read file. Please ensure it is a valid JSON file.');
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
      
      showWarning('Importing data...');
      
      // Use batch update for better performance
      githubDataManager.startBatchUpdate();
      
      // Update each data type if present
      if (importData.products) await githubDataManager.updateData('products', importData.products, true);
      if (importData.categories) await githubDataManager.updateData('categories', importData.categories, true);
      if (importData.customers) await githubDataManager.updateData('customers', importData.customers, true);
      if (importData.sales) await githubDataManager.updateData('sales', importData.sales, true);
      if (importData.movements) await githubDataManager.updateData('movements', importData.movements, true);
      if (importData.productionEntries) await githubDataManager.updateData('productionEntries', importData.productionEntries, true);
      if (importData.ledgerEntries) await githubDataManager.updateData('ledgerEntries', importData.ledgerEntries, true);
      if (importData.bookedStock) await githubDataManager.updateData('bookedStock', importData.bookedStock, true);
      if (importData.loadings) await githubDataManager.updateData('loadings', importData.loadings, true);
      if (importData.suppliers) await githubDataManager.updateData('suppliers', importData.suppliers, true);
      if (importData.paddyTrucks) await githubDataManager.updateData('paddyTrucks', importData.paddyTrucks, true);
      
      // End batch update
      await githubDataManager.endBatchUpdate();
      
      showSuccess('Data imported successfully!');
      
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
        }}
        onConfirm={handleImportData}
        title="Import Data"
        message={
          <div>
            <p className="mb-4">This will replace all your existing data with the imported data. Make sure you have backed up your current data if needed.</p>
            <div className="p-3 bg-black/30 rounded-lg text-sm font-mono">
              <p className="font-semibold mb-2">Data to import:</p>
              <pre className="whitespace-pre-wrap">{importSummary}</pre>
            </div>
          </div>
        }
        confirmText="Import Data"
      />

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
};