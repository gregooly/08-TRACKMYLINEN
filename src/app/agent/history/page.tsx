'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslation } from '@/contexts/LanguageContext';

interface Category {
  id: number;
  customer_id: number;
  name: string;
}

interface Item {
  id: number;
  customer_id: number;
  category_id: number;
  name: string;
  tag: string;
  category?: {
    name: string;
  };
}

interface Location {
  id: number;
  customer_id: number;
  name: string;
}

interface Status {
  id: number;
  customer_id: number;
  status: string;
}

interface HistoryRecord {
  id: number;
  customer_id: number;
  category_id: number;
  item_id: number;
  location_id: number;
  status_id: number;
  date: string;
  item: {
    name: string;
    tag: string;
  };
  location: {
    name: string;
  };
  status: {
    status: string;
  };
  category: {
    name: string;
  };
}

export default function HistoryPage() {
  const { t } = useTranslation();
  const [historySearchInput, setHistorySearchInput] = useState('');
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
  const [selectedStatusId, setSelectedStatusId] = useState<number | null>(null);

  const [items, setItems] = useState<Item[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  const [histories, setHistories] = useState<HistoryRecord[]>([]);
  const [filteredHistories, setFilteredHistories] = useState<HistoryRecord[]>([]);

  // Dropdown states
  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);
  const [locationSearchInput, setLocationSearchInput] = useState('');
  const [filteredLocations, setFilteredLocations] = useState<Location[]>([]);
  const locationDropdownRef = useRef<HTMLDivElement>(null);

  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [statusSearchInput, setStatusSearchInput] = useState('');
  const [filteredStatuses, setFilteredStatuses] = useState<Status[]>([]);
  const statusDropdownRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);

  // Pagination states for items (left panel)
  const [itemsCurrentPage, setItemsCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Pagination states for history table (right panel)
  const [historyCurrentPage, setHistoryCurrentPage] = useState(1);
  const [historyPerPage] = useState(15);

  // Dropdown pagination states
  const [locationDropdownPage, setLocationDropdownPage] = useState(1);
  const [statusDropdownPage, setStatusDropdownPage] = useState(1);
  const [dropdownItemsPerPage] = useState(10);

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    setFilteredItems(items);
    if (histories.length > 0) {
      filterHistoriesBySelections();
    }
  }, [items]);

  useEffect(() => {
    filterHistoriesBySelections();
  }, [histories, selectedItemId, selectedLocationId, selectedStatusId]);

  // Sync filtered arrays for dropdowns
  useEffect(() => {
    setFilteredLocations(locations);
  }, [locations]);

  useEffect(() => {
    setFilteredStatuses(statuses);
  }, [statuses]);

  // Click outside handlers for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (locationDropdownRef.current && !locationDropdownRef.current.contains(event.target as Node)) {
        setIsLocationDropdownOpen(false);
      }
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setIsStatusDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchAllData = async () => {
    await Promise.all([
      fetchItems(),
      fetchLocations(),
      fetchStatuses(),
      fetchHistories()
    ]);
    setLoading(false);
  };

  const fetchItems = async () => {
    try {
      const response = await fetch('/api/settings/item');
      if (response.ok) {
        const data = await response.json();
        setItems(data);
      }
    } catch (error) {
      console.error('Error fetching items:', error);
    }
  };

  const fetchLocations = async () => {
    try {
      const response = await fetch('/api/settings/location');
      if (response.ok) {
        const data = await response.json();
        setLocations(data);
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  const fetchStatuses = async () => {
    try {
      const response = await fetch('/api/settings/status');
      if (response.ok) {
        const data = await response.json();
        setStatuses(data);
      }
    } catch (error) {
      console.error('Error fetching statuses:', error);
    }
  };

  const fetchHistories = async () => {
    try {
      const response = await fetch('/api/history');
      if (response.ok) {
        const result = await response.json();
        // Handle both old array format and new paginated format
        const data = Array.isArray(result) ? result : (result.data || []);
        setHistories(data);
      }
    } catch (error) {
      console.error('Error fetching histories:', error);
    }
  };

  const handleCategorySearchChange = (value: string) => {
    setHistorySearchInput(value);
    if (value.trim() === '') {
      setFilteredItems(items);
    }
  };

  const filterHistoriesBySelections = () => {
    let filteredHist = histories;
    
    // If a specific item is selected in left panel, show only that item's history
    if (selectedItemId) {
      filteredHist = filteredHist.filter(hist => hist.item_id === selectedItemId);
    } else {
      // Otherwise, filter by items displayed in left panel
      const filteredItemIds = filteredItems.map(item => item.id);
      if (filteredItemIds.length > 0) {
        filteredHist = filteredHist.filter(hist => 
          filteredItemIds.includes(hist.item_id)
        );
      }
    }
    
    // Filter by selected location
    if (selectedLocationId) {
      filteredHist = filteredHist.filter(hist => hist.location_id === selectedLocationId);
    }
    
    // Filter by selected status
    if (selectedStatusId) {
      filteredHist = filteredHist.filter(hist => hist.status_id === selectedStatusId);
    }
    
    setFilteredHistories(filteredHist);
    // Reset to first page when filters change
    setHistoryCurrentPage(1);
  };

  // Pagination helper functions
  const getPaginatedItems = () => {
    const indexOfLastItem = itemsCurrentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    return filteredItems.slice(indexOfFirstItem, indexOfLastItem);
  };

  const getPaginatedHistories = () => {
    const indexOfLastHistory = historyCurrentPage * historyPerPage;
    const indexOfFirstHistory = indexOfLastHistory - historyPerPage;
    return filteredHistories.slice(indexOfFirstHistory, indexOfLastHistory);
  };

  // Dropdown pagination helper functions
  const getPaginatedDropdownLocations = () => {
    const indexOfLast = locationDropdownPage * dropdownItemsPerPage;
    const indexOfFirst = indexOfLast - dropdownItemsPerPage;
    return filteredLocations.slice(indexOfFirst, indexOfLast);
  };

  const getPaginatedDropdownStatuses = () => {
    const indexOfLast = statusDropdownPage * dropdownItemsPerPage;
    const indexOfFirst = indexOfLast - dropdownItemsPerPage;
    return filteredStatuses.slice(indexOfFirst, indexOfLast);
  };

  const totalItemPages = Math.ceil(filteredItems.length / itemsPerPage);
  const totalHistoryPages = Math.ceil(filteredHistories.length / historyPerPage);
  
  const totalLocationDropdownPages = Math.ceil(filteredLocations.length / dropdownItemsPerPage);
  const totalStatusDropdownPages = Math.ceil(filteredStatuses.length / dropdownItemsPerPage);

  const handleItemPageChange = (pageNumber: number) => {
    setItemsCurrentPage(pageNumber);
  };

  const handleHistoryPageChange = (pageNumber: number) => {
    setHistoryCurrentPage(pageNumber);
  };

  const handleHistorySearch = () => {
    if (historySearchInput.trim() === '') {
      setFilteredItems(items);
    } else {
      const searchTerm = historySearchInput.toLowerCase();
      const filtered = items.filter(item =>
        item.name.toLowerCase().includes(searchTerm) ||
        item.tag.toLowerCase().includes(searchTerm)
      );
      setFilteredItems(filtered);
    }
    // Reset to first page when searching
    setItemsCurrentPage(1);
  };

  const handleLocationSearchChange = (value: string) => {
    setLocationSearchInput(value);
    if (value.trim() === '') {
      setFilteredLocations(locations);
    } else {
      const searchTerm = value.toLowerCase();
      const filtered = locations.filter(location =>
        location.name.toLowerCase().includes(searchTerm)
      );
      setFilteredLocations(filtered);
    }
    // Reset to first page when searching
    setLocationDropdownPage(1);
  };

  const handleStatusSearchChange = (value: string) => {
    setStatusSearchInput(value);
    if (value.trim() === '') {
      setFilteredStatuses(statuses);
    } else {
      const searchTerm = value.toLowerCase();
      const filtered = statuses.filter(status =>
        status.status.toLowerCase().includes(searchTerm)
      );
      setFilteredStatuses(filtered);
    }
    // Reset to first page when searching
    setStatusDropdownPage(1);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
    } catch (error) {
      return dateString;
    }
  };

  return (
    <div>
      <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">{t('history.title')}</h2>
      <div className="flex flex-col lg:grid lg:grid-cols-4 gap-4">
        {/* First Panel - Item Panel - Full width on mobile, 1/4 on desktop */}
        <div className="bg-white rounded-lg shadow p-3 sm:p-4 h-[300px] sm:h-[400px] lg:h-[calc(100vh-190px)] flex flex-col lg:col-span-1">
          <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b border-gray-200 pb-2">Item</h3>
          
          {/* Search Input and Button */}
          <div className="mb-2 sm:mb-3 flex gap-2">
            <input
              type="text"
              value={historySearchInput}
              onChange={(e) => handleCategorySearchChange(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleHistorySearch()}
              placeholder="Search by item name or tag..."
              className="flex-1 min-w-0 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded focus:outline-none focus:border-green-400"
            />
            <button 
              onClick={handleHistorySearch}
              className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors font-medium whitespace-nowrap flex items-center gap-1 sm:gap-2"
            >
              <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="hidden sm:inline">Search</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto mb-2">
            {loading ? (
              <div className="text-center text-gray-500 text-sm py-4">Loading...</div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center text-gray-500 text-sm py-4">
                {historySearchInput.trim() !== '' ? 'No matching items found' : 'No items yet'}
              </div>
            ) : (
              <div className="space-y-2">
                {getPaginatedItems().map((item) => {
                  // Check if this item has any history records
                  const hasHistory = histories.some(hist => hist.item_id === item.id);
                  
                  return (
                    <div 
                      key={item.id} 
                      className={`flex items-center justify-between p-2 rounded transition-colors cursor-pointer ${
                        selectedItemId === item.id 
                          ? 'bg-green-50 border border-green-200' 
                          : hasHistory
                            ? 'bg-gray-50 hover:bg-gray-100 border border-transparent'
                            : 'bg-red-50 border-2 border-red-400 hover:bg-red-100'
                      }`}
                      onClick={() => setSelectedItemId(item.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-medium ${
                          selectedItemId === item.id 
                            ? 'text-green-700' 
                            : hasHistory 
                              ? 'text-gray-900' 
                              : 'text-red-700'
                        }`}>
                          {item.name}
                          {!hasHistory && (
                            <span className="ml-2 text-xs font-normal text-red-600">(No History)</span>
                          )}
                        </div>
                        <div className={`text-xs ${hasHistory ? 'text-gray-500' : 'text-red-600'}`}>
                          Category: {item.category?.name || 'Unknown'} | Tag: {item.tag}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Items Pagination */}
          {!loading && filteredItems.length > 0 && totalItemPages > 1 && (
            <div className="flex items-center justify-between pt-2 border-t border-gray-200">
              <div className="text-xs text-gray-600">
                Page {itemsCurrentPage} of {totalItemPages}
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => handleItemPageChange(itemsCurrentPage - 1)}
                  disabled={itemsCurrentPage === 1}
                  className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Prev
                </button>
                <button
                  onClick={() => handleItemPageChange(itemsCurrentPage + 1)}
                  disabled={itemsCurrentPage === totalItemPages}
                  className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Second Panel - History Records - Full width on mobile, 3/4 on desktop */}
        <div className="bg-white rounded-lg shadow p-3 sm:p-4 min-h-[400px] lg:h-[calc(100vh-190px)] lg:col-span-3 flex flex-col">
          <div className="flex items-center justify-between mb-2 sm:mb-3 flex-shrink-0 border-b border-gray-200 pb-2">
            <h3 className="text-base sm:text-lg font-semibold text-gray-800">History Records</h3>
            {!loading && filteredHistories.length > 0 && (
              <span className="text-xs text-gray-500">
                Total: {filteredHistories.length} records
              </span>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="mb-4 flex-shrink-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Location Dropdown */}
              <div className="relative" ref={locationDropdownRef}>
                <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                <button
                  type="button"
                  onClick={() => setIsLocationDropdownOpen(!isLocationDropdownOpen)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-green-400 bg-white text-left flex items-center justify-between"
                >
                  <span className={selectedLocationId ? 'text-gray-900' : 'text-gray-500'}>
                    {selectedLocationId
                      ? locations.find(l => l.id === selectedLocationId)?.name || 'Choose a location'
                      : 'All Locations'}
                  </span>
                  <svg
                    className={`w-4 h-4 transition-transform ${isLocationDropdownOpen ? 'transform rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isLocationDropdownOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg">
                    <div className="p-2 border-b border-gray-200">
                      <div className="relative">
                        <svg
                          className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                          type="text"
                          value={locationSearchInput}
                          onChange={(e) => handleLocationSearchChange(e.target.value)}
                          placeholder="Search locations..."
                          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-green-400"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>
                    {selectedLocationId && (
                      <div
                        onClick={() => {
                          setSelectedLocationId(null);
                          setIsLocationDropdownOpen(false);
                          setLocationSearchInput('');
                          setFilteredLocations(locations);
                        }}
                        className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 text-gray-600 border-b border-gray-200 flex items-center justify-between"
                      >
                        <span>Clear Selection</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </div>
                    )}
                    <div className="max-h-60 overflow-y-auto">
                      {filteredLocations.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-gray-500">No locations found</div>
                      ) : (
                        <>
                          {getPaginatedDropdownLocations().map((location) => (
                            <div
                              key={location.id}
                              onClick={() => {
                                setSelectedLocationId(location.id);
                                setIsLocationDropdownOpen(false);
                                setLocationSearchInput('');
                                setFilteredLocations(locations);
                                setLocationDropdownPage(1);
                              }}
                              className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 ${
                                selectedLocationId === location.id ? 'bg-green-50 text-green-700' : 'text-gray-900'
                              }`}
                            >
                              {location.name}
                            </div>
                          ))}
                          {totalLocationDropdownPages > 1 && (
                            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-3 py-2 flex items-center justify-between">
                              <div className="text-xs text-gray-600">
                                Page {locationDropdownPage} of {totalLocationDropdownPages}
                              </div>
                              <div className="flex gap-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setLocationDropdownPage(Math.max(1, locationDropdownPage - 1));
                                  }}
                                  disabled={locationDropdownPage === 1}
                                  className="px-2 py-0.5 text-xs border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  Prev
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setLocationDropdownPage(Math.min(totalLocationDropdownPages, locationDropdownPage + 1));
                                  }}
                                  disabled={locationDropdownPage === totalLocationDropdownPages}
                                  className="px-2 py-0.5 text-xs border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  Next
                                </button>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Status Dropdown */}
              <div className="relative" ref={statusDropdownRef}>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <button
                  type="button"
                  onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-green-400 bg-white text-left flex items-center justify-between"
                >
                  <span className={selectedStatusId ? 'text-gray-900' : 'text-gray-500'}>
                    {selectedStatusId
                      ? statuses.find(s => s.id === selectedStatusId)?.status || 'Choose a status'
                      : 'All Statuses'}
                  </span>
                  <svg
                    className={`w-4 h-4 transition-transform ${isStatusDropdownOpen ? 'transform rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isStatusDropdownOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg">
                    <div className="p-2 border-b border-gray-200">
                      <div className="relative">
                        <svg
                          className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                          type="text"
                          value={statusSearchInput}
                          onChange={(e) => handleStatusSearchChange(e.target.value)}
                          placeholder="Search statuses..."
                          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-green-400"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>
                    {selectedStatusId && (
                      <div
                        onClick={() => {
                          setSelectedStatusId(null);
                          setIsStatusDropdownOpen(false);
                          setStatusSearchInput('');
                          setFilteredStatuses(statuses);
                        }}
                        className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 text-gray-600 border-b border-gray-200 flex items-center justify-between"
                      >
                        <span>Clear Selection</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </div>
                    )}
                    <div className="max-h-60 overflow-y-auto">
                      {filteredStatuses.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-gray-500">No statuses found</div>
                      ) : (
                        <>
                          {getPaginatedDropdownStatuses().map((status) => (
                            <div
                              key={status.id}
                              onClick={() => {
                                setSelectedStatusId(status.id);
                                setIsStatusDropdownOpen(false);
                                setStatusSearchInput('');
                                setFilteredStatuses(statuses);
                                setStatusDropdownPage(1);
                              }}
                              className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 ${
                                selectedStatusId === status.id ? 'bg-green-50 text-green-700' : 'text-gray-900'
                              }`}
                            >
                              {status.status}
                            </div>
                          ))}
                          {totalStatusDropdownPages > 1 && (
                            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-3 py-2 flex items-center justify-between">
                              <div className="text-xs text-gray-600">
                                Page {statusDropdownPage} of {totalStatusDropdownPages}
                              </div>
                              <div className="flex gap-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setStatusDropdownPage(Math.max(1, statusDropdownPage - 1));
                                  }}
                                  disabled={statusDropdownPage === 1}
                                  className="px-2 py-0.5 text-xs border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  Prev
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setStatusDropdownPage(Math.min(totalStatusDropdownPages, statusDropdownPage + 1));
                                  }}
                                  disabled={statusDropdownPage === totalStatusDropdownPages}
                                  className="px-2 py-0.5 text-xs border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  Next
                                </button>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-0 flex flex-col">
            {loading ? (
              <div className="text-center text-gray-500 text-sm py-4">Loading...</div>
            ) : filteredHistories.length === 0 ? (
              <div className="text-center text-gray-500 text-sm py-4">
                {historySearchInput.trim() !== '' ? 'No matching history records found' : 'No history records yet'}
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-auto border border-gray-300 rounded-lg mb-2">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-300">
                          Date/Time
                        </th>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-300">
                          Tag
                        </th>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-300">
                          Item
                        </th>
                        <th className="hidden md:table-cell px-2 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-300">
                          Category
                        </th>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-300">
                          Location
                        </th>
                        <th className="hidden sm:table-cell px-2 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-300">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {getPaginatedHistories().map((history) => (
                        <tr 
                          key={history.id} 
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-2 sm:px-4 py-1 sm:py-1.5 whitespace-nowrap text-[11px] sm:text-sm text-gray-900">
                            {formatDate(history.date)}
                          </td>
                          <td className="px-2 sm:px-4 py-1 sm:py-1.5 whitespace-nowrap text-[11px] sm:text-sm text-gray-900">
                            {history.item.tag}
                          </td>
                          <td className="px-2 sm:px-4 py-1 sm:py-1.5 whitespace-nowrap text-[11px] sm:text-sm font-medium text-gray-900">
                            {history.item.name}
                          </td>
                          <td className="hidden md:table-cell px-2 sm:px-4 py-1 sm:py-1.5 whitespace-nowrap text-[11px] sm:text-sm text-gray-900">
                            {history.category.name}
                          </td>
                          <td className="px-2 sm:px-4 py-1 sm:py-1.5 whitespace-nowrap text-[11px] sm:text-sm text-gray-900">
                            {history.location.name}
                          </td>
                          <td className="hidden sm:table-cell px-2 sm:px-4 py-1 sm:py-1.5 whitespace-nowrap text-[11px] sm:text-sm text-gray-900">
                            {history.status.status}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* History Pagination */}
                {totalHistoryPages > 1 && (
                  <div className="flex items-center justify-between pt-2 border-t border-gray-200 flex-shrink-0">
                    <div className="text-xs text-gray-600">
                      Page {historyCurrentPage} of {totalHistoryPages} | Showing {((historyCurrentPage - 1) * historyPerPage) + 1}-{Math.min(historyCurrentPage * historyPerPage, filteredHistories.length)} of {filteredHistories.length}
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleHistoryPageChange(1)}
                        disabled={historyCurrentPage === 1}
                        className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        First
                      </button>
                      <button
                        onClick={() => handleHistoryPageChange(historyCurrentPage - 1)}
                        disabled={historyCurrentPage === 1}
                        className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Prev
                      </button>
                      <button
                        onClick={() => handleHistoryPageChange(historyCurrentPage + 1)}
                        disabled={historyCurrentPage === totalHistoryPages}
                        className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                      <button
                        onClick={() => handleHistoryPageChange(totalHistoryPages)}
                        disabled={historyCurrentPage === totalHistoryPages}
                        className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Last
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}