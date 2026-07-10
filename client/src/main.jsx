import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import AuthPage from './AuthPage';
import ProfilePage from './ProfilePage';
import OrdersPage from './OrdersPage';
import AdminPage from './AdminPage';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/admin/products" element={<AdminPage initialTab="products" />} />
        <Route path="/admin/orders" element={<AdminPage initialTab="orders" />} />
        <Route path="/admin/users" element={<AdminPage initialTab="users" />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);