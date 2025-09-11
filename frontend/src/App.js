import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from './firebase-config/config'; //

// Importe o novo componente
import PrivateRoute from './components/PrivateRoute';

// Importe suas páginas
import LoginPage from './pages/login/LoginPage'; //
import SignUpPage from './pages/signup/SignUpPage'; //
import DashboardPage from './pages/dashboard/DashboardPage'; //
import ClientDetailsPage from './pages/client-details/ClientDetailsPage'; //
import NotificationsPage from './pages/notifications/NotificationsPage';

function App() {
  const [user, loading] = useAuthState(auth);

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <Router>
      <Routes>
        {/* Rotas Públicas */}
        <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/" />} />
        <Route path="/signup" element={!user ? <SignUpPage /> : <Navigate to="/" />} />

        {/* Rotas Protegidas que precisam do Layout */}
        <Route element={<PrivateRoute />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/cliente/:id" element={<ClientDetailsPage />} />
          <Route path="/notificacoes" element={<NotificationsPage />} />
          {/* Adicione outras rotas protegidas aqui */}
        </Route>
      </Routes>
    </Router>
  );
}

export default App;