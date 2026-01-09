import React from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { Navigate, useLocation } from 'react-router-dom';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    // Es crucial mostrar un estado de carga para no tomar una decisión prematura.
    return <div>Cargando...</div>; 
  }

  // Si ya no está cargando, y AÚN ASÍ no hay usuario o el email no está verificado...
  if (!user || !user.emailVerified) {
    // ...entonces redirigimos.
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Si no está cargando y el usuario es válido y verificado, mostramos la página.
  return children;
}

export default ProtectedRoute;