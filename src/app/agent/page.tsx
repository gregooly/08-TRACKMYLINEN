'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/contexts/LanguageContext';

// Helper function to decode JWT token
function decodeToken(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
}

interface DashboardStats {
  totalItems: number;
  totalCategories: number;
  totalLocations: number;
  totalStatuses: number;
  totalUsers: number;
  inventoryCount: number;
  historyCount: number;
  confirmedCount: number;
  atRiskCount: number;
}

interface BreakdownItem {
  name: string;
  count: number;
}

interface RecentActivity {
  id: number;
  itemName: string;
  tag: string;
  category: string;
  location: string;
  status: string;
  date: string;
}

interface AtRiskItem {
  id: number;
  itemName: string;
  tag: string;
  category: string;
  location: string;
  status: string;
  lastCheckDate: string;
  daysSinceLastCheck: number;
}

export default function AgentPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [user, setUser] = useState<any>(null);
  const [adminId, setAdminId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [breakdown, setBreakdown] = useState<{
    byStatus: BreakdownItem[];
    byCategory: BreakdownItem[];
    byLocation: BreakdownItem[];
    byConfirmation: BreakdownItem[];
  } | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [atRiskItems, setAtRiskItems] = useState<AtRiskItem[]>([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    // Decode token to get administrator ID
    const decodedToken = decodeToken(token || '');
    if (decodedToken) {
      setAdminId(decodedToken.userId);
    }

    if (userData) {
      setUser(JSON.parse(userData));
    }

    fetchDashboardStats();
  }, [router]);

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch('/api/dashboard-stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
        setBreakdown(data.breakdown);
        setRecentActivity(data.recentActivity);
        setAtRiskItems(data.atRiskItems || []);
      }
    } catch (error) {
      // Silent fail - dashboard will show empty state
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <img src="/svg/6-dots-spinner.svg" alt="Loading..." className="w-12 h-12" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }
      `}</style>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold ">
            {t('dashboard.title')}
          </h2>
         
        </div>
        <button
          onClick={fetchDashboardStats}
          className="group px-3 sm:px-5 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white text-sm rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-300 flex items-center gap-2 font-medium"
        >
          <svg className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span className="hidden sm:inline">{t('common.refresh')}</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total Inventory */}
        <div className="group relative bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 rounded-xl shadow-md hover:shadow-lg p-4 text-white transition-all duration-300 hover:scale-105 overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white opacity-5 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative z-10">
            <p className="text-blue-100 text-xs font-medium flex items-center gap-1.5 mb-2">
              <span className="w-1.5 h-1.5 bg-blue-200 rounded-full animate-pulse"></span>
              {t('dashboard.totalInventory')}
            </p>
            <p className="text-2xl font-extrabold tracking-tight">{stats?.inventoryCount || 0}</p>
          </div>
        </div>

        {/* Total Items */}
        <div className="group relative bg-gradient-to-br from-green-500 via-green-600 to-emerald-700 rounded-xl shadow-md hover:shadow-lg p-4 text-white transition-all duration-300 hover:scale-105 overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white opacity-5 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative z-10">
            <p className="text-green-100 text-xs font-medium flex items-center gap-1.5 mb-2">
              <span className="w-1.5 h-1.5 bg-green-200 rounded-full animate-pulse"></span>
              {t('dashboard.totalItems')}
            </p>
            <p className="text-2xl font-extrabold tracking-tight">{stats?.totalItems || 0}</p>
          </div>
        </div>

        {/* Total Categories */}
        <div className="group relative bg-gradient-to-br from-purple-500 via-purple-600 to-indigo-700 rounded-xl shadow-md hover:shadow-lg p-4 text-white transition-all duration-300 hover:scale-105 overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white opacity-5 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative z-10">
            <p className="text-purple-100 text-xs font-medium flex items-center gap-1.5 mb-2">
              <span className="w-1.5 h-1.5 bg-purple-200 rounded-full animate-pulse"></span>
              {t('dashboard.categories')}
            </p>
            <p className="text-2xl font-extrabold tracking-tight">{stats?.totalCategories || 0}</p>
          </div>
        </div>

        {/* History Records */}
        <div className="group relative bg-gradient-to-br from-orange-500 via-orange-600 to-red-600 rounded-xl shadow-md hover:shadow-lg p-4 text-white transition-all duration-300 hover:scale-105 overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white opacity-5 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative z-10">
            <p className="text-orange-100 text-xs font-medium flex items-center gap-1.5 mb-2">
              <span className="w-1.5 h-1.5 bg-orange-200 rounded-full animate-pulse"></span>
              {t('dashboard.historyRecords')}
            </p>
            <p className="text-2xl font-extrabold tracking-tight">{stats?.historyCount || 0}</p>
          </div>
        </div>

        {/* Locations */}
        <div className="group relative bg-gradient-to-br from-teal-500 via-teal-600 to-cyan-700 rounded-xl shadow-md hover:shadow-lg p-4 text-white transition-all duration-300 hover:scale-105 overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white opacity-5 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative z-10">
            <p className="text-teal-100 text-xs font-medium flex items-center gap-1.5 mb-2">
              <span className="w-1.5 h-1.5 bg-teal-200 rounded-full animate-pulse"></span>
              {t('dashboard.locations')}
            </p>
            <p className="text-2xl font-extrabold tracking-tight">{stats?.totalLocations || 0}</p>
          </div>
        </div>

        {/* Status Types */}
        <div className="group relative bg-gradient-to-br from-pink-500 via-pink-600 to-rose-700 rounded-xl shadow-md hover:shadow-lg p-4 text-white transition-all duration-300 hover:scale-105 overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white opacity-5 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative z-10">
            <p className="text-pink-100 text-xs font-medium flex items-center gap-1.5 mb-2">
              <span className="w-1.5 h-1.5 bg-pink-200 rounded-full animate-pulse"></span>
              {t('dashboard.statusTypes')}
            </p>
            <p className="text-2xl font-extrabold tracking-tight">{stats?.totalStatuses || 0}</p>
          </div>
        </div>
      </div>

      {/* Charts and Recent Activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Pie Chart - Stock by Status */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-2">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900">{t('dashboard.stockByStatus')}</h3>
          </div>
          {breakdown?.byStatus && breakdown.byStatus.length > 0 ? (
            <div className="flex flex-col items-center">
              <div className="relative w-64 h-64">
                <svg viewBox="0 0 200 200" className="transform -rotate-90">
                  {/* White center circle for donut effect */}
                  <circle cx="100" cy="100" r="60" fill="white" />
                  {/* Total count in center */}
                  <text x="100" y="100" textAnchor="middle" dominantBaseline="middle" className="text-3xl font-bold fill-gray-900" transform="rotate(90 100 100)">
                    {breakdown.byStatus.reduce((sum, item) => sum + item.count, 0)}
                  </text>
                  {(() => {
                    const total = breakdown.byStatus.reduce((sum, item) => sum + item.count, 0);
                    let currentAngle = 0;
                    const colors = ['#FF6B8A', '#FFD166', '#06D6A0', '#4ECDC4', '#95E1D3'];
                    
                    return breakdown.byStatus.map((item, index) => {
                      const percentage = (item.count / total) * 100;
                      const angle = (percentage / 100) * 360;
                      const startAngle = currentAngle;
                      const endAngle = currentAngle + angle;
                      
                      const outerRadius = 85;
                      const innerRadius = 62;
                      
                      const startOuterX = 100 + outerRadius * Math.cos((Math.PI * startAngle) / 180);
                      const startOuterY = 100 + outerRadius * Math.sin((Math.PI * startAngle) / 180);
                      const endOuterX = 100 + outerRadius * Math.cos((Math.PI * endAngle) / 180);
                      const endOuterY = 100 + outerRadius * Math.sin((Math.PI * endAngle) / 180);
                      
                      const startInnerX = 100 + innerRadius * Math.cos((Math.PI * endAngle) / 180);
                      const startInnerY = 100 + innerRadius * Math.sin((Math.PI * endAngle) / 180);
                      const endInnerX = 100 + innerRadius * Math.cos((Math.PI * startAngle) / 180);
                      const endInnerY = 100 + innerRadius * Math.sin((Math.PI * startAngle) / 180);
                      
                      const largeArc = angle > 180 ? 1 : 0;
                      
                      currentAngle += angle;
                      
                      return (
                        <path
                          key={index}
                          d={`M ${startOuterX} ${startOuterY} A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${endOuterX} ${endOuterY} L ${startInnerX} ${startInnerY} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${endInnerX} ${endInnerY} Z`}
                          fill={colors[index % colors.length]}
                          className="hover:opacity-80 transition-opacity cursor-pointer"
                          stroke="white"
                          strokeWidth="2"
                        />
                      );
                    });
                  })()}
                </svg>
              </div>
              <div className="mt-6 space-y-2 w-full">
                {breakdown.byStatus.map((item, index) => {
                  const colorClasses = ['bg-[#FF6B8A]', 'bg-[#FFD166]', 'bg-[#06D6A0]', 'bg-[#4ECDC4]', 'bg-[#95E1D3]'];
                  const bgColors = ['bg-pink-50', 'bg-yellow-50', 'bg-emerald-50', 'bg-teal-50', 'bg-green-50'];
                  const total = breakdown.byStatus.reduce((sum, i) => sum + i.count, 0);
                  const percentage = ((item.count / total) * 100).toFixed(1);
                  
                  return (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full ${colorClasses[index % colorClasses.length]}`}></div>
                        <span className="text-gray-700 font-medium">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">{percentage}%</span>
                        <span className={`text-gray-900 font-bold ${bgColors[index % bgColors.length]} px-2 py-1 rounded-full text-xs`}>{item.count}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <p className="text-gray-500 text-sm font-medium">{t('dashboard.noData')}</p>
            </div>
          )}
        </div>

        {/* Pie Chart - Stock by Category */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-2">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900">{t('dashboard.stockByCategory')}</h3>
          </div>
          {breakdown?.byCategory && breakdown.byCategory.length > 0 ? (
            <div className="flex flex-col items-center">
              <div className="relative w-64 h-64">
                <svg viewBox="0 0 200 200" className="transform -rotate-90">
                  {/* White center circle for donut effect */}
                  <circle cx="100" cy="100" r="60" fill="white" />
                  {/* Total count in center */}
                  <text x="100" y="100" textAnchor="middle" dominantBaseline="middle" className="text-3xl font-bold fill-gray-900" transform="rotate(90 100 100)">
                    {breakdown.byCategory.reduce((sum, item) => sum + item.count, 0)}
                  </text>
                  {(() => {
                    const total = breakdown.byCategory.reduce((sum, item) => sum + item.count, 0);
                    let currentAngle = 0;
                    const colors = ['#FF6B8A', '#FFD166', '#06D6A0', '#4ECDC4', '#95E1D3'];
                    
                    return breakdown.byCategory.map((item, index) => {
                      const percentage = (item.count / total) * 100;
                      const angle = (percentage / 100) * 360;
                      const startAngle = currentAngle;
                      const endAngle = currentAngle + angle;
                      
                      const outerRadius = 85;
                      const innerRadius = 62;
                      
                      const startOuterX = 100 + outerRadius * Math.cos((Math.PI * startAngle) / 180);
                      const startOuterY = 100 + outerRadius * Math.sin((Math.PI * startAngle) / 180);
                      const endOuterX = 100 + outerRadius * Math.cos((Math.PI * endAngle) / 180);
                      const endOuterY = 100 + outerRadius * Math.sin((Math.PI * endAngle) / 180);
                      
                      const startInnerX = 100 + innerRadius * Math.cos((Math.PI * endAngle) / 180);
                      const startInnerY = 100 + innerRadius * Math.sin((Math.PI * endAngle) / 180);
                      const endInnerX = 100 + innerRadius * Math.cos((Math.PI * startAngle) / 180);
                      const endInnerY = 100 + innerRadius * Math.sin((Math.PI * startAngle) / 180);
                      
                      const largeArc = angle > 180 ? 1 : 0;
                      
                      currentAngle += angle;
                      
                      return (
                        <path
                          key={index}
                          d={`M ${startOuterX} ${startOuterY} A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${endOuterX} ${endOuterY} L ${startInnerX} ${startInnerY} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${endInnerX} ${endInnerY} Z`}
                          fill={colors[index % colors.length]}
                          className="hover:opacity-80 transition-opacity cursor-pointer"
                          stroke="white"
                          strokeWidth="2"
                        />
                      );
                    });
                  })()}
                </svg>
              </div>
              <div className="mt-6 space-y-2 w-full">
                {breakdown.byCategory.map((item, index) => {
                  const colorClasses = ['bg-[#FF6B8A]', 'bg-[#FFD166]', 'bg-[#06D6A0]', 'bg-[#4ECDC4]', 'bg-[#95E1D3]'];
                  const bgColors = ['bg-pink-50', 'bg-yellow-50', 'bg-emerald-50', 'bg-teal-50', 'bg-green-50'];
                  const total = breakdown.byCategory.reduce((sum, i) => sum + i.count, 0);
                  const percentage = ((item.count / total) * 100).toFixed(1);
                  
                  return (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full ${colorClasses[index % colorClasses.length]}`}></div>
                        <span className="text-gray-700 font-medium">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">{percentage}%</span>
                        <span className={`text-gray-900 font-bold ${bgColors[index % bgColors.length]} px-2 py-1 rounded-full text-xs`}>{item.count}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <p className="text-gray-500 text-sm font-medium">{t('dashboard.noData')}</p>
            </div>
          )}
        </div>

        {/* Pie Chart - Inventory Risk Assessment */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-2">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900">{t('dashboard.stockRiskAssessment')}</h3>
          </div>
          {breakdown?.byConfirmation && breakdown.byConfirmation.length > 0 && stats?.inventoryCount ? (
            <div className="flex flex-col items-center">
              <div className="relative w-64 h-64">
                <svg viewBox="0 0 200 200" className="transform -rotate-90">
                  {/* White center circle for donut effect */}
                  <circle cx="100" cy="100" r="60" fill="white" />
                  {/* Total count in center */}
                  <text x="100" y="100" textAnchor="middle" dominantBaseline="middle" className="text-3xl font-bold fill-gray-900" transform="rotate(90 100 100)">
                    {breakdown.byConfirmation.reduce((sum, item) => sum + item.count, 0)}
                  </text>
                  {(() => {
                    const total = breakdown.byConfirmation.reduce((sum, item) => sum + item.count, 0);
                    let currentAngle = 0;
                    const colors = ['#3B82F6', '#EF4444']; // Blue for good, Red for at-risk
                    
                    return breakdown.byConfirmation.map((item, index) => {
                      const percentage = (item.count / total) * 100;
                      const angle = (percentage / 100) * 360;
                      
                      // Skip rendering if count is 0 (angle would be 0)
                      if (item.count === 0) {
                        return null;
                      }
                      
                      const startAngle = currentAngle;
                      const endAngle = currentAngle + angle;
                      
                      const outerRadius = 85;
                      const innerRadius = 62;
                      
                      // If this is 100% (full circle), draw a full donut ring
                      if (angle >= 359.9) {
                        currentAngle += angle;
                        return (
                          <g key={index}>
                            <circle
                              cx="100"
                              cy="100"
                              r={(outerRadius + innerRadius) / 2}
                              fill="none"
                              stroke={colors[index]}
                              strokeWidth={outerRadius - innerRadius}
                              className="hover:opacity-80 transition-opacity cursor-pointer"
                            />
                          </g>
                        );
                      }
                      
                      const startOuterX = 100 + outerRadius * Math.cos((Math.PI * startAngle) / 180);
                      const startOuterY = 100 + outerRadius * Math.sin((Math.PI * startAngle) / 180);
                      const endOuterX = 100 + outerRadius * Math.cos((Math.PI * endAngle) / 180);
                      const endOuterY = 100 + outerRadius * Math.sin((Math.PI * endAngle) / 180);
                      
                      const startInnerX = 100 + innerRadius * Math.cos((Math.PI * endAngle) / 180);
                      const startInnerY = 100 + innerRadius * Math.sin((Math.PI * endAngle) / 180);
                      const endInnerX = 100 + innerRadius * Math.cos((Math.PI * startAngle) / 180);
                      const endInnerY = 100 + innerRadius * Math.sin((Math.PI * startAngle) / 180);
                      
                      const largeArc = angle > 180 ? 1 : 0;
                      
                      currentAngle += angle;
                      
                      return (
                        <path
                          key={index}
                          d={`M ${startOuterX} ${startOuterY} A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${endOuterX} ${endOuterY} L ${startInnerX} ${startInnerY} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${endInnerX} ${endInnerY} Z`}
                          fill={colors[index]}
                          className="hover:opacity-80 transition-opacity cursor-pointer"
                          stroke="white"
                          strokeWidth="2"
                        />
                      );
                    });
                  })()}
                </svg>
              </div>
              <div className="mt-6 space-y-2 w-full">
                {breakdown.byConfirmation.map((item, index) => {
                  const colorClasses = ['bg-[#3B82F6]', 'bg-[#EF4444]']; // Blue, Red
                  const bgColors = ['bg-blue-50', 'bg-red-50'];
                  const total = breakdown.byConfirmation.reduce((sum, i) => sum + i.count, 0);
                  const percentage = total > 0 ? ((item.count / total) * 100).toFixed(1) : '0.0';
                  
                  return (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full ${colorClasses[index]}`}></div>
                        <span className="text-gray-700 font-medium">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">{percentage}%</span>
                        <span className={`text-gray-900 font-bold ${bgColors[index]} px-2 py-1 rounded-full text-xs`}>{item.count}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <p className="text-gray-500 text-sm font-medium">{t('dashboard.noData')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Bar Chart - Stock by Location (Full Width) */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-2">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900">{t('dashboard.stockByLocation')}</h3>
          </div>
          <div className="space-y-4">
            {breakdown?.byLocation && breakdown.byLocation.length > 0 ? (
              breakdown.byLocation.map((item, index) => (
                <div key={index} className="group">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-700 font-semibold">{item.name}</span>
                    <span className="text-gray-900 font-bold bg-purple-50 px-3 py-1 rounded-full text-xs">{item.count}</span>
                  </div>
                  <div className="relative w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div
                      className="absolute top-0 left-0 h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full transition-all duration-1000 ease-out shadow-md group-hover:shadow-lg"
                      style={{ 
                        width: `${stats?.inventoryCount ? (item.count / stats.inventoryCount) * 100 : 0}%` 
                      }}
                    >
                      <div className="absolute inset-0 bg-white opacity-20 animate-pulse"></div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </div>
                <p className="text-gray-500 text-sm font-medium">{t('dashboard.noData')}</p>
              </div>
            )}
          </div>
        </div>

      {/* At-Risk Inventory Table */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="px-6 py-3 bg-gradient-to-r from-red-50 to-white border-b border-red-200">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg p-2">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">{t('dashboard.atRiskTitle')}</h3>
              <p className="text-xs text-red-600">{t('dashboard.atRiskSubtitle', { count: atRiskItems.length })}</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">{t('dashboard.item')}</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">{t('dashboard.tag')}</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">{t('dashboard.category')}</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">{t('dashboard.location')}</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">{t('dashboard.status')}</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">{t('dashboard.lastCheck')}</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">{t('dashboard.daysAgo')}</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {atRiskItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gradient-to-r hover:from-red-50 hover:to-transparent transition-all duration-200 group">
                    <td className="px-6 py-2 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                        <span className="text-sm font-bold text-gray-900">{item.itemName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-2 whitespace-nowrap">
                      <span className="text-sm text-gray-600 font-medium">{item.tag}</span>
                    </td>
                    <td className="px-6 py-2 whitespace-nowrap">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-6 py-2 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {item.location}
                      </div>
                    </td>
                    <td className="px-6 py-2 whitespace-nowrap">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 shadow-sm">
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-2 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {item.lastCheckDate ? new Date(item.lastCheckDate).toLocaleDateString() : t('dashboard.never')}
                      </div>
                    </td>
                    <td className="px-6 py-2 whitespace-nowrap">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
                        {t('dashboard.days', { count: item.daysSinceLastCheck })}
                      </span>
                    </td>
                  </tr>
                ))}
                {atRiskItems.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-20 h-20 mb-4 bg-green-100 rounded-full flex items-center justify-center">
                          <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <p className="text-green-600 font-semibold">{t('dashboard.noAtRiskTitle')}</p>
                        <p className="text-gray-400 text-sm mt-1">{t('dashboard.noAtRiskMessage')}</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="px-6 py-3 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg p-2">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">{t('dashboard.recentActivity')}</h3>
              <p className="text-xs text-gray-500">{t('dashboard.recentActivitySubtitle')}</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">{t('dashboard.item')}</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">{t('dashboard.tag')}</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">{t('dashboard.category')}</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">{t('dashboard.location')}</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">{t('dashboard.status')}</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">{t('dashboard.date')}</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {recentActivity.map((activity) => (
                  <tr key={activity.id} className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-transparent transition-all duration-200 group">
                    <td className="px-6 py-2 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <span className="text-sm font-bold text-gray-900">{activity.itemName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-2 whitespace-nowrap">
                      <span className="text-sm text-gray-600 font-medium">{activity.tag}</span>
                    </td>
                    <td className="px-6 py-2 whitespace-nowrap">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
                        {activity.category}
                      </span>
                    </td>
                    <td className="px-6 py-2 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {activity.location}
                      </div>
                    </td>
                    <td className="px-6 py-2 whitespace-nowrap">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 shadow-sm">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                        {activity.status}
                      </span>
                    </td>
                    <td className="px-6 py-2 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {new Date(activity.date).toLocaleDateString()}
                      </div>
                    </td>
                  </tr>
                ))}
                {recentActivity.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-20 h-20 mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                          <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                          </svg>
                        </div>
                        <p className="text-gray-500 font-semibold">{t('dashboard.noActivityTitle')}</p>
                        <p className="text-gray-400 text-sm mt-1">{t('dashboard.noActivityMessage')}</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
