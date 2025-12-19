import { ReactNode, useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface ProtectedRouteProps {
  children: ReactNode;
}

const LOAD_TIMEOUT_MS = 5000; // 5 seconds max wait for auth

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading, initialized } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const redirectedRef = useRef(false);

  // Timeout to prevent infinite loading
  useEffect(() => {
    if (!initialized && !hasTimedOut) {
      const timer = setTimeout(() => {
        setHasTimedOut(true);
      }, LOAD_TIMEOUT_MS);
      return () => clearTimeout(timer);
    }
  }, [initialized, hasTimedOut]);

  // Redirect to login if not authenticated (after initialization)
  useEffect(() => {
    if (initialized && !user && !redirectedRef.current) {
      redirectedRef.current = true;
      navigate('/login', { replace: true, state: { from: location.pathname } });
    }
  }, [user, initialized, navigate, location.pathname]);

  // Show timeout error
  if (hasTimedOut && !initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Connection Issue</h2>
            <p className="text-muted-foreground mb-4">
              We're having trouble connecting. Please check your internet and try again.
            </p>
            <Button onClick={() => window.location.reload()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Page
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show loading while auth initializes
  if (loading || !initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - will redirect
  if (!user) {
    return null;
  }

  return <>{children}</>;
};
