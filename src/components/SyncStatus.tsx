import React, { useContext, useState } from 'react';
import { GitHubContext } from '../App';
import { LogOut, RefreshCw, Check, AlertCircle, Github } from 'lucide-react';

export const SyncStatus: React.FC = () => {
    const { isAuthenticated, syncStatus, lastSync, syncData, logout } = useContext(GitHubContext);
    const [showMenu, setShowMenu] = useState(false);
    const [showMobileDropdown, setShowMobileDropdown] = useState(false);

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
                <span className="hidden sm:inline">Not connected to GitHub</span>
                <span className="sm:hidden">Not connected</span>
            </div>
        );
    }

    return (
        <div className="flex items-center">
            {/* Mobile View - GitHub Icon with Dropdown */}
            <div className="sm:hidden relative">
                <button
                    onClick={() => setShowMobileDropdown(!showMobileDropdown)}
                    className="flex items-center space-x-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
                >
                    <Github className="h-5 w-5" />
                </button>

                {showMobileDropdown && (
                    <>
                        <div 
                            className="fixed inset-0 z-40" 
                            onClick={() => setShowMobileDropdown(false)}
                        />
                        <div className="absolute right-0 mt-2 w-64 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50">
                            <div className="p-3 border-b border-gray-700">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-medium text-gray-400">GitHub Status</span>
                                    {getSyncIcon()}
                                </div>
                                <p className="text-sm text-gray-300">
                                    {syncStatus === 'syncing' && 'Syncing...'}
                                    {syncStatus === 'success' && 'Synced'}
                                    {syncStatus === 'error' && 'Sync Error'}
                                    {syncStatus === 'idle' && `Last: ${formatLastSync(lastSync)}`}
                                </p>
                            </div>
                            
                            <div className="p-2">
                                <button
                                    onClick={() => {
                                        syncData();
                                        setShowMobileDropdown(false);
                                    }}
                                    disabled={syncStatus === 'syncing'}
                                    className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 rounded-md transition-colors disabled:opacity-50"
                                >
                                    <RefreshCw className={`h-4 w-4 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                                    <span>Sync Now</span>
                                </button>
                                
                                <button
                                    onClick={() => {
                                        logout();
                                        setShowMobileDropdown(false);
                                    }}
                                    className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-red-400 hover:bg-gray-800 rounded-md transition-colors"
                                >
                                    <LogOut className="h-4 w-4" />
                                    <span>Disconnect</span>
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Desktop View */}
            <div className="hidden sm:flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                    {getSyncIcon()}
                    <div className="text-sm">
                        <div className="flex items-center space-x-2">
                            <span className="text-gray-300 font-medium">
                                {syncStatus === 'syncing' && 'Syncing...'}
                                {syncStatus === 'success' && 'All changes saved'}
                                {syncStatus === 'error' && 'Sync Error'}
                                {syncStatus === 'idle' && 'Connected'}
                            </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                            <RefreshCw className="h-3 w-3 inline mr-1" />
                            <span>{formatLastSync(lastSync)}</span>
                        </div>
                    </div>
                </div>

                <div className="relative">
                    <button
                        onClick={() => setShowMenu(!showMenu)}
                        className="flex items-center space-x-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
                    >
                        <Github className="h-5 w-5" />
                        <span className="text-sm">GitHub</span>
                    </button>

                    {showMenu && (
                        <>
                            <div 
                                className="fixed inset-0 z-40" 
                                onClick={() => setShowMenu(false)}
                            />
                            <div className="absolute right-0 mt-2 w-48 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50">
                                <button
                                    onClick={() => {
                                        syncData();
                                        setShowMenu(false);
                                    }}
                                    disabled={syncStatus === 'syncing'}
                                    className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 transition-colors disabled:opacity-50"
                                >
                                    <RefreshCw className={`h-4 w-4 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                                    <span>Sync Now</span>
                                </button>
                                
                                <button
                                    onClick={() => {
                                        logout();
                                        setShowMenu(false);
                                    }}
                                    className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-red-400 hover:bg-gray-800 transition-colors"
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