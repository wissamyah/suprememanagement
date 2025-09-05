import React, { useContext, useState } from 'react';
import { GitHubContext } from '../App';
import { Settings, LogOut, RefreshCw, Check, AlertCircle } from 'lucide-react';

export const SyncStatus: React.FC = () => {
    const { isAuthenticated, syncStatus, lastSync, syncData, logout, pendingChanges, syncError } = useContext(GitHubContext);
    const [showMenu, setShowMenu] = useState(false);

    const formatLastSync = (dateString: string | null) => {
        if (!dateString) return 'Never';
        
        const date = new Date(dateString);
        const now = new Date();
        const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
        
        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
        return date.toLocaleDateString();
    };

    const getSyncIcon = () => {
        switch (syncStatus) {
            case 'syncing':
                return <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />;
            case 'success':
                return <Check className="h-4 w-4 text-green-600" />;
            case 'error':
                return <AlertCircle className="h-4 w-4 text-red-600" />;
            default:
                return <RefreshCw className="h-4 w-4 text-gray-400" />;
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="flex items-center space-x-2 text-sm text-gray-400">
                <AlertCircle className="h-5 w-5 text-yellow-500" />
                <span>Not connected to GitHub</span>
            </div>
        );
    }

    return (
        <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                    {getSyncIcon()}
                    <div className="text-sm">
                        <div className="text-gray-300">
                            {syncStatus === 'syncing' && 'Syncing...'}
                            {syncStatus === 'success' && 'Synced'}
                            {syncStatus === 'error' && `Sync Error${syncError ? `: ${syncError}` : ''}`}
                            {syncStatus === 'idle' && `Last sync: ${formatLastSync(lastSync)}`}
                        </div>
                        {pendingChanges && pendingChanges > 0 && (
                            <div className="text-xs text-yellow-400 mt-0.5">
                                {pendingChanges} pending change{pendingChanges > 1 ? 's' : ''}
                            </div>
                        )}
                    </div>
                </div>
                
                <button
                    onClick={syncData}
                    disabled={syncStatus === 'syncing'}
                    className="px-4 py-1.5 text-sm text-gray-300 glass rounded-lg hover:bg-white/10 disabled:opacity-50 transition-all relative"
                >
                    Sync Now
                    {pendingChanges && pendingChanges > 0 && (
                        <span className="absolute -top-1 -right-1 bg-yellow-500 text-gray-900 text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                            {pendingChanges}
                        </span>
                    )}
                </button>
                
                <div className="relative">
                    <button
                        onClick={() => setShowMenu(!showMenu)}
                        className="px-4 py-1.5 text-sm text-gray-300 glass rounded-lg hover:bg-white/10 transition-all flex items-center gap-2"
                    >
                        <Settings className="h-4 w-4" />
                        <span>GitHub Settings</span>
                    </button>
                    
                    {showMenu && (
                        <>
                            <div 
                                className="fixed inset-0 z-40" 
                                onClick={() => setShowMenu(false)}
                            />
                            <div className="absolute right-0 mt-2 w-56 bg-gray-900 rounded-lg shadow-xl border border-white/10 py-2 z-50">
                                <div className="px-4 py-2 border-b border-white/10">
                                    <p className="text-xs text-gray-400">Connected to GitHub</p>
                                    <p className="text-sm text-gray-200 font-medium">wissamyah/suprememanagement</p>
                                </div>
                                <button
                                    onClick={() => {
                                        logout();
                                        setShowMenu(false);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/10 transition-colors flex items-center gap-2"
                                >
                                    <LogOut className="h-4 w-4" />
                                    <span>Disconnect GitHub</span>
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};