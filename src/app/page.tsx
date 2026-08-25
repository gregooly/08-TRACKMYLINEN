'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/components/ui/ToastProvider';

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const [isLogin, setIsLogin] = useState(true);
  const [userRole, setUserRole] = useState<'admin' | 'agent'>('agent');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
    confirmPassword: '',
  });
  const [submitLoading, setSubmitLoading] = useState(false);
  const [hasShownError, setHasShownError] = useState(false);

  // Clear invalid tokens on mount
  useEffect(() => {
    const errorParam = searchParams.get('error');
   
      // Clear localStorage and cookies for invalid tokens
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('userRole');
      document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      document.cookie = 'userRole=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    
  }, []);

  useEffect(() => {
    // Prevent showing toasts multiple times
    if (hasShownError) return;

    if (searchParams.get('registered') === 'true') {
      showToast('success', 'Account Created!', 'Your account has been created successfully! Please sign in.');
      setIsLogin(true);
      setHasShownError(true);
      // Clear the URL parameter
      router.replace('/');
      return;
    }
    
    // Handle error messages from middleware
    const errorParam = searchParams.get('error');
    if (errorParam) {
      if (errorParam === 'unauthorized') {
        showToast('warning', 'Authentication Required', 'You must be logged in to access that page.');
      } else if (errorParam === 'forbidden') {
        showToast('error', 'Access Denied', 'You do not have permission to access that page.');
      } else if (errorParam === 'invalid_token') {
        showToast('warning', 'Session Expired', 'Your session has expired. Please sign in again.');
      }
      setHasShownError(true);
      // Clear the URL parameter
      router.replace('/');
    }
  }, [searchParams]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLoginClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setSubmitLoading(true);

    try {
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Important: This allows cookies to be sent and received
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          role: userRole,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Sign in failed');
      }

      // Store token in localStorage
      if (data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('userRole', userRole);
        
        // Show success toast
        showToast('success', 'Welcome Back!', `Successfully signed in as ${userRole}.`);

        // Redirect based on role
        const redirectPath = userRole === 'admin' ? '/admin' : '/agent';
        
        // Check if cookies are set before redirecting
        const checkCookiesAndRedirect = () => {
          const cookies = document.cookie;
          const hasToken = cookies.includes('token=');
          const hasRole = cookies.includes('userRole=');
          
          if (hasToken && hasRole) {
            window.location.href = redirectPath;
          } else {
            // If cookies not set after timeout, try anyway
            window.location.href = redirectPath;
          }
        };
        
        // Wait a bit for cookies to be set, then check and redirect
        setTimeout(checkCookiesAndRedirect, 1500);
      } else {
        throw new Error('No token received');
      }
    } catch (err: any) {
      showToast('error', 'Sign In Failed', err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleRegisterClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      showToast('error', 'Password Mismatch', 'Passwords do not match. Please try again.');
      return;
    }

    // Validate password strength
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(formData.password)) {
      showToast('error', 'Weak Password', 'Password must be at least 8 characters with uppercase, lowercase, and number.');
      return;
    }

    setSubmitLoading(true);

    try {
      // Register the new user (server will verify admin email with PulsePoint)
      const response = await fetch('/api/register-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adminEmail: formData.email,
          username: formData.username,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      if (data.success) {
        showToast('success', 'Registration Successful!', 'Account pending approval. Please sign in.');
        setIsLogin(true);
        // Clear form
        setFormData({
          email: '',
          password: '',
          username: '',
          confirmPassword: '',
        });
      } else {
        throw new Error(data.message || 'Registration failed');
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      showToast('error', 'Registration Failed', err.message || 'Failed to register. Please try again.');
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
     <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#b1bcd4' }}>
      {/* Responsive Login Card */}
      <div className="bg-white rounded-lg shadow-2xl overflow-hidden w-full max-w-6xl mx-auto">
        <div className="flex flex-col xl:flex-row min-h-[500px] xl:min-h-[600px]">
          {/* Image Section - Always visible, responsive positioning */}
          <div className="xl:w-2/5 w-full flex items-center justify-center p-4 xl:p-6 bg-gradient-to-br from-purple-500 via-purple-600 to-indigo-600">
            <div className="w-full h-full flex items-center justify-center">
              <img 
                src="/trackmylinen-logo.png" 
                alt="trackmylinen Logo" 
                className="w-full max-w-xs xl:max-w-full h-auto xl:max-h-full object-contain"
              />
            </div>
          </div>

          {/* Form Section */}
          <div className="xl:w-3/5 w-full px-4 sm:px-6 xl:px-8 py-6 xl:py-8 flex flex-col justify-center">
            <div className="max-w-md mx-auto w-full">
              <div className="text-center mb-4 xl:mb-6 relative">
                <h1 className="text-lg sm:text-xl xl:text-2xl font-semibold text-gray-800 mb-2">
                  {isLogin ? 'Sign in to Your Account' : 'Create Your Account'}
                </h1>
                
                {/* Admin/Delegate Toggle Button - Only on Sign In */}
                {isLogin && (
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex justify-center">
                      <div className="inline-flex items-center gap-2 bg-gray-100 rounded-full p-1">
                        <button
                          onClick={() => setUserRole('admin')}
                          className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                            userRole === 'admin'
                              ? 'bg-gray-900 text-white shadow-sm'
                              : 'bg-transparent text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          Admin
                        </button>
                        <button
                          onClick={() => setUserRole('agent')}
                          className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                            userRole === 'agent'
                              ? 'bg-gray-900 text-white shadow-sm'
                              : 'bg-transparent text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          Agent
                        </button>
                      </div>
                    </div>
                    {userRole === 'admin' && (
                      <p className="text-xs text-gray-600 ">
                        You must sign up with a pulsepoint account.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {isLogin ? (
                // Login Form
                <div className="space-y-4 xl:space-y-2">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      {userRole === 'admin' ? 'Manager Email' : 'Username'}
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full text-sm px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-500 transition-colors"
                      placeholder={userRole === 'admin' ? 'Enter your manager email' : 'Enter your username'}
                    />
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                      Password
                    </label>
                    <input
                      type="password"
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      className="w-full text-sm px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-500 transition-colors"
                      placeholder="Enter your password"
                    />
                  </div>
                  <div className='pt-8'>
                       <button
                          onClick={handleLoginClick}
                          disabled={submitLoading}
                          className="w-full  bg-gray-900 text-white font-semibold py-2 px-6 rounded-lg hover:bg-black focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                          {submitLoading ? 'Signing In...' : 'Sign In'}
                        </button>
                  </div>
                 
                </div>
              ) : (
                // Registration Form
                <div className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      Manager Email *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-500 transition-colors text-sm"
                      placeholder="Email address"
                    />
                  </div>

                  <div>
                    <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                      Username *
                    </label>
                    <input
                      type="text"
                      id="username"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-500 transition-colors text-sm"
                      placeholder="Username"
                    />
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                      Password *
                    </label>
                    <input
                      type="password"
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-500 transition-colors text-sm"
                      placeholder="Password"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Min 8 characters with uppercase, lowercase, and number
                    </p>
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm Password *
                    </label>
                    <input
                      type="password"
                      id="confirmPassword"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-500 transition-colors text-sm"
                      placeholder="Confirm password"
                    />
                  </div>

                  <button
                    onClick={handleRegisterClick}
                    disabled={submitLoading}
                    className="w-full bg-gray-900 text-white font-semibold py-2 px-6 rounded-lg hover:bg-black focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {submitLoading ? 'Creating Account...' : 'Create Account'}
                  </button>
                </div>
              )}

              <div className="mt-1 ">
                <p className="text-gray-600 text-sm">
                  {isLogin ? "Don't have an account? " : "Already have an account? "}
                  <button 
                    onClick={() => setIsLogin(!isLogin)}
                    className="text-gray-700 hover:text-black font-medium"
                  >
                    {isLogin ? 'Register' : 'Sign in here'}
                  </button>
                </p>
                {isLogin && (
                  <p className="text-gray-600 text-sm mt-2">
                    Register an app device?{' '}
                    <a
                      href="/app-register"
                      className="text-gray-700 hover:text-black font-medium"
                    >
                      App registration
                    </a>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#b1bcd4' }}>
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}




