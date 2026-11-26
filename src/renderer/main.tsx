import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { CrashBoundary } from './crash/Boundary'
import { installWindowCrash } from './crash/window'
import './styles.css'

installWindowCrash(window, (r) => window.atril.crash.report(r))

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <CrashBoundary>
      <App />
    </CrashBoundary>
  </StrictMode>
)
