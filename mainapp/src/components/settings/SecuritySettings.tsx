import { useState } from 'react';
import { MdOutlineLockPerson } from 'react-icons/md';
import { authService } from '../../services/authService';
import { useReduxAuth as useAuth } from '../../hooks/useReduxAuth';

/**
 * SecuritySettings Component
 * 
 * Professional security settings page with password management
 * Features: Password change, strength indicator, reset options, security tips
 * 
 * Design: Matches the styling pattern of other settings components
 */
function SecuritySettings() {
  const { user } = useAuth();
  
  // Password state
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showResetOption, setShowResetOption] = useState(false);

  // Password strength checker
  const getPasswordStrength = (password: string) => {
    let strength = 0;
    const checks = {
      length: password.length >= 6,
      number: /\d/.test(password),
    };

    strength = Object.values(checks).filter(Boolean).length;
    
    if (strength === 0) return { level: 'weak', color: 'red', text: 'Too Weak' };
    if (strength === 1) return { level: 'medium', color: 'yellow', text: 'Acceptable' };
    return { level: 'strong', color: 'green', text: 'Good' };
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswords(prev => ({ ...prev, [name]: value }));
    // Clear messages on input change
    setError(null);
    setSuccessMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Check if user is authenticated
    if (!user) {
      setError('User not authenticated');
      return;
    }

    // Basic validation
    if (!passwords.currentPassword) {
      setError('Current password is required');
      return;
    }

    if (!passwords.newPassword) {
      setError('New password is required');
      return;
    }

    if (!passwords.confirmPassword) {
      setError('Please confirm your new password');
      return;
    }

    // Check if passwords match
    if (passwords.newPassword !== passwords.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    // Check password strength
    if (passwords.newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (!/\d/.test(passwords.newPassword)) {
      setError('Password must contain at least one number');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);
      
      console.log('🔒 Attempting to change password...');
      
      const response = await authService.changePassword({
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword
      });
      
      console.log('🔒 Password change response:', response);
      
      if (response.success) {
        console.log('✅ Password changed successfully!');
        setSuccessMessage('Password changed successfully!');
        // Clear form
        setPasswords({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        // Auto-clear success message after 5 seconds
        setTimeout(() => setSuccessMessage(null), 5000);
      } else {
        console.error('❌ Password change failed:', response.error);
        setError(response.error || 'Failed to change password');
      }
    } catch (err) {
      console.error('❌ Password change exception:', err);
      setError('Failed to change password. Please try again.');
    } finally {
      setLoading(false);
      console.log('🔒 Password change process complete');
    }
  };

  const handlePasswordReset = async () => {
    if (!user?.email) {
      setError('User email not found');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const { error } = await authService.resetPassword(user.email);
      
      if (error) {
        setError(error.message || 'Failed to send password reset email');
      } else {
        setSuccessMessage('Password reset email sent! Check your inbox.');
        setShowResetOption(false);
      }
    } catch (err) {
      setError('Failed to send password reset email');
      console.error('Password reset error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Header - matches NotificationSettings and PreferencesSettings style */}
      <div className="flex items-center gap-3 mb-6">
        <MdOutlineLockPerson className="text-xl" />
        <h2 className="text-lg font-semibold">Security Settings</h2>
      </div>
      
      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Success Alert */}
      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 text-sm">{successMessage}</p>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Current Password */}
        <div>
          <label htmlFor="currentPassword" className="block text-sm font-semibold text-gray-700 mb-2">
            Current Password <span className="text-red-500">*</span>
          </label>
          <input
            type="password"
            id="currentPassword"
            name="currentPassword"
            value={passwords.currentPassword}
            onChange={handlePasswordChange}
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
            placeholder="Enter current password"
          />
        </div>

        {/* New Password */}
        <div>
          <label htmlFor="newPassword" className="block text-sm font-semibold text-gray-700 mb-2">
            New Password <span className="text-red-500">*</span>
          </label>
          <input
            type="password"
            id="newPassword"
            name="newPassword"
            value={passwords.newPassword}
            onChange={handlePasswordChange}
            required
            minLength={6}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
            placeholder="Enter new password"
          />
          {passwords.newPassword && (
            <div className="mt-2">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-gray-200 rounded">
                  <div 
                    className={`h-full rounded transition-all duration-300 ${
                      getPasswordStrength(passwords.newPassword).color === 'red' ? 'bg-red-500 w-1/4' :
                      getPasswordStrength(passwords.newPassword).color === 'yellow' ? 'bg-yellow-500 w-2/4' :
                      'bg-green-500 w-full'
                    }`}
                  />
                </div>
                <span className={`text-xs font-medium ${
                  getPasswordStrength(passwords.newPassword).color === 'red' ? 'text-red-600' :
                  getPasswordStrength(passwords.newPassword).color === 'yellow' ? 'text-yellow-600' :
                  'text-green-600'
                }`}>
                  {getPasswordStrength(passwords.newPassword).text}
                </span>
              </div>
            </div>
          )}
          <p className="text-xs text-gray-500 mt-1">
            Password should be at least 6 characters and contain a number
          </p>
        </div>

        {/* Confirm Password */}
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-2">
            Confirm New Password <span className="text-red-500">*</span>
          </label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            value={passwords.confirmPassword}
            onChange={handlePasswordChange}
            required
            minLength={6}
            className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all ${
              passwords.confirmPassword && passwords.newPassword && passwords.confirmPassword !== passwords.newPassword
                ? 'border-red-500 focus:ring-red-500' 
                : 'border-gray-300 focus:ring-red-500 focus:border-transparent'
            }`}
            placeholder="Confirm new password"
          />
          {passwords.confirmPassword && passwords.newPassword && (
            <p className={`text-xs mt-1 ${
              passwords.confirmPassword === passwords.newPassword 
                ? 'text-green-600' 
                : 'text-red-600'
            }`}>
              {passwords.confirmPassword === passwords.newPassword 
                ? '✓ Passwords match' 
                : '✗ Passwords do not match'}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || (!!passwords.newPassword && !!passwords.confirmPassword && passwords.newPassword !== passwords.confirmPassword)}
          className="px-6 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Changing Password...' : 'Change Password'}
        </button>
      </form>

      {/* Password Reset Option */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <h3 className="text-base font-medium text-gray-900 mb-2">Forgot Your Current Password?</h3>
        <p className="text-sm text-gray-500 mb-4">
          If you don't remember your current password, you can reset it via email instead.
        </p>
        {!showResetOption ? (
          <button
            onClick={() => setShowResetOption(true)}
            className="text-red-600 hover:text-red-800 text-sm font-medium hover:underline transition-colors"
          >
            Reset Password via Email
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              This will send a password reset link to your email: <strong>{user?.email}</strong>
            </p>
            <div className="flex space-x-3">
              <button
                onClick={handlePasswordReset}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Sending...' : 'Send Reset Email'}
              </button>
              <button
                onClick={() => setShowResetOption(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Security Tips */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <h3 className="text-base font-medium text-gray-900 mb-4">Security Tips</h3>
        <ul className="text-sm text-gray-600 space-y-2">
          <li className="flex items-start">
            <span className="inline-block w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
            Use a unique password that you don't use on other websites
          </li>
          <li className="flex items-start">
            <span className="inline-block w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
            Include uppercase and lowercase letters, numbers, and symbols
          </li>
          <li className="flex items-start">
            <span className="inline-block w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
            Avoid using personal information like your name or birthday
          </li>
          <li className="flex items-start">
            <span className="inline-block w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
            Consider using a password manager to generate and store strong passwords
          </li>
        </ul>
      </div>
    </div>
  );
}

export default SecuritySettings;