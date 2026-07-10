import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './pages/coming-soon/coming-soon.css';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Vendrome launch root element was not found.');
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
