import React from 'react';

// Importaciones clave
import useWindowWidth from '../hooks/useWindowWidth.js';
import ProfilePageMobile from './ProfilePageMobile.jsx';
import ProfilePageDesktop from '../components/profile/ProfilePageDesktop.jsx';

function ProfilePage() {
  const width = useWindowWidth();
  const breakpoint = 768; // Punto de quiebre

  // Renderizado condicional
  return width < breakpoint ? <ProfilePageMobile /> : <ProfilePageDesktop />;
}

export default ProfilePage;