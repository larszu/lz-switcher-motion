import '@fontsource-variable/public-sans'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { getLang } from './i18n'
import './styles.css'

document.documentElement.lang = getLang()
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
