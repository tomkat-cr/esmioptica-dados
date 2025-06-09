import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import './index.css'
// import App from './App.jsx'

import AppDados from './components/AppDados.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppDados />
    {/* <App /> */}
  </StrictMode>,
)
