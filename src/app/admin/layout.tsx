'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useToast } from '@/components/ui/ToastProvider';
import LanguageToggle from '@/components/ui/LanguageToggle';
import { useTranslation } from '@/contexts/LanguageContext';

const menuItemDefs = [
  { id: 'dashboard', labelKey: 'nav.dashboard', path: '/admin', icon: '/svg/dashboard.svg' },
  { id: 'settings', labelKey: 'nav.settings', path: '/admin/settings', icon: '/svg/setting.svg' },
  { id: 'import', labelKey: 'nav.importCsv', path: '/admin/import', icon: '/svg/import.svg' },
  { id: 'inventory', labelKey: 'nav.inventory', path: '/admin/inventory', icon: '/svg/inventory.svg' },
  { id: 'history', labelKey: 'nav.history', path: '/admin/history', icon: '/svg/history.svg' },
  { id: 'apikey', labelKey: 'nav.apiKey', path: '/admin/apikey', icon: '/svg/key.svg' },
  { id: 'users', labelKey: 'nav.users', path: '/admin/users', icon: '/svg/users.svg' },
  { id: 'app-users', labelKey: 'nav.appUsers', path: '/admin/app-users', icon: '/svg/user_check.svg' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const menuItems = useMemo(
    () =>
      menuItemDefs.map((item) => ({
        ...item,
        label: t(item.labelKey),
      })),
    [t]
  );

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('userRole');

    if (!token || userRole !== 'admin') {
      router.push('/?error=unauthorized');
      return;
    }

    setLoading(false);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userRole');
    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    document.cookie = 'userRole=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    showToast('info', t('layout.loggedOutTitle'), t('layout.loggedOutMessage'));
    setTimeout(() => {
      router.push('/');
    }, 500);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <img
            src="/svg/6-dots-spinner.svg"
            alt={t('common.loading')}
            className="w-16 h-16 mx-auto"
          />
          <p className="mt-4 text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gray-50 overflow-hidden">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`
        bg-white shadow-lg transition-all duration-300 flex-shrink-0 overflow-hidden
        md:relative inset-y-0 left-0 z-50
        ${sidebarOpen ? 'w-64 fixed' : 'w-16 relative'}
      `}
      >
        <div className="h-full overflow-y-auto">
          <div className="border-b border-gray-200 h-18 flex items-center justify-center ">
            <img
              src={sidebarOpen ? '/trackmylinen-logo.png' : '/trackmylinen-square.png'}
              alt={t('common.logoAlt')}
              className="w-auto transition-all duration-300 h-16 "
            />
          </div>

          <nav className={`${sidebarOpen ? 'p-4' : 'p-2'}`}>
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => router.push(item.path)}
                className={`w-full flex items-center mb-4 rounded-full transition-colors ${
                  sidebarOpen ? 'px-4 py-1.5 justify-start' : 'px-2 py-3 justify-center'
                } ${
                  pathname === item.path
                    ? 'bg-green-50 text-green-700 border border-green-400'
                    : 'text-gray-600 border border-transparent hover:bg-green-50 hover:border hover:border-green-200'
                }`}
                title={!sidebarOpen ? item.label : ''}
              >
                <img
                  src={item.icon}
                  alt={item.label}
                  className={`flex-shrink-0 transition-all duration-300 ${
                    sidebarOpen ? 'w-6 h-6 mr-3' : 'w-6 h-6'
                  } ${pathname === item.path ? 'brightness-0 saturate-100' : 'opacity-70'}`}
                  style={
                    pathname === item.path
                      ? {
                          filter:
                            'invert(37%) sepia(96%) saturate(446%) hue-rotate(82deg) brightness(94%) contrast(92%)',
                        }
                      : {}
                  }
                />
                {sidebarOpen && <span className="text-md font-semibold">{item.label}</span>}
              </button>
            ))}
          </nav>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white shadow-sm border-b border-gray-200 h-18 flex-shrink-0">
          <div className="h-full px-6 flex justify-between items-center">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label={t('common.toggleSidebar')}
              >
                <svg
                  className="w-6 h-6 text-gray-700"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
            </div>
            <div className="flex items-center space-x-4">
              <LanguageToggle />
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-9 h-9 rounded-fullflex items-center justify-center">
                    <img
                      src="/svg/user-default.svg"
                      alt="user-icon"
                      className="w-9 h-9 opacity-70"
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-800">{t('common.admin')}</span>
                  <svg
                    className={`w-4 h-4 text-gray-600 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {dropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20">
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          handleLogout();
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                      >
                        <img
                          src="/svg/logout.svg"
                          alt="logout"
                          className="w-6 h-6 mr-3 opacity-60"
                        />
                        <span>{t('common.logout')}</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
