import React from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { Navigate } from 'react-router-dom';
import toast from 'react-hot-toast'; // Importamos toast para el mensaje de error

function AdminRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    // Es buena idea mostrar un indicador de carga más visual si lo tienes
    return <div>Verificando acceso...</div>;
  }

  // --- ▼▼▼ CAMBIO EN LA CONDICIÓN ▼▼▼ ---
  // Ahora verificamos si el rol NO es 'admin' Y TAMPOCO es 'gestion'
  if (!user || (user.role !== 'admin' && user.role !== 'gestion')) {
    // Si el usuario está logueado pero no tiene el rol correcto,
    // es útil darle un mensaje antes de redirigir.
    if (user) {
        toast.error('No tienes permisos para acceder a esta sección.');
    }
    // Redirige a la página de inicio si no cumple la condición
    return <Navigate to="/" replace />;
  }
  // --- ▲▲▲ FIN DEL CAMBIO ▲▲▲ ---

  // Si pasó las validaciones, renderiza el contenido protegido (AdminLayout)
  return children;
}

export default AdminRoute;