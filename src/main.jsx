import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import NfcStdbRootProvider from './spacetimedb/NfcStdbRootProvider.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <NfcStdbRootProvider>
            <App />
        </NfcStdbRootProvider>
    </React.StrictMode>,
)
