/**
 * AuthCallback Component
 * 
 * Handles both OAuth callback and Password Recovery callback from Supabase
 * 
 * FLOWS HANDLED:
 * 1. OAuth (Google Sign-in):
 *    - User clicks "Sign in with Google"
 *    - Redirected to Google OAuth
 *    - Google redirects back to /auth/callback
 *    - Session is established, redirect to dashboard
 * 
 * 2. Password Recovery:
 *    - User requests password reset email
 *    - Clicks link in email → /auth/callback#type=recovery&access_token=xxx
 *    - Exchange token for session
 *    - Redirect to /forgot-password?step=3 to set new password
 */

import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader2, AlertCircle, KeyRound } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAppDispatch } from '../store/hooks';
import { initializeAuth } from '../store/slices/authSlice';

type CallbackType = 'oauth' | 'recovery' | 'unknown';

export default function AuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('Processing...');
  const [callbackType, setCallbackType] = useState<CallbackType>('unknown');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('🔍 AuthCallback processing, hash:', location.hash);

        // Parse the URL hash to determine callback type
        const hashParams = new URLSearchParams(location.hash.substring(1));
        const type = hashParams.get('type');
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const errorDescription = hashParams.get('error_description');

        console.log('🔍 Parsed params:', { type, hasAccessToken: !!accessToken, hasRefreshToken: !!refreshToken });

        // Check for error in URL params (e.g., expired link)
        if (errorDescription) {
          console.error('❌ Auth error from URL:', errorDescription);
          setError(errorDescription);
          setTimeout(() => navigate('/login'), 3000);
          return;
        }

        // Handle Password Recovery Flow
        if (type === 'recovery') {
          setCallbackType('recovery');
          setStatus('Processing password reset...');

          console.log('🔐 Password recovery callback detected');

          // For recovery, we need to exchange the tokens
          if (accessToken && refreshToken) {
            console.log('🔐 Exchanging recovery tokens for session...');

            // Set the session using the tokens from the URL
            const { data, error: setSessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (setSessionError) {
              console.error('❌ Failed to set recovery session:', setSessionError);
              setError('Password reset link has expired or is invalid. Please request a new one.');
              setTimeout(() => navigate('/forgot-password'), 3000);
              return;
            }

            if (data?.session) {
              console.log('✅ Recovery session established for:', data.session.user.email);
              setStatus('Redirecting to password reset...');

              // Redirect to the new password step
              await new Promise(resolve => setTimeout(resolve, 500));
              navigate('/forgot-password?step=3', { replace: true });
              return;
            }
          }

          // If tokens weren't in hash, try to get existing session
          // (Supabase might have handled the hash automatically via detectSessionInUrl)
          const { data: { session: existingSession } } = await supabase.auth.getSession();

          if (existingSession) {
            console.log('✅ Found existing session for recovery:', existingSession.user.email);
            setStatus('Redirecting to password reset...');
            await new Promise(resolve => setTimeout(resolve, 500));
            navigate('/forgot-password?step=3', { replace: true });
            return;
          }

          // No session found for recovery
          console.warn('⚠️ No session found for password recovery');
          setError('Password reset link has expired or is invalid. Please request a new one.');
          setTimeout(() => navigate('/forgot-password'), 3000);
          return;
        }

        // Default: OAuth callback (Google, etc.) or email verification
        setCallbackType('oauth');
        setStatus('Verifying your credentials...');

        // First, try to get session (detectSessionInUrl should have handled the hash)
        let { data: { session }, error: sessionError } = await supabase.auth.getSession();

        // If no session and we have tokens, try to set them explicitly
        if (!session && accessToken && refreshToken) {
          console.log('🔍 No session found, attempting to set session from tokens...');
          const { data, error: setSessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (!setSessionError && data?.session) {
            session = data.session;
            sessionError = null;
          } else {
            sessionError = setSessionError;
          }
        }

        if (sessionError) {
          console.error('❌ Session error:', sessionError);
          setError('Failed to verify authentication. Please try again.');
          setTimeout(() => navigate('/login'), 3000);
          return;
        }

        if (!session) {
          console.warn('⚠️ No session found after OAuth callback');
          setError('No session found. Redirecting to login...');
          setTimeout(() => navigate('/login'), 2000);
          return;
        }

        console.log('✅ OAuth session established:', {
          user: session.user.email,
          provider: session.user.app_metadata?.provider,
        });

        setStatus('Loading your profile...');

        // Initialize auth state in Redux
        await dispatch(initializeAuth()).unwrap();

        setStatus('Success! Redirecting to dashboard...');

        // Small delay to show success message
        await new Promise(resolve => setTimeout(resolve, 500));

        // Redirect to dashboard
        navigate('/dashboard', { replace: true });

      } catch (err) {
        console.error('❌ Auth callback error:', err);
        setError(
          err instanceof Error
            ? err.message
            : 'Authentication failed. Please try again.'
        );
        setTimeout(() => navigate('/login'), 3000);
      }
    };

    handleAuthCallback();
  }, [navigate, dispatch, location.hash]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {callbackType === 'recovery' ? 'Password Reset Error' : 'Authentication Error'}
          </h2>
          <p className="text-gray-600 mb-4">
            {error}
          </p>
          <p className="text-sm text-gray-500">
            Redirecting you {callbackType === 'recovery' ? 'to reset password page' : 'back to login'}...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          {callbackType === 'recovery' ? (
            <KeyRound className="h-8 w-8 text-red-600" />
          ) : (
            <Loader2 className="h-8 w-8 text-red-600 animate-spin" />
          )}
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {callbackType === 'recovery' ? 'Password Reset' : 'Completing Sign In'}
        </h2>
        <p className="text-gray-600 mb-4">
          {status}
        </p>
        <div className="flex items-center justify-center gap-1">
          <div className="w-2 h-2 bg-red-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-red-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-red-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  );
}
