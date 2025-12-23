import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '@/store/hooks';
import { selectIsAuthenticated, selectIsLoading, selectProfile } from '@/store/slices/authSlice';
import type { ReactNode } from 'react';

/**
 * PublicRoute - Component to protect public routes from authenticated users
 * 
 * This component ensures that authenticated users cannot access authentication
 * pages like login, register, forgot password, etc. If an authenticated user
 * tries to access these pages, they will be redirected to the dashboard.
 * 
 * EXCEPTIONS:
 * - Password recovery: When user clicks reset link, they have a temp session
 *   but need access to /forgot-password?step=3 to set their new password
 * 
 * NOW USES REDUX (consistent with ReduxAuthGuard)
 * 
 * @param {ReactNode} children - The child components to render if not authenticated
 * @returns {JSX.Element} The public route component or redirect
 */
interface PublicRouteProps {
  children: ReactNode;
  redirectTo?: string;
}

const PublicRoute: React.FC<PublicRouteProps> = ({
  children,
  redirectTo = '/app'
}) => {
  // Use Redux (same source as ReduxAuthGuard)
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const isLoading = useAppSelector(selectIsLoading);
  const profile = useAppSelector(selectProfile);
  const location = useLocation();

  // Get current path and search params
  const currentPath = location.pathname;
  const searchParams = new URLSearchParams(location.search);

  // Check if this is a password recovery flow
  // User will have step=3 in URL when coming from reset email link
  const isPasswordRecoveryFlow = currentPath === '/forgot-password' && searchParams.get('step') === '3';

  // // console.log('🔓 PublicRoute check:', { isAuthenticated, isLoading, hasProfile: !!profile });

  // Get current path to determine if we should show loading screen
  const pagesWithInlineLoaders = ['/login', '/register'];
  const hasInlineLoader = pagesWithInlineLoaders.includes(currentPath);

  // Show loading state while checking authentication
  // BUT skip for pages that have their own inline loaders (like login button)
  if (isLoading && !hasInlineLoader) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-red-200 border-t-red-600 rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If user is authenticated and has an active account, redirect to app
  // UNLESS they're in a password recovery flow
  if (isAuthenticated && profile?.status === 'active') {
    if (isPasswordRecoveryFlow) {
      console.log('🔓 Password recovery flow - allowing access despite being authenticated');
      return <>{children}</>;
    }
    console.log('🔓 Authenticated user on public route - redirecting to app');
    return <Navigate to={redirectTo} replace />;
  }

  // If user is authenticated but has pending verification, allow access to verification pages
  // but redirect away from login/register pages
  if (isAuthenticated && profile?.status === 'pending_verification') {
    const verificationPages = ['/verify-email', '/resend-verification'];

    if (verificationPages.includes(currentPath)) {
      // Allow access to verification pages
      return <>{children}</>;
    } else {
      // Redirect to verification if trying to access other auth pages
      return <Navigate to="/verify-email" replace />;
    }
  }

  // User is not authenticated, allow access to public routes
  console.log('🔓 Not authenticated - allowing access to public route');
  return <>{children}</>;
};

export default PublicRoute;
