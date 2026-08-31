'use client';

import { useState, useEffect, useRef } from 'react';
import ConfirmModal from '@/components/ui/ConfirmModal';

interface Location {
  id: number;
  customer_id: number;
  name: string;
  email: string | null;
}

interface Category {
  id: number;
  customer_id: number;
  name: string;
}

interface Status {
  id: number;
  customer_id: number;
  status: string;
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

export default function SettingsPage() {
  const [locationInput, setLocationInput] = useState('');
  const [locationEmailInput, setLocationEmailInput] = useState('');
  const [categoryInput, setCategoryInput] = useState('');
  const [statusInput, setStatusInput] = useState('');
  const [itemNameInput, setItemNameInput] = useState('');
  const [itemTagInput, setItemTagInput] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [categorySearchInput, setCategorySearchInput] = useState('');
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);

  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  const [locations, setLocations] = useState<Location[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [items, setItems] = useState<Item[]>([]);

  const [filteredLocations, setFilteredLocations] = useState<Location[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
  const [filteredStatuses, setFilteredStatuses] = useState<Status[]>([]);
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  const [filteredCategoriesForDropdown, setFilteredCategoriesForDropdown] = useState<Category[]>([]);

  const [loading, setLoading] = useState(true);

  // Pagination states
  const [itemsCurrentPage, setItemsCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Modal state
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    type: 'location' | 'category' | 'status' | 'item' | null;
    id: number | null;
    name: string;
  }>({
    isOpen: false,
    type: null,
    id: null,
    name: ''
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    // Update filtered arrays when main arrays change (after fetch)
    if (locationInput.trim() === '') {
      setFilteredLocations(locations);
    }
  }, [locations, locationInput]);

  useEffect(() => {
    if (categoryInput.trim() === '') {
      setFilteredCategories(categories);
    }
  }, [categories, categoryInput]);

  useEffect(() => {
    if (statusInput.trim() === '') {
      setFilteredStatuses(statuses);
    }
  }, [statuses, statusInput]);

  useEffect(() => {
    setFilteredCategoriesForDropdown(categories);
  }, [categories]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setIsCategoryDropdownOpen(false);
      }
    };

    if (isCategoryDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCategoryDropdownOpen]);

  const fetchAllData = async () => {
    await Promise.all([
      fetchLocations(),
      fetchCategories(),
      fetchStatuses(),
      fetchItems()
    ]);
    setLoading(false);
  };

  const fetchLocations = async () => {
    try {
      const response = await fetch('/api/settings/location');
      if (response.ok) {
        const data = await response.json();
        setLocations(data);
        setFilteredLocations(data);
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/settings/category');
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
        setFilteredCategories(data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchStatuses = async () => {
    try {
      const response = await fetch('/api/settings/status');
      if (response.ok) {
        const data = await response.json();
        setStatuses(data);
        setFilteredStatuses(data);
      }
    } catch (error) {
      console.error('Error fetching statuses:', error);
    }
  };

  const fetchItems = async () => {
    try {
      const response = await fetch('/api/settings/item');
      if (response.ok) {
        const data = await response.json();
        setItems(data);
        setFilteredItems(data);
      }
    } catch (error) {
      console.error('Error fetching items:', error);
    }
  };

  // Pagination helper functions
  const getPaginatedItems = () => {
    const indexOfLastItem = itemsCurrentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    return items.slice(indexOfFirstItem, indexOfLastItem);
  };

  const totalItemPages = Math.ceil(items.length / itemsPerPage);

  const handleItemPageChange = (pageNumber: number) => {
    setItemsCurrentPage(pageNumber);
  };

  const handleLocationInputChange = (value: string) => {
    setLocationInput(value);
    if (value.trim() === '') {
      setFilteredLocations(locations);
    } else {
      const filtered = locations.filter(location =>
        location.name.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredLocations(filtered);
    }
  };

  const handleCategoryInputChange = (value: string) => {
    setCategoryInput(value);
    if (value.trim() === '') {
      setFilteredCategories(categories);
    } else {
      const filtered = categories.filter(category =>
        category.name.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredCategories(filtered);
    }
  };

  const handleStatusInputChange = (value: string) => {
    setStatusInput(value);
    if (value.trim() === '') {
      setFilteredStatuses(statuses);
    } else {
      const filtered = statuses.filter(status =>
        status.status.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredStatuses(filtered);
    }
  };

  const handleCategorySearchChange = (value: string) => {
    setCategorySearchInput(value);
    if (value.trim() === '') {
      setFilteredCategoriesForDropdown(categories);
    } else {
      const filtered = categories.filter(category =>
        category.name.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredCategoriesForDropdown(filtered);
    }
  };

  const handleAddLocation = async () => {
    if (locationInput.trim()) {
      const email = locationEmailInput.trim();
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        console.error('Invalid email address');
        return;
      }

      try {
        const response = await fetch('/api/settings/location', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: locationInput.trim(),
            email: email || null,
          })
        });
        
        if (response.ok) {
          setLocationInput('');
          setLocationEmailInput('');
          await fetchLocations();
        }
      } catch (error) {
        console.error('Error adding location:', error);
      }
    }
  };

  const handleAddCategory = async () => {
    if (categoryInput.trim()) {
      try {
        const response = await fetch('/api/settings/category', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: categoryInput.trim() })
        });
        
        if (response.ok) {
          setCategoryInput('');
          await fetchCategories();
        }
      } catch (error) {
        console.error('Error adding category:', error);
      }
    }
  };

  const handleAddStatus = async () => {
    if (statusInput.trim()) {
      try {
        const response = await fetch('/api/settings/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: statusInput.trim() })
        });
        
        if (response.ok) {
          setStatusInput('');
          await fetchStatuses();
        }
      } catch (error) {
        console.error('Error adding status:', error);
      }
    }
  };

