import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import NavigationArrows from '../components/ui/NavigationArrows';

function PublicLayout() {
  return (
    <div className="main-container">
      <Navbar />
      <main className="main-content">
        {/* Outlet renderizará la página pública que corresponda (Inicio, Productos, etc.) */}
        <Outlet />
      </main>
      <NavigationArrows /> {/* <-- Añadir componente */}
    </div>
  );
}

export default PublicLayout;