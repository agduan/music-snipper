import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { SpotifyProvider } from './context/SpotifyContext';
import './styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <SpotifyProvider>
      <App />
    </SpotifyProvider>
  </React.StrictMode>
);
