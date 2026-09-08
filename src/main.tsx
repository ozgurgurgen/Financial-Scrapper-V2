import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { clientErrorLogger } from './services/ClientErrorLogger.ts';

// İstemci ve tarayıcı konsol hatalarını merkezi sisteme bağla
clientErrorLogger.init();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
