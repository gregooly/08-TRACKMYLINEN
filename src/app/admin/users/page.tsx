'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/ToastProvider';
import { useTranslation } from '@/contexts/LanguageContext';

interface User {
  id: number;
  customer_id: number;
  username: string;
  isActive: number;
  passwordRequest: string;
  ispasswordRequest: number;
}

export default function AdminUsersPage() {
  const { showToast } = useToast();
  const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data.users || []);
    } catch (error: any) {
      showToast('error', 'Error', error.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (userId: number, currentStatus: number) => {
    try {
      const newStatus = currentStatus === 1 ? 0 : 1;
      const response = await fetch('/api/admin/users/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          userId,
          isActive: newStatus,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update user status');
      }

      showToast('success', 'Success', `User ${newStatus === 1 ? 'activated' : 'deactivated'} successfully`);
      fetchUsers();
    } catch (error: any) {
      showToast('error', 'Error', error.message || 'Failed to update user status');
    }
  };

  const handleDeleteUser = async (userId: number, username: string) => {
    if (!confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch('/api/admin/users/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete user');
      }

      showToast('success', 'Success', 'User deleted successfully');
      fetchUsers();
    } catch (error: any) {
      showToast('error', 'Error', error.message || 'Failed to delete user');
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = 
      filterStatus === 'all' ? true :
      filterStatus === 'active' ? user.isActive === 1 :
      user.isActive === 0;
    
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('users.userManagement')}</h2>
        <div className="bg-white rounded-lg shadow p-6 flex items-center justify-center h-64">
          <div className="text-center">
            <img 
              src="/svg/6-dots-spinner.svg" 
              alt="Loading..." 
              className="w-12 h-12 mx-auto mb-4"
            />
            <p className="text-gray-600">Loading users...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-3">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{t('users.userManagement')}</h2>
        <button
          onClick={fetchUsers}
          className="px-3 py-1.5 sm:px-4 sm:py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 w-full sm:w-auto"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* Search and Filter Bar */}
        <div className="p-3 sm:p-4 border-b border-gray-200">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by username..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2 lg:flex-shrink-0">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                  filterStatus === 'all'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All ({users.length})
              </button>
              <button
                onClick={() => setFilterStatus('active')}
                className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                  filterStatus === 'active'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Active ({users.filter(u => u.isActive === 1).length})
              </button>
              <button
                onClick={() => setFilterStatus('inactive')}
                className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                  filterStatus === 'inactive'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Inactive ({users.filter(u => u.isActive === 0).length})
              </button>
            </div>
          </div>
        </div>

        {/* Table - Desktop View */}
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
                  Customer ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500 text-sm">
                    No users found
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
                        <div className="flex-shrink-0 h-8 w-8">
                          <img 
                            src="/svg/user-default.svg" 
                            alt="User" 
                            className="h-8 w-8 rounded-full opacity-70"
                          />
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">{user.username}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {user.customer_id}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.isActive === 1
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {user.isActive === 1 ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleStatus(user.id, user.isActive)}
                          className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                            user.isActive === 1
                              ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                          }`}
                          title={user.isActive === 1 ? 'Deactivate' : 'Activate'}
                        >
                          {user.isActive === 1 ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id, user.username)}
                          className="px-3 py-1.5 text-xs bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                          title="Delete User"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Card View - Mobile */}
        <div className="md:hidden divide-y divide-gray-200">
          {filteredUsers.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500 text-sm">
              No users found
            </div>
          ) : (
            filteredUsers.map((user) => (
              <div key={user.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <img 
                      src="/svg/user-default.svg" 
                      alt="User" 
                      className="h-10 w-10 rounded-full opacity-70"
                    />
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{user.username}</div>
                      <div className="text-xs text-gray-500">ID: {user.id}</div>
                    </div>
                  </div>
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    user.isActive === 1
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {user.isActive === 1 ? 'Active' : 'Inactive'}
                  </span>
                </div>
                
                <div className="mb-3">
                  <span className="text-xs text-gray-500">Customer ID: </span>
                  <span className="text-xs text-gray-900 font-medium">{user.customer_id}</span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleToggleStatus(user.id, user.isActive)}
                    className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                      user.isActive === 1
                        ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {user.isActive === 1 ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    onClick={() => handleDeleteUser(user.id, user.username)}
                    className="flex-1 px-3 py-2 text-xs font-medium bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer with count */}
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
          <p className="text-xs sm:text-sm text-gray-600">
            Showing <span className="font-semibold">{filteredUsers.length}</span> of{' '}
            <span className="font-semibold">{users.length}</span> users
          </p>
        </div>
      </div>
    </div>
  );
}

