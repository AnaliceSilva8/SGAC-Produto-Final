import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase-config/config';
import Layout from './layout/Layout';

const PrivateRoute = () => {
  const [user, loading] = useAuthState(auth);

  if (loading) {
    // Você pode mostrar um spinner de carregamento aqui se preferir
    return <div>Carregando...</div>;
  }

  // Se o usuário estiver logado, mostra o Layout e a página filha (Outlet).
  // Se não, redireciona para a página de login.
  return user ? (
    <Layout>
      <Outlet />
    </Layout>
  ) : (
    <Navigate to="/login" />
  );
};

export default PrivateRoute;