import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import ScrollToTop from './components/ScrollToTop.jsx';

// Layouts
import AdminLayout from './layouts/AdminLayout.jsx';
import PublicLayout from './layouts/PublicLayout.jsx';

// Componentes de Lógica
import AdminRoute from './components/AdminRoute.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

// Páginas Públicas
import OrderSuccessPage from './pages/OrderSuccessPage.jsx';
import FeedPage from './pages/FeedPage.jsx';
import HomePage from './pages/HomePage.jsx';
import ProductsPage from './pages/ProductsPage.jsx';
import ProductDetailPage from './pages/ProductDetailPage.jsx';
import AboutPage from './pages/AboutPage.jsx';
import ContactPage from './pages/ContactPage.jsx';
import CartPage from './pages/CartPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import VerifyEmailPage from './pages/VerifyEmailPage.jsx';
import CheckoutPage from './pages/CheckoutPage.jsx';
import QuoteRequestPage from './pages/QuoteRequestPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import SinglePostPage from './pages/SinglePostPage.jsx';
import RegistrationSuccessPage from './pages/RegistrationSuccessPage';
import ChatPage from './pages/ChatPage.jsx';
import MessagesPage from './pages/MessagesPage.jsx';

// Páginas de Admin
import AdminDashboardPage from './pages/admin/AdminDashboardPage.jsx';
import AdminInventoryPage from './pages/admin/AdminInventoryPage.jsx';
import AdminRecipesPage from './pages/admin/AdminRecipesPage.jsx';
import AdminProductionPage from './pages/admin/AdminProductionPage.jsx';
import AdminBulkPriceEditorPage from './pages/admin/AdminBulkPriceEditorPage.jsx';
import AdminProductsPage from './pages/admin/AdminProductsPage.jsx';
import AdminOrdersPage from './pages/admin/AdminOrdersPage.jsx';
import AdminUsersPage from './pages/admin/AdminUsersPage.jsx';
import AdminRealtimePage from './pages/admin/AdminRealtimePage.jsx'; 
// --- IMPORTAMOS LA NUEVA PÁGINA ---
import AdminClientsPage from './pages/admin/AdminClientsPage.jsx';

import './App.css';

function App() {
  return (
    <>
      <ScrollToTop />
      
      <Toaster 
        position="top-right"
        containerStyle={{ zIndex: 9999 }}
        toastOptions={{
          style: {
            background: '#212529',
            color: '#f8f9fa',
            border: '1px solid #495057',
            padding: '16px',
            borderRadius: '8px',
          },
          duration: 5000,
          success: { style: { background: '#28a745', color: 'white' } },
          error: { style: { background: '#dc3545', color: 'white' } },
        }}
      />

      <Routes>
        {/* --- MUNDO DE ADMINISTRACIÓN --- */}
        <Route 
          path="/admin"
          element={<AdminRoute><AdminLayout /></AdminRoute>}
        > 
          <Route index element={<Navigate to="dashboard" replace />} /> 
          <Route path="dashboard" element={<AdminDashboardPage />} />
          <Route path="inventario" element={<AdminInventoryPage />} />

          {/* --- AÑADIMOS LA NUEVA RUTA --- */}
          <Route path="clientes" element={<AdminClientsPage />} />

          <Route path="recetas" element={<AdminRecipesPage />} />
          <Route path="productos" element={<AdminProductsPage />} />
          <Route path="ordenes" element={<AdminOrdersPage />} />
          <Route path="usuarios" element={<AdminUsersPage />} />
          <Route path="produccion" element={<AdminProductionPage />} />
          <Route path="precios" element={<AdminBulkPriceEditorPage />} />
          <Route path="en-linea" element={<AdminRealtimePage />} />
          <Route path="mensajes" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} /> 
          <Route path="mensajes/:chatId" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
        </Route>

        {/* --- MUNDO PÚBLICO --- */}
        <Route path="/" element={<PublicLayout />}>
          <Route path="/solicitud-enviada" element={<OrderSuccessPage />} />
          <Route index element={<HomePage />} />
          <Route path="productos" element={<ProductsPage />} />
          <Route path="producto/:productId" element={<ProductDetailPage />} />
          <Route path="nosotros" element={<AboutPage />} />
          <Route path="contacto" element={<ContactPage />} />
          <Route path="canal" element={<FeedPage />} />
          <Route path="cart" element={<CartPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="verify-email" element={<VerifyEmailPage />} />
          <Route path="/registration-success" element={<RegistrationSuccessPage />} />
          <Route path="solicitar-presupuesto" element={<QuoteRequestPage />} />
          <Route path="checkout" element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
          <Route path="mensajes/:chatId" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
          <Route path="mi-perfil" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="perfil/:userId" element={<ProfilePage />} />
          <Route path="post/:postId" element={<ProtectedRoute><SinglePostPage /></ProtectedRoute>} />
          <Route path="*" element={<h2>Página no encontrada</h2>} />
        </Route>
      </Routes>
    </>
  );
}

export default App;

