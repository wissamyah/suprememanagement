import React, { useState, useEffect } from 'react';
import githubStorage from '../services/githubStorage';
import { githubDataManager } from '../services/githubDataManager';
import { vaultAuth } from '../services/vaultAuth';
import { Shield, Key, Lock, AlertCircle } from 'lucide-react';

interface GitHubAuthModalProps {
    isOpen: boolean;
    onSuccess: () => void;
    onClose: () => void;
}

const GitHubAuthModal: React.FC<GitHubAuthModalProps> = ({ isOpen, onSuccess }) => {
    const [token, setToken] = useState('');
    const [password, setPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [mode, setMode] = useState<'password' | 'token' | 'setup'>('password');
    const [isVaultSetup, setIsVaultSetup] = useState(false);
    
    useEffect(() => {
        // Check if vault is already setup
        const vaultExists = vaultAuth.isVaultSetup();
        setIsVaultSetup(vaultExists);
        setMode(vaultExists ? 'password' : 'setup');
    }, [isOpen]);

    const handlePasswordLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!password.trim()) {
            setError('Please enter your password');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            // Login with password to get decrypted token
            const decryptedToken = await vaultAuth.loginWithPassword(password);
            
            // Initialize services with decrypted token
            await githubStorage.initialize(decryptedToken);
            await githubDataManager.initialize(decryptedToken);
            console.log('[Auth] Logged in with password');
            
            onSuccess();
        } catch (err: any) {
            setError(err.message || 'Invalid password. Please try again.');
            console.error('Password login error:', err);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleTokenLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!token.trim()) {
            setError('Please enter your GitHub token');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            // Initialize with token directly
            await githubStorage.initialize(token);
            await githubDataManager.initialize(token);
            console.log('[Auth] Initialized with token');
            
            onSuccess();
        } catch (err) {
            setError('Invalid token. Please check and try again.');
            console.error('Token authentication error:', err);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleSetupVault = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!token.trim()) {
            setError('Please enter your GitHub token');
            return;
        }
        
        if (!newPassword.trim() || newPassword.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }
        
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            // Setup vault with encrypted token
            await vaultAuth.initializeVaultForPrivateRepo(token, newPassword);
            
            // Initialize services
            await githubStorage.initialize(token);
            await githubDataManager.initialize(token);
            console.log('[Auth] Vault setup complete');
            
            onSuccess();
        } catch (err: any) {
            setError(err.message || 'Failed to setup secure vault');
            console.error('Vault setup error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-950 flex items-center justify-center z-50">
            <div className="glass p-8 rounded-xl w-full max-w-md">
                {/* Header */}
                <div className="mb-6">
                    <div className="flex items-center gap-3 mb-2">
                        <Shield className="text-blue-400" size={24} />
                        <h2 className="text-xl font-semibold text-white">
                            {mode === 'setup' ? 'Setup Secure Access' : 
                             mode === 'password' ? 'Welcome Back' : 'Direct Token Access'}
                        </h2>
                    </div>
                    <p className="text-sm text-gray-400">
                        {mode === 'setup' ? 'Create a password to secure your GitHub token' : 
                         mode === 'password' ? 'Enter your password to access Supreme Management' : 
                         'Enter your GitHub token directly'}
                    </p>
                </div>
                
                {/* Password Login Form */}
                {mode === 'password' && (
                    <form onSubmit={handlePasswordLogin} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-white mb-2">
                                <Lock className="inline w-4 h-4 mr-1" />
                                Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20 text-white placeholder-gray-400"
                                placeholder="Enter your password"
                                disabled={isLoading}
                                autoFocus
                            />
                        </div>

                        {error && (
                            <div className="flex items-start gap-2 p-3 bg-red-500/10 rounded-lg">
                                <AlertCircle className="text-red-400 mt-0.5" size={16} />
                                <p className="text-sm text-red-400">{error}</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-medium disabled:opacity-50"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Unlocking...' : 'Unlock Dashboard'}
                        </button>
                        
                        <div className="text-center space-y-2">
                            <button
                                type="button"
                                onClick={() => setMode('token')}
                                className="text-sm text-blue-400 hover:text-blue-300 block w-full"
                            >
                                Use GitHub token instead
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    vaultAuth.clearVaultSetup();
                                    setIsVaultSetup(false);
                                    setMode('setup');
                                    setPassword('');
                                    setError('');
                                }}
                                className="text-sm text-orange-400 hover:text-orange-300 block w-full"
                            >
                                Forgot password? Reset access
                            </button>
                        </div>
                    </form>
                )}
                
                {/* Setup Vault Form */}
                {mode === 'setup' && (
                    <form onSubmit={handleSetupVault} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-white mb-2">
                                <Key className="inline w-4 h-4 mr-1" />
                                GitHub Token
                            </label>
                            <input
                                type="password"
                                value={token}
                                onChange={(e) => setToken(e.target.value)}
                                className="w-full px-4 py-3 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20 text-white placeholder-gray-400"
                                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                                disabled={isLoading}
                                autoFocus
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-white mb-2">
                                <Lock className="inline w-4 h-4 mr-1" />
                                Create Password
                            </label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full px-4 py-3 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20 text-white placeholder-gray-400"
                                placeholder="Minimum 8 characters"
                                disabled={isLoading}
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-white mb-2">
                                <Lock className="inline w-4 h-4 mr-1" />
                                Confirm Password
                            </label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-4 py-3 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20 text-white placeholder-gray-400"
                                placeholder="Confirm your password"
                                disabled={isLoading}
                            />
                        </div>

                        {error && (
                            <div className="flex items-start gap-2 p-3 bg-red-500/10 rounded-lg">
                                <AlertCircle className="text-red-400 mt-0.5" size={16} />
                                <p className="text-sm text-red-400">{error}</p>
                            </div>
                        )}
                        
                        <div className="p-3 bg-blue-500/10 rounded-lg">
                            <p className="text-xs text-blue-400">
                                Your token will be encrypted with your password and stored securely in your GitHub repository.
                            </p>
                        </div>

                        <button
                            type="submit"
                            className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-medium disabled:opacity-50"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Setting up...' : 'Setup Secure Access'}
                        </button>
                        
                        <div className="text-center space-y-2">
                            <button
                                type="button"
                                onClick={() => setMode('token')}
                                className="text-sm text-blue-400 hover:text-blue-300 block w-full"
                            >
                                Skip and use token directly
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setMode('password');
                                    setIsVaultSetup(true);
                                }}
                                className="text-sm text-green-400 hover:text-green-300 block w-full"
                            >
                                I already have a password (different device)
                            </button>
                        </div>
                    </form>
                )}
                
                {/* Token Login Form */}
                {mode === 'token' && (
                    <form onSubmit={handleTokenLogin} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-white mb-2">
                                <Key className="inline w-4 h-4 mr-1" />
                                GitHub Token
                            </label>
                            <input
                                type="password"
                                value={token}
                                onChange={(e) => setToken(e.target.value)}
                                className="w-full px-4 py-3 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20 text-white placeholder-gray-400"
                                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                                disabled={isLoading}
                                autoFocus
                            />
                        </div>

                        {error && (
                            <div className="flex items-start gap-2 p-3 bg-red-500/10 rounded-lg">
                                <AlertCircle className="text-red-400 mt-0.5" size={16} />
                                <p className="text-sm text-red-400">{error}</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-medium disabled:opacity-50"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Authenticating...' : 'Connect to GitHub'}
                        </button>
                        
                        <div className="text-center space-y-2">
                            <button
                                type="button"
                                onClick={() => setMode(isVaultSetup ? 'password' : 'setup')}
                                className="text-sm text-blue-400 hover:text-blue-300 block w-full"
                            >
                                {isVaultSetup ? 'Use password instead' : 'Setup secure access'}
                            </button>
                            {!isVaultSetup && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        vaultAuth.clearVaultSetup();
                                        setMode('setup');
                                    }}
                                    className="text-sm text-orange-400 hover:text-orange-300 block w-full"
                                >
                                    Reset and setup password access
                                </button>
                            )}
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default GitHubAuthModal;