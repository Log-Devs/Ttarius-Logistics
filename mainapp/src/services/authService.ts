import { supabase } from '../lib/supabase';
import type { AuthError, User, Session } from '@supabase/supabase-js';
import { emailService } from './emailService';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'client' | 'warehouse' | 'superadmin';
  phone?: string;
  suite_number?: string;
  status: 'pending_verification' | 'active' | 'suspended';
  avatarUrl?: string;
  profileImage?: string; // Alias for avatarUrl
  isEmailVerified?: boolean;
  accountStatus?: string;
  usShippingAddressId?: string | number;
  streetAddress?: string;
  city?: string;
  country?: string;
  postalCode?: string;
}

export interface SignUpData {
  streetAddress: any;
  city: any;
  country: any;
  postalCode: any;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface SignInData {
  email: string;
  password: string;
}

class AuthService {
  /**
   * Clean up orphaned auth users (auth user exists but no profile)
   * This can happen when registration fails after auth user creation
   * 
   * @param email - Email to check for orphaned user
   * @returns {Promise<boolean>} True if cleanup was performed
   * @private
   */
  private async cleanupOrphanedAuthUser(email: string): Promise<boolean> {
    try {
      console.log('🔍 Checking for orphaned auth user:', email);

      // Check if profile exists
      const { data: existingProfile, error: _profileError } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', email.toLowerCase())
        .maybeSingle();

      // If profile exists, no cleanup needed
      if (existingProfile) {
        console.log('✅ Profile exists, no cleanup needed');
        return false;
      }

      // Profile doesn't exist - check if auth user exists
      // We can't directly query auth.users, but we can try to sign in
      // to detect if auth user exists without profile
      console.warn('⚠️ Auth user may exist without profile - this is an orphaned user');
      console.log('💡 User should use a different email or contact support to clean up');

      return false; // We can't auto-cleanup due to security - needs admin intervention

    } catch (err) {
      console.error('Error checking for orphaned user:', err);
      return false;
    }
  }

  async signUp(data: SignUpData): Promise<{ user: User | null; error: AuthError | null }> {
    try {
      // STEP 0: Check for orphaned auth users before attempting registration
      await this.cleanupOrphanedAuthUser(data.email);

      // Step 1: Create auth user with metadata
      const signupPayload = {
        email: data.email,
        password: data.password,
        options: {
          data: {
            first_name: data.firstName,
            last_name: data.lastName,
            phone_number: data.phone,
            street_address: data.streetAddress,
            city: data.city,
            country: data.country,
            postal_code: data.postalCode,
          },
        },
      };

      // DEBUG: log signup payload to help troubleshoot missing phone numbers
      if (process.env.NODE_ENV === 'development') {
        console.log('[AuthService] signUp payload:', signupPayload);
      }

      const { data: authData, error } = await supabase.auth.signUp(signupPayload as any);

      if (error || !authData.user) {
        return { user: null, error };
      }

      // Step 2: Create user profile using secure RPC function
      try {
        const rpcPayload = {
          user_id: authData.user.id,
          email: authData.user.email,
          first_name: data.firstName || 'User',
          last_name: data.lastName || 'Name',
          phone_number: data.phone || null,
          street_address: data.streetAddress || null,
          city: data.city || null,
          country: data.country || null,
          postal_code: data.postalCode || null
        };

        // DEBUG: log RPC payload before calling create_user_profile_secure
        if (process.env.NODE_ENV === 'development') {
          console.log('[AuthService] create_user_profile_secure payload:', rpcPayload);
        }

        const { data: profileResult, error: rpcError } = await supabase.rpc('create_user_profile_secure', rpcPayload as any);

        // DEBUG: log RPC result for troubleshooting
        if (process.env.NODE_ENV === 'development') {
          console.log('[AuthService] create_user_profile_secure result:', { profileResult, rpcError });
        }

        if (rpcError) {
          return {
            user: null,
            error: {
              message: `Registration failed: ${rpcError.message}`,
              name: 'ProfileCreationError'
            } as AuthError
          };
        }

        if (!profileResult?.success) {
          return {
            user: null,
            error: {
              message: `Registration failed: ${profileResult?.error || 'Unknown error'}`,
              name: 'ProfileCreationError'
            } as AuthError
          };
        }

        return { user: authData.user, error: null };

      } catch (profileError) {
        return {
          user: null,
          error: {
            message: 'Registration failed during profile creation',
            name: 'ProfileCreationError'
          } as AuthError
        };
      }
    } catch (err) {
      return {
        user: null,
        error: {
          message: 'Registration failed',
          name: 'RegistrationError'
        } as AuthError
      };
    }
  }

