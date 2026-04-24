import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import './index.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Toaster
      position="top-right"
      gutter={10}
      toastOptions={{
        duration: 4200,
        style: {
          background: 'rgba(12, 19, 35, 0.95)',
          color: '#f8fafc',
          border: '1px solid rgba(148, 163, 184, 0.35)',
          borderRadius: '12px',
          boxShadow: '0 14px 30px rgba(2, 6, 23, 0.5)'
        },
        success: {
          style: {
            border: '1px solid rgba(16, 185, 129, 0.45)'
          }
        },
        error: {
          style: {
            border: '1px solid rgba(239, 68, 68, 0.45)'
          }
        }
      }}
    />
    <App />
  </StrictMode>
);
