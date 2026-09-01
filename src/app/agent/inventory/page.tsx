'use client';

import { useState, useEffect, useRef } from 'react';
import ConfirmModal from '@/components/ui/ConfirmModal';
import SendPackModal from '@/components/ui/SendPackModal';
import { useNotification } from '@/hooks/useNotification';
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

interface InventoryRecord {
  id: number;
  customer_id: number;
  category_id: number;
  item_id: number;
  location_id: number;
  status_id: number;
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

export default function InventoryPage() {
  const notification = useNotification();
  const { t } = useTranslation();
  const [inventorySearchInput, setInventorySearchInput] = useState('');
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
  const [selectedStatusId, setSelectedStatusId] = useState<number | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  const [inventories, setInventories] = useState<InventoryRecord[]>([]);
  const [filteredInventories, setFilteredInventories] = useState<InventoryRecord[]>([]);

  // Searchable dropdown states
  const [isItemDropdownOpen, setIsItemDropdownOpen] = useState(false);
  const [itemSearchInput, setItemSearchInput] = useState('');
  const [filteredItemsForDropdown, setFilteredItemsForDropdown] = useState<Item[]>([]);
  const itemDropdownRef = useRef<HTMLDivElement>(null);

  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);
  const [locationSearchInput, setLocationSearchInput] = useState('');
  const [filteredLocations, setFilteredLocations] = useState<Location[]>([]);
  const locationDropdownRef = useRef<HTMLDivElement>(null);

  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [statusSearchInput, setStatusSearchInput] = useState('');
  const [filteredStatuses, setFilteredStatuses] = useState<Status[]>([]);
  const statusDropdownRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [inventoryToDelete, setInventoryToDelete] = useState<number | null>(null);
  const [selectedInventoryIds, setSelectedInventoryIds] = useState<number[]>([]);
  const [highlightedInventoryId, setHighlightedInventoryId] = useState<number | null>(null);
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);

  // Pagination states for items (left panel)
  const [itemsCurrentPage, setItemsCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Pagination states for inventory table (right panel)
  const [inventoryCurrentPage, setInventoryCurrentPage] = useState(1);
  const [inventoryPerPage] = useState(15);

  // Dropdown pagination states
  const [itemDropdownPage, setItemDropdownPage] = useState(1);
  const [locationDropdownPage, setLocationDropdownPage] = useState(1);
  const [statusDropdownPage, setStatusDropdownPage] = useState(1);
  const [dropdownItemsPerPage] = useState(10);

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    setFilteredItems(items);
    if (inventories.length > 0) {
      filterInventoriesBySelections();
    }
  }, [items]);

  useEffect(() => {
    filterInventoriesBySelections();
  }, [inventories, filteredItems]);

  // Sync filtered arrays for dropdowns
  useEffect(() => {
    setFilteredItemsForDropdown(items);
  }, [items]);

  useEffect(() => {
    setFilteredLocations(locations);
  }, [locations]);

  useEffect(() => {
    setFilteredStatuses(statuses);
  }, [statuses]);

  // Click outside handlers for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (itemDropdownRef.current && !itemDropdownRef.current.contains(event.target as Node)) {
        setIsItemDropdownOpen(false);
      }
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
      fetchCategories(),
      fetchItems(),
      fetchLocations(),
      fetchStatuses(),
      fetchInventories()
    ]);
    setLoading(false);
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/settings/category');
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
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

  const fetchInventories = async () => {
    try {
      const response = await fetch('/api/inventory');
      if (response.ok) {
        const data = await response.json();
        setInventories(data);
      }
    } catch (error) {
      console.error('Error fetching inventories:', error);
    }
  };

  const handleCategorySearchChange = (value: string) => {
    setInventorySearchInput(value);
    if (value.trim() === '') {
      setFilteredItems(items);
      filterInventoriesByItems(items);
    }
  };

  const filterInventoriesByItems = (itemsToFilter: Item[]) => {
    const filteredItemIds = itemsToFilter.map(item => item.id);
    const filteredInv = inventories.filter(inv =>
      filteredItemIds.includes(inv.item_id)
    );
    setFilteredInventories(filteredInv);
  };

  // Keep all registered rows visible; only sync with left-panel item search
  const filterInventoriesBySelections = () => {
    const filteredItemIds = filteredItems.map(item => item.id);
    let filteredInv = inventories;
    if (filteredItemIds.length > 0) {
      filteredInv = inventories.filter(inv =>
        filteredItemIds.includes(inv.item_id)
      );
    }
    setFilteredInventories(filteredInv);
    setInventoryCurrentPage(1);
  };

  // Pagination helper functions
  const getPaginatedItems = () => {
    const indexOfLastItem = itemsCurrentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    return filteredItems.slice(indexOfFirstItem, indexOfLastItem);
  };

  const getPaginatedInventories = () => {
    const indexOfLastInventory = inventoryCurrentPage * inventoryPerPage;
    const indexOfFirstInventory = indexOfLastInventory - inventoryPerPage;
    return filteredInventories.slice(indexOfFirstInventory, indexOfLastInventory);
  };

  // Dropdown pagination helper functions
  const getPaginatedDropdownItems = () => {
    const indexOfLast = itemDropdownPage * dropdownItemsPerPage;
    const indexOfFirst = indexOfLast - dropdownItemsPerPage;
    return filteredItemsForDropdown.slice(indexOfFirst, indexOfLast);
  };

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
  const totalInventoryPages = Math.ceil(filteredInventories.length / inventoryPerPage);
  
  const totalItemDropdownPages = Math.ceil(filteredItemsForDropdown.length / dropdownItemsPerPage);
  const totalLocationDropdownPages = Math.ceil(filteredLocations.length / dropdownItemsPerPage);
  const totalStatusDropdownPages = Math.ceil(filteredStatuses.length / dropdownItemsPerPage);

  const handleItemPageChange = (pageNumber: number) => {
    setItemsCurrentPage(pageNumber);
  };

  const handleInventoryPageChange = (pageNumber: number) => {
    setInventoryCurrentPage(pageNumber);
  };

  const handleInventorySearch = () => {
    if (inventorySearchInput.trim() === '') {
      setFilteredItems(items);
    } else {
      const searchTerm = inventorySearchInput.toLowerCase();
      const filtered = items.filter(item =>
        item.name.toLowerCase().includes(searchTerm) ||
        item.tag.toLowerCase().includes(searchTerm)
      );
      setFilteredItems(filtered);
    }
    // Reset to first page when searching
    setItemsCurrentPage(1);
  };

  const handleItemSearchChange = (value: string) => {
    setItemSearchInput(value);
    if (value.trim() === '') {
      setFilteredItemsForDropdown(items);
    } else {
      const searchTerm = value.toLowerCase();
      const filtered = items.filter(item =>
        item.name.toLowerCase().includes(searchTerm) ||
        item.tag.toLowerCase().includes(searchTerm)
      );
      setFilteredItemsForDropdown(filtered);
    }
    // Reset to first page when searching
    setItemDropdownPage(1);
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

  const handleRegisterInventory = async () => {
    if (!selectedItemId || !selectedLocationId || !selectedStatusId) {
      notification.warning(t('inventory.incompleteSelectionTitle'), t('inventory.incompleteSelection'));
      return;
    }

    try {
      const response = await fetch('/api/inventory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          item_id: selectedItemId,
          location_id: selectedLocationId,
          status_id: selectedStatusId,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        
        // Refresh inventory list first
        await fetchInventories();
        
        // Then show notification and reset selections
        if (result.isUpdate) {
          notification.success(t('inventory.inventoryUpdatedTitle'), t('inventory.inventoryUpdatedMessage'));
        } else {
          notification.success(t('inventory.inventoryRegisteredTitle'), t('inventory.inventoryRegisteredMessage'));
        }
        
        // Reset selections after a brief delay to ensure notification is shown
        setTimeout(() => {
          setSelectedItemId(null);
          setSelectedLocationId(null);
          setSelectedStatusId(null);
          setHighlightedInventoryId(null);
        }, 100);
      } else {
        const error = await response.json();
        notification.error(t('inventory.registrationFailedTitle'), t('inventory.registrationFailedMessage', { error: error.error || 'Unknown error' }));
      }
    } catch (error) {
      console.error('Error registering inventory:', error);
      notification.error(t('inventory.registrationFailedTitle'), t('inventory.registrationFailedGeneric'));
    }
  };

  const handleDeleteInventory = async (id: number) => {
    setInventoryToDelete(id);
    setDeleteModalOpen(true);
  };

  const confirmDeleteInventory = async () => {
    if (inventoryToDelete === null) return;

    try {
      const response = await fetch(`/api/inventory?id=${inventoryToDelete}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        notification.success(t('inventory.inventoryDeletedTitle'), t('inventory.inventoryDeletedMessage'));
        await fetchInventories();
      } else {
        const error = await response.json();
        notification.error(t('inventory.deleteFailedTitle'), t('inventory.deleteFailedMessage', { error: error.error || 'Unknown error' }));
      }
    } catch (error) {
      console.error('Error deleting inventory:', error);
      notification.error(t('inventory.deleteFailedTitle'), t('inventory.deleteFailedGeneric'));
    } finally {
      setDeleteModalOpen(false);
      setInventoryToDelete(null);
    }
  };

  const handleRowClick = (inventory: InventoryRecord) => {
    setHighlightedInventoryId(inventory.id);
    setSelectedItemId(inventory.item_id);
    setSelectedLocationId(inventory.location_id);
    setSelectedStatusId(inventory.status_id);
  };

  const paginatedInventories = (() => {
    const startIndex = (inventoryCurrentPage - 1) * inventoryPerPage;
    return filteredInventories.slice(startIndex, startIndex + inventoryPerPage);
  })();

  const allPageSelected =
    paginatedInventories.length > 0 &&
    paginatedInventories.every((inv) => selectedInventoryIds.includes(inv.id));

  const toggleSelectInventory = (id: number) => {
    setSelectedInventoryIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAllOnPage = () => {
    if (allPageSelected) {
      const pageIds = new Set(paginatedInventories.map((inv) => inv.id));
      setSelectedInventoryIds((prev) => prev.filter((id) => !pageIds.has(id)));
    } else {
      const pageIds = paginatedInventories.map((inv) => inv.id);
      setSelectedInventoryIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const handleConfirmSend = async (locationId: number, statusId: number) => {
    const itemIds = inventories
      .filter((inv) => selectedInventoryIds.includes(inv.id))
      .map((inv) => inv.item_id);

    if (itemIds.length === 0) {
      notification.warning(t('inventory.noSelectionTitle'), t('inventory.noSelection'));
      return;
    }

    setSendLoading(true);
    try {
      const response = await fetch('/api/packs/transmit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_ids: itemIds,
          location_id: locationId,
          status_id: statusId,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send pack');
      }

      notification.success(
        t('inventory.packSentTitle'),
        t('inventory.packSent', { count: data.moved_count || itemIds.length })
      );
      setSelectedInventoryIds([]);
      setSendModalOpen(false);
      await fetchInventories();
    } catch (error) {
      console.error('Error sending pack:', error);
      notification.error(
        t('inventory.sendFailedTitle'),
        error instanceof Error ? error.message : t('inventory.sendFailed')
      );
    } finally {
      setSendLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">{t('inventory.title')}</h2>
      <div className="flex flex-col lg:grid lg:grid-cols-4 gap-4">
        {/* First Panel - Item Panel - Full width on mobile, 1/4 on desktop */}
        <div className="bg-white rounded-lg shadow p-3 sm:p-4 h-[300px] sm:h-[400px] lg:h-[calc(100vh-190px)] flex flex-col lg:col-span-1">
          <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b border-gray-200 pb-2">{t('inventory.item')}</h3>
          
          {/* Search Input and Button */}
          <div className="mb-2 sm:mb-3 flex gap-2">
            <input
              type="text"
              value={inventorySearchInput}
              onChange={(e) => handleCategorySearchChange(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleInventorySearch()}
              placeholder={t('inventory.searchItems')}
              className="flex-1 min-w-0 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded focus:outline-none focus:border-green-400"
            />
            <button 
              onClick={handleInventorySearch}
              className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors font-medium whitespace-nowrap flex items-center gap-1 sm:gap-2"
            >
              <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="hidden sm:inline">{t('common.search')}</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto mb-2">
            {loading ? (
              <div className="text-center text-gray-500 text-sm py-4">{t('common.loading')}</div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center text-gray-500 text-sm py-4">
                {inventorySearchInput.trim() !== '' ? 'No matching items found' : 'No items yet'}
              </div>
            ) : (
              <div className="space-y-2">
                {getPaginatedItems().map((item) => {
                  // Check if this item has any inventory records
                  const hasInventory = inventories.some(inv => inv.item_id === item.id);
                  
                  return (
                    <div 
                      key={item.id} 
                      className={`flex items-center justify-between p-2 rounded transition-colors cursor-pointer ${
                        selectedItemId === item.id 
                          ? 'bg-green-50 border border-green-200' 
                          : hasInventory
                            ? 'bg-gray-50 hover:bg-gray-100 border border-transparent'
                            : 'bg-red-50 border-2 border-red-400 hover:bg-red-100'
                      }`}
                      onClick={() => setSelectedItemId(item.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-medium ${
                          selectedItemId === item.id 
                            ? 'text-green-700' 
                            : hasInventory 
                              ? 'text-gray-900' 
                              : 'text-red-700'
                        }`}>
                          {item.name}
                          {!hasInventory && (
                            <span className="ml-2 text-xs font-normal text-red-600">(Not Registered)</span>
                          )}
                        </div>
                        <div className={`text-xs ${hasInventory ? 'text-gray-500' : 'text-red-600'}`}>
                          {t('settings.categoryLabel', { category: item.category?.name || t('settings.unknown'), tag: item.tag })}
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
                {t('common.pageOf', { current: itemsCurrentPage, total: totalItemPages })}
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

        {/* Second Panel - Inventories - Full width on mobile, 3/4 on desktop */}
        <div className="bg-white rounded-lg shadow p-3 sm:p-4 min-h-[400px] lg:h-[calc(100vh-190px)] lg:col-span-3 flex flex-col">
          <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-2 sm:mb-3 border-b border-gray-200 pb-2">{t('inventory.inventories')}</h3>
          
          {/* Registration Form */}
          <div className="mb-4 flex-shrink-0">
            {/* Three Dropdowns and Register Button - Responsive Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Item Dropdown */}
              <div className="relative" ref={itemDropdownRef}>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('inventory.item')}</label>
                <button
                  type="button"
                  onClick={() => setIsItemDropdownOpen(!isItemDropdownOpen)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-green-400 bg-white text-left flex items-center justify-between"
                >
                  <span className={selectedItemId ? 'text-gray-900' : 'text-gray-500'}>
                    {selectedItemId
                      ? items.find(i => i.id === selectedItemId)?.name || t('inventory.chooseItem')
                      : t('inventory.chooseItem')}
                  </span>
                  <svg
                    className={`w-4 h-4 transition-transform ${isItemDropdownOpen ? 'transform rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isItemDropdownOpen && (
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
                          value={itemSearchInput}
                          onChange={(e) => handleItemSearchChange(e.target.value)}
                          placeholder={t('inventory.searchItemsDropdown')}
                          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-green-400"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>
                    {selectedItemId && (
                      <div
                        onClick={() => {
                          setSelectedItemId(null);
                          setIsItemDropdownOpen(false);
                          setItemSearchInput('');
                          setFilteredItemsForDropdown(items);
                        }}
                        className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 text-gray-600 border-b border-gray-200 flex items-center justify-between"
                      >
                        <span>{t('common.clearSelection')}</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </div>
                    )}
                    <div className="max-h-60 overflow-y-auto">
                      {filteredItemsForDropdown.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-gray-500">{t('inventory.noItemsFound')}</div>
                      ) : (
                        <>
                          {getPaginatedDropdownItems().map((item) => (
                            <div
                              key={item.id}
                              onClick={() => {
                                setSelectedItemId(item.id);
                                setIsItemDropdownOpen(false);
                                setItemSearchInput('');
                                setFilteredItemsForDropdown(items);
                                setItemDropdownPage(1);
                              }}
                              className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 ${
                                selectedItemId === item.id ? 'bg-green-50 text-green-700' : 'text-gray-900'
                              }`}
                            >
                              {item.name}
                            </div>
                          ))}
                          {totalItemDropdownPages > 1 && (
                            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-3 py-2 flex items-center justify-between">
                              <div className="text-xs text-gray-600">
                                {t('common.pageOf', { current: itemDropdownPage, total: totalItemDropdownPages })}
                              </div>
                              <div className="flex gap-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setItemDropdownPage(Math.max(1, itemDropdownPage - 1));
                                  }}
                                  disabled={itemDropdownPage === 1}
                                  className="px-2 py-0.5 text-xs border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {t('common.prev')}
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setItemDropdownPage(Math.min(totalItemDropdownPages, itemDropdownPage + 1));
                                  }}
                                  disabled={itemDropdownPage === totalItemDropdownPages}
                                  className="px-2 py-0.5 text-xs border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {t('common.next')}
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

              {/* Location Dropdown */}
              <div className="relative" ref={locationDropdownRef}>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('inventory.location')}</label>
                <button
                  type="button"
                  onClick={() => setIsLocationDropdownOpen(!isLocationDropdownOpen)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-green-400 bg-white text-left flex items-center justify-between"
                >
                  <span className={selectedLocationId ? 'text-gray-900' : 'text-gray-500'}>
                    {selectedLocationId
                      ? locations.find(l => l.id === selectedLocationId)?.name || t('inventory.chooseLocation')
                      : t('inventory.chooseLocation')}
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
                          placeholder={t('inventory.searchLocations')}
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
                        <span>{t('common.clearSelection')}</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </div>
                    )}
                    <div className="max-h-60 overflow-y-auto">
                      {filteredLocations.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-gray-500">{t('inventory.noLocationsFound')}</div>
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
                                {t('common.pageOf', { current: locationDropdownPage, total: totalLocationDropdownPages })}
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
                                  {t('common.prev')}
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setLocationDropdownPage(Math.min(totalLocationDropdownPages, locationDropdownPage + 1));
                                  }}
                                  disabled={locationDropdownPage === totalLocationDropdownPages}
                                  className="px-2 py-0.5 text-xs border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {t('common.next')}
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
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('inventory.status')}</label>
                <button
                  type="button"
                  onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-green-400 bg-white text-left flex items-center justify-between"
                >
                  <span className={selectedStatusId ? 'text-gray-900' : 'text-gray-500'}>
                    {selectedStatusId
                      ? statuses.find(s => s.id === selectedStatusId)?.status || t('inventory.chooseStatus')
                      : t('inventory.chooseStatus')}
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
                          placeholder={t('inventory.searchStatuses')}
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
                        <span>{t('common.clearSelection')}</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </div>
                    )}
                    <div className="max-h-60 overflow-y-auto">
                      {filteredStatuses.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-gray-500">{t('inventory.noStatusesFound')}</div>
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
                                {t('common.pageOf', { current: statusDropdownPage, total: totalStatusDropdownPages })}
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
                                  {t('common.prev')}
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setStatusDropdownPage(Math.min(totalStatusDropdownPages, statusDropdownPage + 1));
                                  }}
                                  disabled={statusDropdownPage === totalStatusDropdownPages}
                                  className="px-2 py-0.5 text-xs border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {t('common.next')}
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
              
              {/* Register Button */}
              <div className="flex items-end sm:col-span-2 lg:col-span-1">
                <button
                  onClick={handleRegisterInventory}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors font-medium"
                >
                  {t('inventory.register')}
                </button>
              </div>
            </div>
          </div>

          {/* Inventory List */}
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="flex items-center justify-between mb-2 sm:mb-3 flex-shrink-0 gap-2">
              <h4 className="text-sm sm:text-md font-semibold text-gray-700">{t('inventory.registeredInventory')}</h4>
              <div className="flex items-center gap-2">
                {selectedInventoryIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSendModalOpen(true)}
                    className="px-3 py-1.5 text-xs sm:text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-medium"
                  >
                    {t('inventory.send', { count: selectedInventoryIds.length })}
                  </button>
                )}
                {!loading && filteredInventories.length > 0 && (
                  <span className="text-xs text-gray-500">
                    {t('inventory.totalRecords', { count: filteredInventories.length })}
                  </span>
                )}
              </div>
            </div>
            {loading ? (
              <div className="text-center text-gray-500 text-sm py-4">{t('common.loading')}</div>
            ) : filteredInventories.length === 0 ? (
              <div className="text-center text-gray-500 text-sm py-4">
                {inventorySearchInput.trim() !== '' ? t('inventory.noMatchingRecords') : t('inventory.noRecordsYet')}
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-auto border border-gray-300 rounded-lg mb-2">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        <th className="px-2 sm:px-3 py-2 sm:py-3 text-left border-b border-gray-300 w-10">
                          <input
                            type="checkbox"
                            checked={allPageSelected}
                            onChange={toggleSelectAllOnPage}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            title={t('inventory.selectAll')}
                          />
                        </th>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-300">
                          {t('inventory.tag')}
                        </th>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-300">
                          {t('inventory.item')}
                        </th>
                        <th className="hidden md:table-cell px-2 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-300">
                          Category
                        </th>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-300">
                          {t('inventory.location')}
                        </th>
                        <th className="hidden sm:table-cell px-2 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-300">
                          {t('inventory.status')}
                        </th>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-300">
                          {t('inventory.actions')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {getPaginatedInventories().map((inventory) => {
                        const isChecked = selectedInventoryIds.includes(inventory.id);
                        const isHighlighted = highlightedInventoryId === inventory.id;
                        return (
                        <tr 
                          key={inventory.id} 
                          onClick={() => handleRowClick(inventory)}
                          className={`transition-colors cursor-pointer ${
                            isChecked || isHighlighted
                              ? 'bg-blue-100 hover:bg-blue-100'
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <td
                            className="px-2 sm:px-3 py-1 sm:py-1.5 whitespace-nowrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleSelectInventory(inventory.id)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-2 sm:px-4 py-1 sm:py-1.5 whitespace-nowrap text-[11px] sm:text-sm text-gray-900">
                            {inventory.item.tag}
                          </td>
                          <td className="px-2 sm:px-4 py-1 sm:py-1.5 whitespace-nowrap text-[11px] sm:text-sm font-medium text-gray-900">
                            {inventory.item.name}
                          </td>
                          <td className="hidden md:table-cell px-2 sm:px-4 py-1 sm:py-1.5 whitespace-nowrap text-[11px] sm:text-sm text-gray-900">
                            {inventory.category.name}
                          </td>
                          <td className="px-2 sm:px-4 py-1 sm:py-1.5 whitespace-nowrap text-[11px] sm:text-sm text-gray-900">
                            {inventory.location.name}
                          </td>
                          <td className="hidden sm:table-cell px-2 sm:px-4 py-1 sm:py-1.5 whitespace-nowrap text-[11px] sm:text-sm text-gray-900">
                            {inventory.status.status}
                          </td>
                          <td className="px-2 sm:px-4 py-1 sm:py-1.5 whitespace-nowrap text-right text-[11px] sm:text-sm font-medium">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteInventory(inventory.id);
                              }}
                              className="text-red-600 hover:text-red-900 transition-colors"
                              title={t('common.delete')}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                <line x1="10" y1="11" x2="10" y2="17"></line>
                                <line x1="14" y1="11" x2="14" y2="17"></line>
                              </svg>
                            </button>
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Inventory Pagination */}
                {totalInventoryPages > 1 && (
                  <div className="flex items-center justify-between pt-2 border-t border-gray-200 flex-shrink-0">
                    <div className="text-xs text-gray-600">
                      {t('inventory.showingRange', {
                        current: inventoryCurrentPage,
                        total: totalInventoryPages,
                        from: ((inventoryCurrentPage - 1) * inventoryPerPage) + 1,
                        to: Math.min(inventoryCurrentPage * inventoryPerPage, filteredInventories.length),
                        count: filteredInventories.length,
                      })}
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleInventoryPageChange(1)}
                        disabled={inventoryCurrentPage === 1}
                        className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {t('inventory.first')}
                      </button>
                      <button
                        onClick={() => handleInventoryPageChange(inventoryCurrentPage - 1)}
                        disabled={inventoryCurrentPage === 1}
                        className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Prev
                      </button>
                      <button
                        onClick={() => handleInventoryPageChange(inventoryCurrentPage + 1)}
                        disabled={inventoryCurrentPage === totalInventoryPages}
                        className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                      <button
                        onClick={() => handleInventoryPageChange(totalInventoryPages)}
                        disabled={inventoryCurrentPage === totalInventoryPages}
                        className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {t('inventory.last')}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        title={t('inventory.deleteInventoryTitle')}
        message={t('inventory.deleteInventoryMessage')}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        variant="danger"
        onConfirm={confirmDeleteInventory}
        onCancel={() => {
          setDeleteModalOpen(false);
          setInventoryToDelete(null);
        }}
      />

      <SendPackModal
        isOpen={sendModalOpen}
        selectedCount={selectedInventoryIds.length}
        locations={locations}
        statuses={statuses}
        loading={sendLoading}
        onConfirm={handleConfirmSend}
        onCancel={() => {
          if (!sendLoading) setSendModalOpen(false);
        }}
      />
    </div>
  );
}

