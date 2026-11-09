/// <reference types="vite/client" />
import type { AtrilApi } from '../preload/api'

declare global {
  interface Window {
    atril: AtrilApi
  }
}
