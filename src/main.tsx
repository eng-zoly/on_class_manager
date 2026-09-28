import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { AuthProvider } from './context/AuthContext';
import './index.css';

// Automatically detect macOS and add 'is-mac' class for traffic light spacing
if (typeof navigator !== 'undefined' && /Macintosh|Mac OS X/i.test(navigator.userAgent)) {
  document.documentElement.classList.add('is-mac');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);
