import React, { useState } from 'react';
import githubStorage from '../services/githubStorage';

interface GitHubAuthModalProps {
    isOpen: boolean;
    onSuccess: () => void;
    onClose: () => void;
}

const GitHubAuthModal: React.FC<GitHubAuthModalProps> = ({ isOpen, onSuccess, onClose }) => {
    const [token, setToken] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [showInstructions, setShowInstructions] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!token.trim()) {
            setError('Please enter your GitHub token');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            await githubStorage.initialize(token);
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
        <div className="fixed inset-0 bg-gray-900 bg-opacity-100 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-white">
                <div className="mt-3">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-gray-900">
                            GitHub Authentication
                        </h3>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600"
                            disabled={isLoading}
                        >
                            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="mb-4">
                        <p className="text-sm text-gray-600 mb-2">
                            To sync your inventory data with GitHub, please enter your Personal Access Token.
                        </p>
                        
                        <button
                            type="button"
                            onClick={() => setShowInstructions(!showInstructions)}
                            className="text-sm text-blue-600 hover:text-blue-800 underline"
                        >
                            {showInstructions ? 'Hide' : 'Show'} instructions
                        </button>

                        {showInstructions && (
                            <div className="mt-3 p-3 bg-blue-50 rounded-md text-sm">
                                <p className="font-semibold mb-2">How to get your GitHub token:</p>
                                <ol className="list-decimal list-inside space-y-1 text-gray-700">
                                    <li>Go to GitHub Settings → Developer settings</li>
                                    <li>Click on "Personal access tokens" → "Tokens (classic)"</li>
                                    <li>Click "Generate new token (classic)"</li>
                                    <li>Give it a name (e.g., "Supreme Management")</li>
                                    <li>Select scopes: <code className="bg-gray-100 px-1">repo</code> (full control)</li>
                                    <li>Click "Generate token" and copy it</li>
                                </ol>
                                <p className="mt-2 text-orange-600">
                                    ⚠️ Save your token securely - you won't be able to see it again!
                                </p>
                            </div>
                        )}
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Personal Access Token
                            </label>
                            <input
                                type="password"
                                value={token}
                                onChange={(e) => setToken(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                                disabled={isLoading}
                                autoFocus
                            />
                            
                            {error && (
                                <p className="mt-2 text-sm text-red-600">
                                    {error}
                                </p>
                            )}
                        </div>

                        <div className="flex justify-between items-center">
                            <a
                                href="https://github.com/settings/tokens/new"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 hover:text-blue-800 underline"
                            >
                                Create new token →
                            </a>

                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                                    disabled={isLoading}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-300"
                                    disabled={isLoading}
                                >
                                    {isLoading ? 'Authenticating...' : 'Authenticate'}
                                </button>
                            </div>
                        </div>
                    </form>

                    <div className="mt-4 p-3 bg-gray-50 rounded-md">
                        <p className="text-xs text-gray-600">
                            <strong>Security Note:</strong> Your token is stored securely in your browser's session storage 
                            and is only used to communicate with GitHub. It's never sent to any other server.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GitHubAuthModal;