import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../app/AuthProvider';
import { safePath } from '../../lib/utils';
const Checking = () => <p role="status" className="p-10 text-center text-slate-600">Checking your session…</p>;
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth(); const loc = useLocation();
  if (loading) return <Checking />;
  if (!session) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  return <>{children}</>;
}
export function GuestRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth(); const loc = useLocation();
  if (loading) return <Checking />;
  if (session) return <Navigate to={safePath((loc.state as { from?: string } | null)?.from)} replace />;
  return <>{children}</>;
}
export function AdminRoute({ children }: { children: ReactNode }) {
  const { session, user, loading } = useAuth(); const loc = useLocation();
  if (loading) return <Checking />;
  if (!session) return <Navigate to="/admin/login" replace state={{ from: loc.pathname }} />;
  if (user?.app_metadata?.role !== 'careerforge_admin') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
