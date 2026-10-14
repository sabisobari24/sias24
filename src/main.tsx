import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/common/ErrorBoundary';
import { DownloadProvider } from './context/DownloadContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <DownloadProvider>
        <App initialMode="landing" />
      </DownloadProvider>
    </ErrorBoundary>
  </StrictMode>,
);
