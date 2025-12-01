import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import NavigationArrows from '../components/ui/NavigationArrows';
import { ChatPanelProvider } from '../context/ChatPanelContext.jsx';
import styles from './PublicLayout.module.css'; // ¡Importamos los estilos!

function PublicLayout() {
  return (
    // 2. Envolvemos todo con el Provider
    <ChatPanelProvider>
      {/* 3. Este wrapper aplica el fondo claro */}
      <div className={styles.publicSiteWrapper}> 
        <Navbar />
        {/* 4. Quitamos 'main-content' para que la HomePage ocupe el 100% */}
        <main>
          <Outlet />
        </main>
        <NavigationArrows />
        <Footer />
      </div>
    </ChatPanelProvider>
  );
}

export default PublicLayout;