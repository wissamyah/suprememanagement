import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import githubStorage from './services/githubStorage'
import { githubDataManager } from './services/githubDataManager'

async function initializeApp() {
  try {
    // Check authentication during the HTML loading screen
    const authenticated = await githubStorage.checkAuthentication();

    if (authenticated) {
      // Initialize GitHub data manager if authenticated
      const token = sessionStorage.getItem('gh_token');
      if (token) {
        const decryptedToken = await githubStorage.decryptToken(token);
        if (decryptedToken) {
          await githubDataManager.initialize(decryptedToken);
        }
      }
    }

    // Now render React app
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  } catch (error) {
    console.error('App initialization failed:', error);
    // Still render the app even if initialization fails
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  }
}

initializeApp();
