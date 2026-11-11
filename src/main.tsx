import { createRoot } from 'react-dom/client'
import App from './App'
import { initSync } from './sync'
import './index.css'

initSync().finally(() => createRoot(document.getElementById('root')!).render(<App />))
