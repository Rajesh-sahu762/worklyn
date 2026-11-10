import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BrowserRouter } from 'react-router';
import { AuthProvider } from './context/AuthContext.jsx';
import { NotificationsProvider } from './context/NotificationsContext.jsx';


createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
    <AuthProvider>
      <NotificationsProvider>
        <App />
      </NotificationsProvider>
    </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
