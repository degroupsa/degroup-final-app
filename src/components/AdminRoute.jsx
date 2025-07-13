import React from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { Navigate } from 'react-router-dom';


function AdminRoute({ children }) {
  const { user, loading } = useAuth();


  if (loading) {
    return <div>Cargando...</div>;
  }


  if (!user || user.role !== 'admin') {
    return <Navigate to="/" />;
  }
  
  return children;
}

export default AdminRoute;