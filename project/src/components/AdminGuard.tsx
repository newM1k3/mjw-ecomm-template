import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

interface AdminGuardProps {
  children: ReactNode;
}

export default function AdminGuard({ children }: AdminGuardProps) {
  const isAuthenticated = !!localStorage.getItem('pb_auth');
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }
  return <>{children}</>;
}
