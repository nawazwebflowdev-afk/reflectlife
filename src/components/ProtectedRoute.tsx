import { ReactNode, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading, initialized } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectedRef = useRef(false);

  // Redirect to login if not authenticated (after initialization)
  useEffect(() => {
    if (initialized && !user && !redirectedRef.current) {
      redirectedRef.current = true;
      navigate('/login', { replace: true, state: { from: location.pathname } });
    }
  }, [user, initialized, navigate, location.pathname]);

  // Show loading while auth initializes
  if (loading || !initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - redirect effect will run; render a small placeholder instead of a blank screen
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground text-sm">Redirecting…</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
