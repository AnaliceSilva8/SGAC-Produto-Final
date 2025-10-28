import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from './firebase-config/config';
import { AuthProvider } from './context/AuthContext'; // <--- IMPORTANTE
import PrivateRoute from './components/PrivateRoute';
import LoginPage from './pages/login/LoginPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import ClientDetailsPage from './pages/client-details/ClientDetailsPage';
import NotificationsPage from './pages/notifications/NotificationsPage';
import AtendimentosPage from './pages/atendimentos/AtendimentosPage';
import UsersPage from './pages/users/UsersPage.jsx'; 

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
      {/* O AuthProvider deve ficar aqui, por dentro do Router, 
        mas por fora das Routes, para que todas as rotas 
        tenham acesso ao contexto (incluindo a currentLocation)
      */}
      <AuthProvider>
        <Routes>
          <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/" />} />

          {/* Todas as rotas privadas agora são filhas do AuthProvider */}
          <Route element={<PrivateRoute />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/cliente/:id" element={<ClientDetailsPage />} />
            <Route path="/notificacoes" element={<NotificationsPage />} />
            <Route path="/atendimentos" element={<AtendimentosPage />} />
            <Route path="/usuarios" element={<UsersPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;