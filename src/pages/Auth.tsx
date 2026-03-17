import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { logFormSubmission } from '../lib/supabase';
import { Mail, Lock, AlertCircle } from 'lucide-react';

type AuthProps = {
  mode: 'login' | 'register';
  onNavigate: (page: string) => void;
};

export function Auth({ mode, onNavigate }: AuthProps) {
  const { signIn, signUp } = useAuth();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (mode !== 'login') return;

    const flash = localStorage.getItem('auth_notice');
    if (flash) {
      setMessage(flash);
      localStorage.removeItem('auth_notice');
    }
  }, [mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (mode === 'register') {
        if (!fullName.trim()) {
          throw new Error('Full name is required');
        }
        if (!/^[0-9+()\-\s]{8,20}$/.test(phone.trim())) {
          throw new Error('Please enter a valid phone number');
        }
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match');
        }
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters');
        }
        await signUp(email.trim().toLowerCase(), password, {
          fullName: fullName.trim(),
          phone: phone.trim(),
        });
        setFullName('');
        setPhone('');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        await logFormSubmission({
          userId: null,
          formType: 'auth_register',
          payload: {
            full_name: fullName.trim(),
            phone: phone.trim(),
            email: email.trim().toLowerCase(),
            password_length: password.length,
          },
          status: 'success',
        });
        localStorage.setItem('auth_notice', 'Registration successful. Please sign in with your credentials.');
        onNavigate('login');
      } else {
        await signIn(email.trim().toLowerCase(), password);
        await logFormSubmission({
          userId: null,
          formType: 'auth_login',
          payload: {
            email: email.trim().toLowerCase(),
            password_length: password.length,
          },
          status: 'success',
        });
        setEmail('');
        setPassword('');
        onNavigate('products');
      }
    } catch (err) {
      await logFormSubmission({
        userId: null,
        formType: mode === 'register' ? 'auth_register' : 'auth_login',
        payload: {
          full_name: fullName.trim(),
          phone: phone.trim(),
          email: email.trim().toLowerCase(),
          password_length: password.length,
        },
        status: 'error',
        errorMessage: err instanceof Error ? err.message : 'Unknown auth error',
      });
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 rk-fade-up">
      <div className="w-full max-w-md">
        <div className="rk-card p-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2 text-center">
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </h1>
          <p className="text-slate-600 text-center mb-6">
            {mode === 'login'
              ? 'Access your bookings and manage orders'
              : 'Join R.K. Textiles to start booking'}
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {message && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
              <p className="text-sm text-emerald-700">{message}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <div className="relative">
                <Mail className="w-5 h-5 text-gray-400 absolute left-3 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="rk-input pl-10"
                  placeholder="your@email.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <div className="relative">
                <Lock className="w-5 h-5 text-gray-400 absolute left-3 top-3" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="rk-input pl-10"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="rk-input"
                    placeholder="Your full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    className="rk-input"
                    placeholder="10-digit phone number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="w-5 h-5 text-gray-400 absolute left-3 top-3" />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="rk-input pl-10"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rk-btn-primary"
            >
              {loading ? 'Processing...' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-slate-600">
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button
                onClick={() => onNavigate(mode === 'login' ? 'register' : 'login')}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                {mode === 'login' ? 'Sign Up' : 'Sign In'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
