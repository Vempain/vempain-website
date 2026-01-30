import {StrictMode} from 'react'
import {createRoot} from 'react-dom/client'
import './index.css'
import 'leaflet/dist/leaflet.css';
import App from './App.tsx'
import {AuthProvider, ThemeProvider} from './context'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </AuthProvider>
  </StrictMode>,
)
