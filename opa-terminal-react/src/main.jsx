import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext'
import { PetProvider } from './context/PetContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <PetProvider>
        <App />
      </PetProvider>
    </AuthProvider>
  </StrictMode>,
)
