import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { ModalNotificationProvider } from './context/ModalNotificationContext.jsx';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ModalNotificationProvider>
        <App />
      </ModalNotificationProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