  async signIn(data: SignInData): Promise<{ user: User | null; error: AuthError | null }> {
    try {
      // Attempt sign in with password
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      // Handle failed login
      if (error || !authData.user) {
        // Log failed login attempt in background (non-blocking)
        this.logAuthEventAsync('login_failed', {
          p_user_id: null,
          p_user_email: data.email,
          p_user_role: 'client',
          p_session_id: null,
          p_ip_address: null,
          p_user_agent: navigator.userAgent,
          p_status: 'failure',
          p_details: null,
          p_error_message: error?.message || 'Login failed'
        });

        return { user: null, error };
      }

      // Log successful login in background (non-blocking)
      this.logAuthEventAsync('login_success', {
        p_user_id: authData.user.id,
        p_user_email: data.email,
        p_user_role: 'client',
        p_session_id: authData.session?.access_token?.substring(0, 20),
        p_ip_address: null,
        p_user_agent: navigator.userAgent,
        p_status: 'success',
        p_details: null,
        p_error_message: null
      });

      // Update user's last login timestamp in background (non-blocking)
      this.updateLastLoginAsync(authData.user.id);

      // Send login welcome email with user details and service instructions (non-blocking)
      this.sendLoginWelcomeEmailAsync(authData.user.id, data.email);

      return { user: authData.user, error: null };
    } catch (err) {
      // Log unexpected error in background (non-blocking)
      this.logAuthEventAsync('login_failed', {
        p_user_id: null,
        p_user_email: data.email,
        p_user_role: 'client',
        p_session_id: null,
        p_ip_address: null,
        p_user_agent: navigator.userAgent,
        p_status: 'failure',
        p_details: null,
        p_error_message: 'Unexpected error during login'
      });

      return {
        user: null,
        error: {
          message: 'Sign in failed',
          name: 'SignInError'
        } as AuthError
      };
    }
  }

  /**
   * Handle OAuth sign-in (Google, etc.)
   * Automatically creates user profile if it doesn't exist
   * 
   * @param user - The authenticated user from OAuth provider
   * @returns {Promise<{ profile: AuthUser | null; error: AuthError | null }>}
   */
  async handleOAuthSignIn(user: User): Promise<{ profile: AuthUser | null; error: AuthError | null }> {
    try {
      // Check if user profile already exists
      let profile = await this.getUserProfile(user.id);

      if (profile) {
        // Profile exists, return it
        console.log('✅ OAuth user profile found:', profile);
        return { profile, error: null };
      }

      // Profile doesn't exist, create it using OAuth metadata
      console.log('📝 Creating profile for OAuth user:', user.email);

      // Extract user metadata from OAuth provider
      const metadata = user.user_metadata || {};
      const firstName = metadata.first_name || metadata.given_name || metadata.name?.split(' ')[0] || 'User';
      const lastName = metadata.last_name || metadata.family_name || metadata.name?.split(' ').slice(1).join(' ') || '';

      try {
        // Create user profile using RPC function
        const { data: profileResult, error: rpcError } = await supabase.rpc('create_user_profile_secure', {
          user_id: user.id,
          email: user.email || '',
          first_name: firstName,
          last_name: lastName,
          phone_number: metadata.phone || null,
          street_address: null,
          city: null,
          country: null,
          postal_code: null
        } as any);

        if (rpcError) {
          console.error('❌ Failed to create OAuth user profile:', rpcError);
          return {
            profile: null,
            error: {
              message: `Failed to create user profile: ${rpcError.message}`,
              name: 'ProfileCreationError'
            } as AuthError
          };
        }

        if (!profileResult?.success) {
          console.error('❌ OAuth profile creation returned error:', profileResult?.error);
          return {
            profile: null,
            error: {
              message: `Failed to create user profile: ${profileResult?.error || 'Unknown error'}`,
              name: 'ProfileCreationError'
            } as AuthError
          };
        }

        // Fetch the newly created profile
        profile = await this.getUserProfile(user.id);

        if (!profile) {
          return {
            profile: null,
            error: {
              message: 'Profile created but could not be retrieved',
              name: 'ProfileRetrievalError'
            } as AuthError
          };
        }

        console.log('✅ OAuth user profile created successfully:', profile);
        return { profile, error: null };

      } catch (profileError) {
        console.error('❌ Error creating OAuth user profile:', profileError);
        return {
          profile: null,
          error: {
            message: 'Failed to create user profile',
            name: 'ProfileCreationError'
          } as AuthError
        };
      }
    } catch (err) {
      console.error('❌ Error handling OAuth sign-in:', err);
      return {
        profile: null,
        error: {
          message: 'OAuth sign-in handling failed',
          name: 'OAuthError'
        } as AuthError
      };
    }
  }

