'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/ToastProvider';
import ConfirmModal from '@/components/ui/ConfirmModal';

interface AppUser {
  id: number;
  customer_id: number;
  username: string;
  machine_number: string;
  created_at: string;
}

/** Format 16-char machine id as XXXX-XXXX-XXXX-XXXX */
function formatMachineNumber(raw: string): string {
  const cleaned = raw.replace(/[^A-Za-z0-9]/g, '').slice(0, 16);
  const parts = cleaned.match(/.{1,4}/g);
  return parts ? parts.join('-') : '';
}

/** Strip hyphens / non-alnum for API/DB (16 chars) */
function rawMachineNumber(formatted: string): string {
  return formatted.replace(/[^A-Za-z0-9]/g, '').slice(0, 16);
}

export default function AppUsersManagementPage() {
  const { showToast } = useToast();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    machineNumber: '',
  });
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<AppUser | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/app/users', {
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to fetch app users');
      }

      const data = await response.json();
      setUsers(data.users || []);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to load app users';
      showToast('error', 'Error', message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === 'machineNumber' ? formatMachineNumber(value) : value,
    }));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.username.trim().length < 3) {
      showToast('error', 'Invalid Username', 'Username must be at least 3 characters.');
      return;
    }

    const machineRaw = rawMachineNumber(formData.machineNumber);

    if (machineRaw.length !== 16) {
      showToast(
        'error',
        'Invalid Machine Number',
        'Machine number must be exactly 16 letters or digits.'
      );
      return;
    }

    if (!/^[A-Za-z0-9]{16}$/.test(machineRaw)) {
      showToast(
        'error',
        'Invalid Machine Number',
        'Machine number must contain only letters and digits.'
      );
      return;
    }

    setSubmitLoading(true);
    try {
      const response = await fetch('/api/app/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          username: formData.username.trim(),
          machineNumber: machineRaw,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Registration failed');
      }

      showToast('success', 'Registered', 'App user registered successfully.');
      setFormData({ username: '', machineNumber: '' });
      await fetchUsers();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to register app user';
      showToast('error', 'Registration Failed', message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;

    try {
      const response = await fetch(`/api/app/users?id=${userToDelete.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to delete app user');
      }

      showToast('success', 'Deleted', 'App user deleted successfully.');
      await fetchUsers();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to delete app user';
      showToast('error', 'Error', message);
    } finally {
      setDeleteModalOpen(false);
      setUserToDelete(null);
    }
  };

  const filteredUsers = users.filter((user) => {
    const q = searchTerm.toLowerCase();
    const qRaw = q.replace(/[^a-z0-9]/g, '');
    return (
      user.username.toLowerCase().includes(q) ||
      user.machine_number.toLowerCase().includes(qRaw) ||
      formatMachineNumber(user.machine_number).toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">App Users</h2>
        <div className="bg-white rounded-lg shadow p-6 flex items-center justify-center h-64">
          <div className="text-center">
            <img
              src="/svg/6-dots-spinner.svg"
              alt="Loading..."
              className="w-12 h-12 mx-auto mb-4"
            />
            <p className="text-gray-600">Loading app users...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-3">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">App Users</h2>
        <button
          type="button"
          onClick={fetchUsers}
          className="px-3 py-1.5 sm:px-4 sm:py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 w-full sm:w-auto"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Refresh
        </button>
      </div>

      {/* Register form */}
      <div className="bg-white rounded-lg shadow p-3 sm:p-4 mb-4">
        <h3 className="text-sm sm:text-base font-semibold text-gray-800 mb-3 border-b border-gray-200 pb-2">
          Register App Device
        </h3>
        <form
          onSubmit={handleRegister}
          className="flex flex-col lg:flex-row lg:items-end gap-3"
        >
          <div className="flex-1 min-w-0">
            <label
              htmlFor="username"
              className="block text-sm font-medium text-gray-700 mb-1"
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
              className="w-full h-10 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
              placeholder="Username"
            />
          </div>
          <div className="flex-[2] min-w-0">
            <label
              htmlFor="machineNumber"
              className="block text-sm font-medium text-gray-700 mb-1"
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
              maxLength={19}
              className="w-full h-10 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-green-500 font-mono tracking-wider"
              placeholder="0000-0000-0000-0000"
            />
          </div>
          <div className="w-full lg:w-auto lg:flex-shrink-0">
            <button
              type="submit"
              disabled={submitLoading}
              className="w-full lg:w-auto h-10 px-6 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {submitLoading ? 'Registering...' : 'Register'}
            </button>
          </div>
        </form>
        <p className="text-xs text-gray-500 mt-2">
          Format: 0000-0000-0000-0000 (
          {rawMachineNumber(formData.machineNumber).length}/16 characters)
        </p>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-3 sm:p-4 border-b border-gray-200">
          <input
            type="text"
            placeholder="Search by username or machine number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
          />
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Username
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Machine Number
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Customer ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500 text-sm">
                    No app users found
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {user.id}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <img
                          src="/svg/user-default.svg"
                          alt="User"
                          className="h-8 w-8 rounded-full opacity-70"
                        />
                        <div className="ml-3 text-sm font-medium text-gray-900">
                          {user.username}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-gray-700">
                      {formatMachineNumber(user.machine_number)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {user.customer_id}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {user.created_at
                        ? new Date(user.created_at).toLocaleString()
                        : '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                      <button
                        type="button"
                        onClick={() => {
                          setUserToDelete(user);
                          setDeleteModalOpen(true);
                        }}
                        className="px-3 py-1.5 text-xs bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="md:hidden divide-y divide-gray-200">
          {filteredUsers.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500 text-sm">
              No app users found
            </div>
          ) : (
            filteredUsers.map((user) => (
              <div key={user.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <img
                      src="/svg/user-default.svg"
                      alt="User"
                      className="h-10 w-10 rounded-full opacity-70"
                    />
                    <div>
                      <div className="text-sm font-semibold text-gray-900">
                        {user.username}
                      </div>
                      <div className="text-xs text-gray-500">ID: {user.id}</div>
                    </div>
                  </div>
                </div>
                <div className="mb-1 text-xs text-gray-600">
                  Machine:{' '}
                  <span className="font-mono text-gray-900">
                    {formatMachineNumber(user.machine_number)}
                  </span>
                </div>
                <div className="mb-3 text-xs text-gray-600">
                  Customer ID: <span className="text-gray-900">{user.customer_id}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setUserToDelete(user);
                    setDeleteModalOpen(true);
                  }}
                  className="w-full px-3 py-2 text-xs font-medium bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                >
                  Delete
                </button>
              </div>
            ))
          )}
        </div>

        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
          <p className="text-xs sm:text-sm text-gray-600">
            Showing <span className="font-semibold">{filteredUsers.length}</span> of{' '}
            <span className="font-semibold">{users.length}</span> app users
          </p>
        </div>
      </div>

      <ConfirmModal
        isOpen={deleteModalOpen}
        title="Delete App User"
        message={
          userToDelete
            ? `Are you sure you want to delete app user "${userToDelete.username}" (${formatMachineNumber(userToDelete.machine_number)})?`
            : 'Are you sure you want to delete this app user?'
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => {
          setDeleteModalOpen(false);
          setUserToDelete(null);
        }}
      />
    </div>
  );
}
