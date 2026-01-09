import React from 'react';
import RealtimeUsersWidget from '../../components/admin/RealtimeUsersWidget';

function AdminRealtimePage() {
  return (
    <div>
      <h2>Actividad en Tiempo Real</h2>
      <p>Esta página muestra todos los usuarios que tienen el sitio web abierto en este momento.</p>
      <RealtimeUsersWidget />
    </div>
  );
}

export default AdminRealtimePage;