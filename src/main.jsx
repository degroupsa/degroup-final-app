import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { BrowserRouter } from 'react-router-dom';
import { CartProvider } from './context/CartContext.jsx'; 
import { AuthProvider } from './context/AuthContext.jsx';

// --- SOLUCIÓN: REGISTRO GLOBAL DE CHART.JS ---
import { Chart as ChartJS, registerables } from 'chart.js';
ChartJS.register(...registerables);
// ---------------------------------------------

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <App />
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);