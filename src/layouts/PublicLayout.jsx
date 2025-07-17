import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import NavigationArrows from '../components/ui/NavigationArrows';
import { ChatPanelProvider } from '../context/ChatPanelContext.jsx'; // 1. Importamos el Provider

function PublicLayout() {
  return (
    // 2. Envolvemos todo con el Provider
    <ChatPanelProvider>
      <div className="main-container">
        <Navbar />
        <main className="main-content">
          <Outlet />
        </main>
        <NavigationArrows />
        <Footer />
      </div>
    </ChatPanelProvider>
  );
}

export default PublicLayout;