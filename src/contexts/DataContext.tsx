import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import dataService from '../services/dataService';

interface DataContextValue {
  isLoading: boolean;
  lastSaved: Date | null;
  isSaving: boolean;
  githubConfigured: boolean;
  
  // Data operations
  getData: (path: string) => any;
  setData: (path: string, value: any) => void;
  saveData: () => Promise<boolean>;
  
  // Configuration
  configureGitHub: (token: string, owner: string, repo: string, path: string) => void;
  toggleGitHub: (enabled: boolean) => void;
  
  // Import/Export
  exportAllData: () => Promise<string>;
  importAllData: (jsonString: string) => Promise<boolean>;
  clearAllData: () => Promise<void>;
}

const DataContext = createContext<DataContextValue | undefined>(undefined);

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

interface DataProviderProps {
  children: ReactNode;
}

export const DataProvider = ({ children }: DataProviderProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [githubConfigured, setGithubConfigured] = useState(false);

  useEffect(() => {
    // Load initial data
    const loadInitialData = async () => {
      setIsLoading(true);
      await dataService.load();
      setGithubConfigured(dataService.isGitHubConfigured());
      setIsLoading(false);
    };
    
    loadInitialData();

    // Set up autosave listener
    const autosaveInterval = setInterval(() => {
      const lastUpdated = dataService.getData('lastUpdated');
      if (lastUpdated) {
        setLastSaved(new Date(lastUpdated));
      }
    }, 5000); // Check every 5 seconds

    return () => {
      clearInterval(autosaveInterval);
      dataService.stopAutosave();
    };
  }, []);

  const getData = (path: string) => {
    return dataService.getData(path);
  };

  const setData = (path: string, value: any) => {
    dataService.setData(path, value);
    // Trigger re-render if needed
    setLastSaved(new Date());
  };

  const saveData = async (): Promise<boolean> => {
    setIsSaving(true);
    const success = await dataService.save();
    setIsSaving(false);
    if (success) {
      setLastSaved(new Date());
    }
    return success;
  };

  const configureGitHub = (token: string, owner: string, repo: string, path: string) => {
    dataService.updateConfig({
      githubToken: token,
      githubOwner: owner,
      githubRepo: repo,
      githubPath: path,
      useGitHub: true
    });
    setGithubConfigured(true);
  };

  const toggleGitHub = (enabled: boolean) => {
    dataService.updateConfig({ useGitHub: enabled });
  };

  const exportAllData = async (): Promise<string> => {
    return await dataService.exportData();
  };

  const importAllData = async (jsonString: string): Promise<boolean> => {
    const success = await dataService.importData(jsonString);
    if (success) {
      setLastSaved(new Date());
    }
    return success;
  };

  const clearAllData = async (): Promise<void> => {
    await dataService.clearAllData();
    setLastSaved(new Date());
  };

  const value: DataContextValue = {
    isLoading,
    lastSaved,
    isSaving,
    githubConfigured,
    getData,
    setData,
    saveData,
    configureGitHub,
    toggleGitHub,
    exportAllData,
    importAllData,
    clearAllData
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};