  const handleAddItem = async () => {
    if (itemNameInput.trim() && itemTagInput.trim() && selectedCategoryId) {
      // Check if tag already exists
      const tagExists = items.some(item => item.tag.toLowerCase() === itemTagInput.trim().toLowerCase());
      if (tagExists) {
        alert('This tag already exists. Please use a unique tag.');
        return;
      }

      try {
        const response = await fetch('/api/settings/item', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category_id: selectedCategoryId,
            name: itemNameInput.trim(),
            tag: itemTagInput.trim()
          })
        });
        
        if (response.ok) {
          setItemNameInput('');
          setItemTagInput('');
          await fetchItems();
        } else {
          const data = await response.json();
          alert(data.error || 'Failed to add item');
        }
      } catch (error) {
        console.error('Error adding item:', error);
      }
    } else {
      alert('Please select a category and fill in both name and tag fields.');
    }
  };

  const handleDeleteLocation = (id: number, name: string) => {
    setDeleteModal({
      isOpen: true,
      type: 'location',
      id,
      name
    });
  };

  const handleDeleteCategory = (id: number, name: string) => {
    setDeleteModal({
      isOpen: true,
      type: 'category',
      id,
      name
    });
  };

  const handleDeleteStatus = (id: number, status: string) => {
    setDeleteModal({
      isOpen: true,
      type: 'status',
      id,
      name: status
    });
  };

  const handleDeleteItem = (id: number, name: string) => {
    setDeleteModal({
      isOpen: true,
      type: 'item',
      id,
      name
    });
  };

  const confirmDelete = async () => {
    if (!deleteModal.id || !deleteModal.type) return;

    try {
      const response = await fetch(`/api/settings/${deleteModal.type}?id=${deleteModal.id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        // Refresh the appropriate list
        switch (deleteModal.type) {
          case 'location':
            await fetchLocations();
            break;
          case 'category':
            await fetchCategories();
            break;
          case 'status':
            await fetchStatuses();
            break;
          case 'item':
            await fetchItems();
            break;
        }
      }
    } catch (error) {
      console.error(`Error deleting ${deleteModal.type}:`, error);
    } finally {
      setDeleteModal({ isOpen: false, type: null, id: null, name: '' });
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Settings</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Location Panel */}
        <div className="bg-white rounded-lg shadow p-4 h-[calc(100vh-190px)] flex flex-col lg:col-span-1">
          <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b border-gray-200 pb-2">Location</h3>
          <div className="mb-3 flex gap-2">
            <input
              type="text"
              value={locationInput}
              onChange={(e) => handleLocationInputChange(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddLocation()}
              placeholder="Enter location"
              className="flex-1 min-w-0 px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <button 
              onClick={handleAddLocation}
              className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors font-medium whitespace-nowrap"
            >
              ADD
            </button>
          </div>
          <div className="mb-3">
            <input
              type="email"
              value={locationEmailInput}
              onChange={(e) => setLocationEmailInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddLocation()}
              placeholder="Enter email (optional)"
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="text-center text-gray-500 text-sm py-4">Loading...</div>
            ) : locations.length === 0 ? (
              <div className="text-center text-gray-500 text-sm py-4">No locations yet</div>
            ) : filteredLocations.length === 0 ? (
              <div className="text-center text-gray-500 text-sm py-4">No matching locations</div>
            ) : (
              <div className="space-y-2">
                {filteredLocations.map((location) => (
                  <div key={location.id} className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors">
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="text-sm text-gray-700 truncate">{location.name}</div>
                      {location.email ? (
                        <div className="text-xs text-gray-500 truncate">{location.email}</div>
                      ) : null}
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => {/* TODO: Add edit functionality */}}
                        className="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Edit"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteLocation(location.id, location.name)}
                        className="p-1 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Delete"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          <line x1="10" y1="11" x2="10" y2="17"></line>
                          <line x1="14" y1="11" x2="14" y2="17"></line>
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Category Panel */}
        <div className="bg-white rounded-lg shadow p-4 h-[calc(100vh-190px)] flex flex-col lg:col-span-1">
          <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b border-gray-200 pb-2">Category</h3>
          <div className="mb-3 flex gap-2">
            <input
              type="text"
              value={categoryInput}
              onChange={(e) => handleCategoryInputChange(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
              placeholder="Enter category"
              className="flex-1 min-w-0 px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <button 
              onClick={handleAddCategory}
              className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors font-medium whitespace-nowrap"
            >
              ADD
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="text-center text-gray-500 text-sm py-4">Loading...</div>
            ) : categories.length === 0 ? (
              <div className="text-center text-gray-500 text-sm py-4">No categories yet</div>
            ) : filteredCategories.length === 0 ? (
              <div className="text-center text-gray-500 text-sm py-4">No matching categories</div>
            ) : (
              <div className="space-y-2">
                {filteredCategories.map((category) => (
                  <div 
                    key={category.id} 
                    className={`flex items-center justify-between p-2 rounded transition-colors cursor-pointer ${
                      selectedCategoryId === category.id 
                        ? 'bg-green-100 border border-green-300' 
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                    onClick={() => setSelectedCategoryId(category.id)}
                  >
                    <span className="text-sm text-gray-700">{category.name}</span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => {/* TODO: Add edit functionality */}}
                        className="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Edit"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCategory(category.id, category.name);
                        }}
                        className="p-1 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Delete"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          <line x1="10" y1="11" x2="10" y2="17"></line>
                          <line x1="14" y1="11" x2="14" y2="17"></line>
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Item Panel - Double Width */}
        <div className="bg-white rounded-lg shadow p-4 h-[calc(100vh-190px)] flex flex-col lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b border-gray-200 pb-2">Item</h3>
          <div className="mb-3 space-y-2">
            <div className="flex gap-2">
              <div className="flex-1 relative" ref={categoryDropdownRef}>
                <button
                  onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:border-green-400 flex items-center justify-between bg-white text-left"
                >
                  <span className={selectedCategoryId ? 'text-gray-900' : 'text-gray-500'}>
                    {selectedCategoryId 
                      ? categories.find(c => c.id === selectedCategoryId)?.name 
                      : 'Choose a category'}
                  </span>
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {isCategoryDropdownOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg">
                    <div className="p-2 border-b border-gray-200">
                      <div className="relative">
                        <svg className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                          type="text"
                          value={categorySearchInput}
                          onChange={(e) => handleCategorySearchChange(e.target.value)}
                          placeholder="Search categories..."
                          className="w-full pl-8 pr-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:border-green-400"
                          autoFocus
                        />
                      </div>
                    </div>
                    
                    {categorySearchInput.trim() !== '' && (
                      <button
                        onClick={() => {
                          setSelectedCategoryId(null);
                          setCategorySearchInput('');
                          setIsCategoryDropdownOpen(false);
                        }}
                        className="w-full px-3 py-2 text-sm text-left hover:bg-gray-50 flex items-center justify-between border-b border-gray-100"
                      >
                        <span className="text-gray-700">Clear Selection</span>
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                    
                    <div className="max-h-48 overflow-y-auto">
                      {filteredCategoriesForDropdown.length === 0 ? (
                        <div className="px-3 py-4 text-sm text-gray-500 text-center">
                          No items available
                        </div>
                      ) : (
                        filteredCategoriesForDropdown.map((category) => (
                          <button
                            key={category.id}
                            onClick={() => {
                              setSelectedCategoryId(category.id);
                              setCategorySearchInput('');
                              setIsCategoryDropdownOpen(false);
                            }}
                            className={`w-full px-3 py-2 text-sm text-left hover:bg-gray-50 ${
                              selectedCategoryId === category.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                            }`}
                          >
                            {category.name}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={itemNameInput}
                onChange={(e) => setItemNameInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddItem()}
                placeholder="Enter item name"
                className="flex-1 min-w-0 px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <input
                type="text"
                value={itemTagInput}
                onChange={(e) => setItemTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddItem()}
                placeholder="Enter tag"
                className="flex-1 min-w-0 px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <button 
                onClick={handleAddItem}
                className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors font-medium whitespace-nowrap"
              >
                ADD
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto mb-2">
            {loading ? (
              <div className="text-center text-gray-500 text-sm py-4">Loading...</div>
            ) : items.length === 0 ? (
              <div className="text-center text-gray-500 text-sm py-4">No items yet</div>
            ) : (
              <div className="space-y-2">
                {getPaginatedItems().map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900">{item.name}</div>
                      <div className="text-xs text-gray-500">
                        Category: {item.category?.name || 'Unknown'} | Tag: {item.tag}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleDeleteItem(item.id, item.name)}
                        className="p-1 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Delete"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          <line x1="10" y1="11" x2="10" y2="17"></line>
                          <line x1="14" y1="11" x2="14" y2="17"></line>
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Items Pagination */}
          {!loading && items.length > 0 && totalItemPages > 1 && (
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

        {/* Status Panel */}
        <div className="bg-white rounded-lg shadow p-4 h-[calc(100vh-190px)] flex flex-col lg:col-span-1">
          <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b border-gray-200 pb-2">Status</h3>
          <div className="mb-3 flex gap-2">
            <input
              type="text"
              value={statusInput}
              onChange={(e) => handleStatusInputChange(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddStatus()}
              placeholder="Enter status"
              className="flex-1 min-w-0 px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <button 
              onClick={handleAddStatus}
              className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors font-medium whitespace-nowrap"
            >
              ADD
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="text-center text-gray-500 text-sm py-4">Loading...</div>
            ) : statuses.length === 0 ? (
              <div className="text-center text-gray-500 text-sm py-4">No statuses yet</div>
            ) : filteredStatuses.length === 0 ? (
              <div className="text-center text-gray-500 text-sm py-4">No matching statuses</div>
            ) : (
              <div className="space-y-2">
                {filteredStatuses.map((status) => (
                  <div key={status.id} className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors">
                    <span className="text-sm text-gray-700">{status.status}</span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => {/* TODO: Add edit functionality */}}
                        className="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Edit"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteStatus(status.id, status.status)}
                        className="p-1 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Delete"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          <line x1="10" y1="11" x2="10" y2="17"></line>
                          <line x1="14" y1="11" x2="14" y2="17"></line>
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title={`Delete ${deleteModal.type ? deleteModal.type.charAt(0).toUpperCase() + deleteModal.type.slice(1) : ''}`}
        message={`Are you sure you want to delete "${deleteModal.name}"? This action cannot be undone.`}
        confirmLabel="OK"
        cancelLabel="Cancel"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteModal({ isOpen: false, type: null, id: null, name: '' })}
        variant="danger"
      />
    </div>
  );
}