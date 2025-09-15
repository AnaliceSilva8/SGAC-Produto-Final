// frontend/src/App.js

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from './firebase-config/config';
import PrivateRoute from './components/PrivateRoute';
import LoginPage from './pages/login/LoginPage';
import SignUpPage from './pages/signup/SignUpPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import ClientDetailsPage from './pages/client-details/ClientDetailsPage';
import NotificationsPage from './pages/notifications/NotificationsPage';
import AtendimentosPage from './pages/atendimentos/AtendimentosPage';

function App() {
  const [user, loading] = useAuthState(auth);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <h2>Carregando Sistema...</h2>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Rotas Públicas: Login E Cadastro */}
        <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/" />} />
        <Route path="/signup" element={!user ? <SignUpPage /> : <Navigate to="/" />} />

        {/* Rotas Protegidas */}
        <Route element={<PrivateRoute />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/cliente/:id" element={<ClientDetailsPage />} />
          <Route path="/notificacoes" element={<NotificationsPage />} />
          <Route path="/atendimentos" element={<AtendimentosPage />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;