  async signOut(): Promise<{ error: AuthError | null }> {
    try {
      // Get current user before signing out for logging
      const { data: { user } } = await supabase.auth.getUser();

      // Sign out immediately (don't wait for logging)
      const { error } = await supabase.auth.signOut();

      // Log logout event in background (non-blocking)
      if (user) {
        this.logAuthEventAsync('logout', {
          p_user_id: user.id,
          p_user_email: user.email,
          p_user_role: 'client',
          p_session_id: null,
          p_ip_address: null,
          p_user_agent: navigator.userAgent,
          p_status: 'success',
          p_details: null,
          p_error_message: null
        });
      }

      return { error };
    } catch (err) {
      return {
        error: {
          message: 'Sign out failed',
          name: 'SignOutError'
        } as AuthError
      };
    }
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    } catch (err) {
      return null;
    }
  }

  async getSession(): Promise<Session | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    } catch (err) {
      return null;
    }
  }

  async getUserProfile(userId: string): Promise<AuthUser | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          email,
          first_name,
          last_name,
          phone_number,
          role,
          status,
          suite_number,
          avatar_url,
          street_address,
          city,
          country,
          postal_code
        `)
        .eq('id', userId)
        .single();

      if (error || !data) {
        return null;
      }

      return {
        id: data.id,
        email: data.email,
        firstName: data.first_name,
        lastName: data.last_name,
        role: data.role,
        phone: data.phone_number,
        status: data.status,
        suite_number: data.suite_number,
        usShippingAddressId: undefined,
        streetAddress: data.street_address,
        city: data.city,
        country: data.country,
        postalCode: data.postal_code,
        avatarUrl: data.avatar_url,
        profileImage: data.avatar_url,
        isEmailVerified: true,
        accountStatus: data.status,
      };
    } catch (err) {
      return null;
    }
  }

  /**
   * Create user profile using secure RPC function (bypasses RLS)
   * This method is used as a fallback for users created before the RPC was added
   * @param userId - User ID from auth.users
   * @param email - User email
   * @param metadata - User metadata from auth.users.user_metadata
   * @returns Object with error or null on success
   */
  async createUserProfile(userId: string, email: string, metadata: any): Promise<{ error: string | null }> {
    try {
      // Use the secure RPC function that bypasses RLS policies
      const { data: profileResult, error: rpcError } = await supabase.rpc('create_user_profile_secure', {
        user_id: userId,
        email: email,
        first_name: metadata.first_name || metadata.firstName || 'User',
        last_name: metadata.last_name || metadata.lastName || 'Name',
        phone_number: metadata.phone_number || metadata.phone || null,
        street_address: metadata.street_address || metadata.streetAddress || null,
        city: metadata.city || null,
        country: metadata.country || null,
        postal_code: metadata.postal_code || metadata.postalCode || null
      });

      if (rpcError) {
        return { error: rpcError.message };
      }

      if (!profileResult?.success) {
        return { error: profileResult?.error || 'Failed to create user profile' };
      }

      return { error: null };
    } catch (err) {
      return { error: 'Failed to create user profile' };
    }
  }

  async updateUserProfile(userId: string, updates: Partial<AuthUser>): Promise<{ error: AuthError | null; success?: boolean }> {
    try {
      const dbUpdates: Record<string, any> = {};

      if (updates.firstName) dbUpdates.first_name = updates.firstName;
      if (updates.lastName) dbUpdates.last_name = updates.lastName;
      if (updates.phone) dbUpdates.phone_number = updates.phone;
      // Note: allow clearing fields by passing empty string or null/undefined
      if (updates.streetAddress !== undefined) dbUpdates.street_address = updates.streetAddress || null;
      if (updates.city !== undefined) dbUpdates.city = updates.city || null;
      if (updates.country !== undefined) dbUpdates.country = updates.country || null;
      if (updates.postalCode !== undefined) dbUpdates.postal_code = updates.postalCode || null;
      if (updates.avatarUrl) dbUpdates.avatar_url = updates.avatarUrl;
      if (updates.profileImage !== undefined) dbUpdates.avatar_url = updates.profileImage;

      const { error } = await supabase
        .from('users')
        .update(dbUpdates)
        .eq('id', userId);

      if (error) {
        return {
          error: {
            message: error.message,
            name: 'ProfileUpdateError'
          } as AuthError,
          success: false
        };
      }

      return { error: null, success: true };
    } catch (err) {
      return {
        error: {
          message: 'Profile update failed',
          name: 'ProfileUpdateError'
        } as AuthError,
        success: false
      };
    }
  }

  async resetPassword(email: string): Promise<{ error: AuthError | null }> {
    try {
      // Build the redirect URL for password recovery
      // This should point to /auth/callback where we handle the recovery token
      const redirectUrl = `${window.location.origin}/auth/callback`;

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });
      return { error };
    } catch (err) {
      return {
        error: {
          message: 'Password reset failed',
          name: 'PasswordResetError'
        } as AuthError
      };
    }
  }

  async updatePassword(password: string): Promise<{ error: AuthError | null }> {
    try {
      const { error } = await supabase.auth.updateUser({ password });
      return { error };
    } catch (err) {
      return {
        error: {
          message: 'Password update failed',
          name: 'PasswordUpdateError'
        } as AuthError
      };
    }
  }

  async resendVerificationEmail(email: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });

      if (error) {
        return { error: error.message };
      }

      return { error: null };
    } catch (err) {
      return { error: 'Failed to resend verification email' };
    }
  }

  // Alias for resendVerificationEmail
  async resendEmailVerification(email: string): Promise<{ error: string | null }> {
    return this.resendVerificationEmail(email);
  }

  async changePassword({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }): Promise<{ error: string | null; success?: boolean }> {
    try {
      // First verify current password by attempting to sign in
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        return { error: 'No authenticated user found', success: false };
      }

      // Attempt to sign in with current password to verify it
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (signInError) {
        return { error: 'Current password is incorrect', success: false };
      }

      // Update to new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        return { error: updateError.message, success: false };
      }

      return { error: null, success: true };
    } catch (err) {
      return { error: 'Failed to change password', success: false };
    }
  }

  onAuthStateChange(callback: (event: string, session: Session | null) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }

  /**
   * Log authentication event asynchronously (non-blocking)
   * Fires and forgets - does not block user experience
   * 
   * @param eventType - Type of auth event
   * @param params - Event parameters
   * @private
   */
  private logAuthEventAsync(eventType: string, params: any): void {
    // Fire and forget - use async IIFE for proper error handling
    (async () => {
      try {
        await supabase.rpc('log_auth_event', {
          p_event_type: eventType,
          ...params
        });
      } catch (error) {
        // Only log errors in development
        if (process.env.NODE_ENV === 'development') {
          console.warn('[AuthService] Background logging failed:', error);
        }
      }
    })();
  }

  /**
   * Update user's last login timestamp asynchronously (non-blocking)
   * Fires and forgets - does not block user experience
   * 
   * @param userId - User ID
   * @private
   */
  private updateLastLoginAsync(userId: string): void {
    // Fire and forget - use async IIFE for proper error handling
    (async () => {
      try {
        await supabase.rpc('update_user_last_login', {
          p_user_id: userId,
          p_ip_address: null
        });
      } catch (error) {
        // Only log errors in development
        if (process.env.NODE_ENV === 'development') {
          console.warn('[AuthService] Background last login update failed:', error);
        }
      }
    })();
  }

  /**
   * Send login welcome email with user details and service instructions
   * This is sent asynchronously (non-blocking) on successful login
   * 
   * @param {string} userId - User ID
   * @param {string} email - User email
   * @private
   */
  private sendLoginWelcomeEmailAsync(userId: string, email: string): void {
    // Fire and forget - use async IIFE for proper error handling
    (async () => {
      try {
        await emailService.sendLoginWelcomeEmail({
          userId,
          email
        });
        console.log('📧 Login welcome email queued for:', email);
      } catch (error) {
        // Only log errors in development
        if (process.env.NODE_ENV === 'development') {
          console.warn('[AuthService] Background login welcome email failed:', error);
        }
      }
    })();
  }

  /**
   * Check account status by email BEFORE attempting login
   * This provides user-friendly feedback without authenticating
   * 
   * @param {string} email - User email to check
   * @returns {Promise<{ status: string; canLogin: boolean; message?: string }>}
   */
  async checkAccountStatus(email: string): Promise<{
    status: string | null;
    canLogin: boolean;
    message?: string;
    firstName?: string;
  }> {
    try {
      // Query users table by email (this is a public read operation)
      const { data: userData, error } = await supabase
        .from('users')
        .select('status, first_name, email')
        .eq('email', email.toLowerCase())
        .maybeSingle();

      // If there's an error querying, silently allow to proceed
      // This handles network errors, RLS issues, etc.
      if (error) {
        // Only log in development
        if (process.env.NODE_ENV === 'development') {
          console.warn('Pre-login status check failed (non-critical):', error.message);
        }
        return {
          status: null,
          canLogin: true  // Let auth handle it
        };
      }

      // If no user found, allow to proceed (will fail at auth step with proper error)
      if (!userData) {
        return {
          status: null,
          canLogin: true  // Let auth handle invalid email
        };
      }

      const accountStatus = userData.status?.toLowerCase();
      const firstName = userData.first_name;

      // Check if account is active
      if (accountStatus === 'active') {
        return {
          status: accountStatus,
          canLogin: true,
          firstName
        };
      }

      // Account is not active - provide specific message
      let message = '';
      switch (accountStatus) {
        case 'inactive':
          message = `Hi${firstName ? ' ' + firstName : ''}, your account is currently inactive. Please contact support@vanguardcargo.co to reactivate your account.`;
          break;
        case 'suspended':
          message = `Hi${firstName ? ' ' + firstName : ''}, your account has been suspended. Please contact support@vanguardcargo.co for assistance.`;
          break;
        case 'reported':
          message = `Hi${firstName ? ' ' + firstName : ''}, your account is currently under review. Please contact support@vanguardcargo.co for more information.`;
          break;
        case 'pending_verification':
          message = `Hi${firstName ? ' ' + firstName : ''}, please verify your email address before logging in. Check your inbox for the verification link.`;
          break;
        default:
          message = `Hi${firstName ? ' ' + firstName : ''}, your account status does not allow login at this time. Please contact support@vanguardcargo.co for assistance.`;
      }

      return {
        status: accountStatus,
        canLogin: false,
        message,
        firstName
      };
    } catch (err) {
      console.error('Error checking account status:', err);
      // On error, allow to proceed (will fail at auth with proper error)
      return {
        status: null,
        canLogin: true
      };
    }
  }
}

export const authService = new AuthService();
