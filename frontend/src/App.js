// frontend/src/App.js
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from './firebase-config/config';

import LoginPage from './pages/login/LoginPage.jsx';
import DashboardPage from './pages/dashboard/DashboardPage.jsx';
import ClientDetailsPage from './pages/client-details/ClientDetailsPage.jsx';
import SignUpPage from './pages/signup/SignUpPage.jsx'; // 1. IMPORTA A NOVA PÁGINA
import Layout from './components/layout/Layout.jsx';
import './App.css';

function PrivateRoute({ children }) {
  const [user, loading] = useAuthState(auth);
  if (loading) return <div>Carregando...</div>;
  return user ? <Layout>{children}</Layout> : <Navigate to="/login" />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        
        {/* 2. ADICIONA A ROTA PÚBLICA PARA A PÁGINA DE CADASTRO */}
        <Route path="/cadastro" element={<SignUpPage />} />
        
        <Route path="/" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
        <Route path="/cliente/:clientId" element={<PrivateRoute><ClientDetailsPage /></PrivateRoute>} />
        
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;