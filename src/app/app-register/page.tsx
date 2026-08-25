'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/ToastProvider';

export default function AppRegisterPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    adminEmail: '',
    username: '',
    machineNumber: '',
  });
  const [submitLoading, setSubmitLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'machineNumber' ? value.slice(0, 16) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.machineNumber.length !== 16) {
      showToast(
        'error',
        'Invalid Machine Number',
        'Machine number must be exactly 16 letters or digits.'
      );
      return;
    }

    if (!/^[A-Za-z0-9]{16}$/.test(formData.machineNumber)) {
      showToast(
        'error',
        'Invalid Machine Number',
        'Machine number must contain only letters and digits.'
      );
      return;
    }

    setSubmitLoading(true);
    try {
      const response = await fetch('/api/app/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminEmail: formData.adminEmail.trim(),
          username: formData.username.trim(),
          machineNumber: formData.machineNumber,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Registration failed');
      }

      showToast(
        'success',
        'Registered',
        'App device registered successfully. You can sign in from the app.'
      );
      setFormData({ adminEmail: '', username: '', machineNumber: '' });
      router.push('/');
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to register app user.';
      showToast('error', 'Registration Failed', message);
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: '#b1bcd4' }}
    >
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md p-6 sm:p-8">
        <h1 className="text-xl font-semibold text-gray-800 mb-2 text-center">
          App Device Registration
        </h1>
        <p className="text-sm text-gray-500 mb-6 text-center">
          Register with your manager email, username, and 16-character machine
          number.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="adminEmail"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Manager Email *
            </label>
            <input
              type="email"
              id="adminEmail"
              name="adminEmail"
              value={formData.adminEmail}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-500 text-sm"
              placeholder="manager@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Username *
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              minLength={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-500 text-sm"
              placeholder="Username"
            />
          </div>

          <div>
            <label
              htmlFor="machineNumber"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Machine Number * (16 characters)
            </label>
            <input
              type="text"
              id="machineNumber"
              name="machineNumber"
              value={formData.machineNumber}
              onChange={handleChange}
              required
              maxLength={16}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-500 text-sm font-mono tracking-wider"
              placeholder="XXXXXXXXXXXXXXXX"
            />
            <p className="text-xs text-gray-500 mt-1">
              {formData.machineNumber.length}/16 — letters and digits only
            </p>
          </div>

          <button
            type="submit"
            disabled={submitLoading}
            className="w-full bg-gray-900 text-white font-semibold py-2 px-6 rounded-lg hover:bg-black focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {submitLoading ? 'Registering...' : 'Register Device'}
          </button>

          <button
            type="button"
            onClick={() => router.push('/')}
            className="w-full text-sm text-gray-600 hover:text-gray-900 py-2"
          >
            Back to Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
