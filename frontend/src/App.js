// frontend/src/App.js
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from './firebase-config/config';
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/dashboard/DashboardPage.jsx';
import ClientDetailsPage from './pages/client-details/ClientDetailsPage.jsx';
import Layout from './components/layout/Layout.jsx';
import './App.css';

function PrivateRoute({ children }) {
  const [user, loading] = useAuthState(auth);
  if (loading) return <div>Carregando sistema...</div>;
  return user ? children : <Navigate to="/login" />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        
        {/* Agora as duas rotas usam o mesmo Layout */}
        <Route path="/" element={<PrivateRoute><Layout><DashboardPage /></Layout></PrivateRoute>} />
        <Route path="/cliente/:clientId" element={<PrivateRoute><Layout><ClientDetailsPage /></Layout></PrivateRoute>} />
        
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;