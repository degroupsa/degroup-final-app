// src/layouts/PublicLayout.jsx (CORREGIDO)

import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx'; // <-- 1. IMPORTAMOS EL FOOTER
import NavigationArrows from '../components/ui/NavigationArrows';

function PublicLayout() {
  return (
    <div className="main-container">
      <Navbar />
      <main className="main-content">
        {/* Outlet renderizará la página pública que corresponda (Inicio, Productos, etc.) */}
        <Outlet />
      </main>
      <NavigationArrows />
      <Footer /> {/* <-- 2. AÑADIMOS EL FOOTER AL FINAL */}
    </div>
  );
}

export default PublicLayout;