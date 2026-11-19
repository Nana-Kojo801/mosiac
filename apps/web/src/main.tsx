import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import '@fontsource-variable/inter/wght.css';
import '@fontsource-variable/jetbrains-mono/wght.css';
import './ui/styles.css';

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
