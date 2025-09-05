import React, { useContext, useEffect, useState } from 'react';
import { GitHubContext } from '../App';
import { AlertCircle, RefreshCw } from 'lucide-react';

export const PendingSyncWarning: React.FC = () => {
  const { pendingChanges, syncStatus, syncData, syncError } = useContext(GitHubContext);
  const [showWarning, setShowWarning] = useState(false);
  
  useEffect(() => {
    // Show warning if there are pending changes and we're not currently syncing
    if (pendingChanges && pendingChanges > 3 && syncStatus !== 'syncing') {
      setShowWarning(true);
    } else {
      setShowWarning(false);
    }
  }, [pendingChanges, syncStatus]);

  if (!showWarning) return null;

  return (
    <div className="fixed bottom-4 right-4 max-w-sm z-50">
      <div className="bg-yellow-900/90 backdrop-blur-sm border border-yellow-600 rounded-lg p-4 shadow-lg">
        <div className="flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-yellow-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-yellow-200">
              Multiple Unsaved Changes
            </h4>
            <p className="text-xs text-yellow-300 mt-1">
              You have {pendingChanges} pending changes that haven't been synced to GitHub. 
              These changes are saved locally but may be lost if you refresh the page.
            </p>
            {syncError && (
              <p className="text-xs text-red-400 mt-2">
                Last sync error: {syncError}
              </p>
            )}
            <button
              onClick={syncData}
              disabled={syncStatus === 'syncing'}
              className="mt-3 px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white text-xs rounded-md flex items-center gap-1.5 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`h-3 w-3 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
              {syncStatus === 'syncing' ? 'Syncing...' : 'Sync Now'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};