import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import DeploymentMarker from './DeploymentMarker.jsx'
import './app.css'
import './styles.css'
import './closure-tokenomics.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    <DeploymentMarker />
  </React.StrictMode>,
)
