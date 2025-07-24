import React from 'react';
import useWindowWidth from '../hooks/useWindowWidth';
import ProfilePageMobile from './ProfilePageMobile.jsx';
import ProfilePageDesktop from '../components/profile/ProfilePageDesktop.jsx';

function ProfilePage() {
  const width = useWindowWidth();
  const breakpoint = 992; // Usamos el breakpoint del CSS original

  return width < breakpoint ? <ProfilePageMobile /> : <ProfilePageDesktop />;
}

export default ProfilePage;