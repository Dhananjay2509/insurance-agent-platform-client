import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { LoadingPanel } from '../ui/Spinner';

/**
 * Client-side route guard.
 *
 * This is a UX control only — it stops an unauthenticated user seeing an empty
 * dashboard shell. Every API route is independently protected server side, so
 * bypassing this in the browser reveals nothing.
 */
export function ProtectedRoute() {
  const { agent, initialising } = useAuth();
  const location = useLocation();

  if (initialising) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <LoadingPanel label="Checking your session…" />
      </div>
    );
  }

  if (!agent) {
    // Remember where they were headed so login can send them back.
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
