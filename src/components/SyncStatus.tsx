import React, { useContext, useState } from 'react';
import { GitHubContext } from '../App';
import { LogOut, RefreshCw, Check, AlertCircle, Github, Cloud, CloudOff } from 'lucide-react';
import { formatDate } from '../utils/dateFormatting';

export const SyncStatus: React.FC = () => {
    const { isAuthenticated, syncStatus, lastSync, syncData, logout } = useContext(GitHubContext);
    const [showMenu, setShowMenu] = useState(false);

    const formatLastSync = (dateString: string | null) => {
        if (!dateString) return 'Not synced';
        
        const date = new Date(dateString);
        const now = new Date();
        const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
        
        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return formatDate(date);
    };

    if (!isAuthenticated) {
        return (
            <button className="flex items-center gap-2 px-3 py-1.5 glass rounded-lg text-yellow-400/80 hover:bg-white/5 transition-all">
                <CloudOff size={18} />
                <span className="text-sm hidden sm:inline">Offline Mode</span>
            </button>
        );
    }

    // Determine button state and appearance
    const getButtonStyle = () => {
        if (syncStatus === 'syncing') {
            return 'bg-blue-500/10 border-blue-500/30 text-blue-400';
        }
        if (syncStatus === 'error') {
            return 'bg-red-500/10 border-red-500/30 text-red-400';
        }
        if (syncStatus === 'success') {
            return 'bg-green-500/10 border-green-500/30 text-green-400';
        }
        return 'glass hover:bg-white/5';
    };

    return (
        <div className="relative">
            <button
                onClick={() => setShowMenu(!showMenu)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${getButtonStyle()}`}
            >
                {syncStatus === 'syncing' ? (
                    <RefreshCw size={18} className="animate-spin" />
                ) : syncStatus === 'error' ? (
                    <AlertCircle size={18} />
                ) : syncStatus === 'success' ? (
                    <Check size={18} />
                ) : (
                    <Github size={18} />
                )}
                
                {/* Desktop: Show status text */}
                <span className="text-sm font-medium hidden sm:inline">
                    {syncStatus === 'syncing' ? 'Syncing...' :
                     syncStatus === 'error' ? 'Sync Error' :
                     syncStatus === 'success' ? 'Synced' :
                     'GitHub'}
                </span>
                
                {/* Mobile: Just show icon */}
            </button>

            {showMenu && (
                <>
                    <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setShowMenu(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                        <div className="p-4 border-b border-gray-800/50">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Sync Status</span>
                                <Cloud size={14} className="text-gray-500" />
                            </div>
                            <p className="text-sm text-gray-300">
                                Last sync: <span className="text-white font-medium">{formatLastSync(lastSync)}</span>
                            </p>
                        </div>
                        
                        <div className="p-2">
                            <button
                                onClick={() => {
                                    syncData();
                                    setShowMenu(false);
                                }}
                                disabled={syncStatus === 'syncing'}
                                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-300 hover:bg-white/5 rounded-lg transition-all disabled:opacity-50"
                            >
                                <RefreshCw size={16} className={syncStatus === 'syncing' ? 'animate-spin' : ''} />
                                <span>Sync Now</span>
                                {syncStatus === 'syncing' && (
                                    <span className="ml-auto text-xs text-blue-400">In progress...</span>
                                )}
                            </button>
                            
                            <div className="my-2 border-t border-gray-800/50" />
                            
                            <button
                                onClick={() => {
                                    logout();
                                    setShowMenu(false);
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                            >
                                <LogOut size={16} />
                                <span>Disconnect GitHub</span>
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};