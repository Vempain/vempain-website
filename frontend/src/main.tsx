import {StrictMode} from 'react'
import {createRoot} from 'react-dom/client'
import {BrowserRouter} from 'react-router-dom'
import L from 'leaflet'
import './index.css'
import 'leaflet/dist/leaflet.css';
import markerIcon2xUrl from 'leaflet/dist/images/marker-icon-2x.png'
import markerIconUrl from 'leaflet/dist/images/marker-icon.png'
import markerShadowUrl from 'leaflet/dist/images/marker-shadow.png'
import App from './App.tsx'
import {AuthProvider, ThemeProvider} from './context'
import {RendererProvider} from '@vempain/vempain-rt-renderer';
import {rendererRuntime} from './rendererRuntime';

// Ensure Leaflet marker assets are bundled and resolved with absolute built URLs.
delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2xUrl,
    iconUrl: markerIconUrl,
    shadowUrl: markerShadowUrl,
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
      <BrowserRouter>
          <RendererProvider value={rendererRuntime}>
              <AuthProvider>
                  <ThemeProvider>
                      <App/>
                  </ThemeProvider>
              </AuthProvider>
          </RendererProvider>
      </BrowserRouter>
  </StrictMode>,
)
