import React, { useState } from 'react';
import githubStorage from '../services/githubStorage';
import { githubDataManager } from '../services/githubDataManager';

interface GitHubAuthModalProps {
    isOpen: boolean;
    onSuccess: () => void;
    onClose: () => void;
}

const GitHubAuthModal: React.FC<GitHubAuthModalProps> = ({ isOpen, onSuccess }) => {
    const [token, setToken] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!token.trim()) {
            setError('Please enter your GitHub token');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            // Initialize both githubStorage (for token management) and githubDataManager (for data)
            await githubStorage.initialize(token);
            await githubDataManager.initialize(token);
            console.log('[Auth] Initialized GitHub Direct mode');
            
            onSuccess();
        } catch (err) {
            setError('Invalid token. Please check and try again.');
            console.error('Authentication error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-950 flex items-center justify-center z-50">
            <div className="glass p-8 rounded-xl w-full max-w-md">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-white mb-2">
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
                        
                        {error && (
                            <p className="mt-2 text-sm text-red-400">
                                {error}
                            </p>
                        )}
                    </div>

                    <button
                        type="submit"
                        className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-medium disabled:opacity-50"
                        disabled={isLoading}
                    >
                        {isLoading ? 'Authenticating...' : 'Connect to GitHub'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default GitHubAuthModal;