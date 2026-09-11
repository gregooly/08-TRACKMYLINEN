'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/contexts/LanguageContext';

export default function ApiKeyPage() {
  const { t } = useTranslation();
  const [apiKey, setApiKey] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedPassageUrl, setCopiedPassageUrl] = useState(false);
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    fetchApiKey();
    fetchCustomerId();
  }, []);

  const fetchCustomerId = () => {
    // Get customer_id from token/session
    // For now, we'll get it when fetching the API key
  };

  const fetchApiKey = async () => {
    try {
      setError('');
      const response = await fetch('/api/apikey');
      if (response.ok) {
        const data = await response.json();
        setApiKey(data.apiKey || '');
        setCustomerId(data.customerId);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to fetch API key');
      }
    } catch (error) {
      console.error('Error fetching API key:', error);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const generateApiKey = async () => {
    setGenerating(true);
    setError('');
    try {
      const response = await fetch('/api/apikey', {
        method: 'POST',
      });
      if (response.ok) {
        const data = await response.json();
        setApiKey(data.apiKey);
        console.log('API Key generated:', data.apiKey);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to generate API key');
        console.error('Error response:', errorData);
      }
    } catch (error) {
      console.error('Error generating API key:', error);
      setError('Network error. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = (text: string, type: 'key' | 'url' | 'passageUrl') => {
    navigator.clipboard.writeText(text);
    if (type === 'key') {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } else if (type === 'passageUrl') {
      setCopiedPassageUrl(true);
      setTimeout(() => setCopiedPassageUrl(false), 2000);
    } else {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  };

  const getCompleteUrl = () => {
    const baseUrl = window.location.origin
    return `${baseUrl}/api/trackmylinen?customer_id=${customerId || 'YOUR_CUSTOMER_ID'}&apikey=${apiKey || 'YOUR_API_KEY'}`;
  };

  const getPassageUrl = () => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/api/trackmylinen/passages?customer_id=${customerId || 'YOUR_CUSTOMER_ID'}&apikey=${apiKey || 'YOUR_API_KEY'}`;
  };

  const escapeCsvValue = (value: string | number) => {
    const text = String(value ?? '');
    return `"${text.replace(/"/g, '""')}"`;
  };

  const viewJson = () => {
    const url = getCompleteUrl();
    window.open(url, '_blank');
  };

  const viewPassageJson = () => {
    window.open(getPassageUrl(), '_blank');
  };

  const downloadCsv = async () => {
    try {
      setError('');
      const url = getCompleteUrl();
      console.log('Fetching CSV data from:', url);
      
      const response = await fetch(url);
      console.log('Response status:', response.status);
      
      if (response.ok) {
        const jsonData = await response.json();
        console.log('JSON data received:', jsonData);
        
        // Convert JSON to CSV
        if (jsonData.data && jsonData.data.length > 0) {
          const headers = 'Item Name,Tag,Category,Location,Status\n';
          const rows = jsonData.data.map((item: any) => 
            `"${item.item_name || ''}","${item.tag || ''}","${item.category || ''}","${item.location || ''}","${item.status || ''}"`
          ).join('\n');
          const csv = headers + rows;
          
          console.log('CSV created, first 200 chars:', csv.substring(0, 200));
          
          // Create blob and download
          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
          const downloadUrl = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = downloadUrl;
          link.download = `inventory_export_${new Date().toISOString().split('T')[0]}.csv`;
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          
          // Cleanup
          setTimeout(() => {
            document.body.removeChild(link);
            window.URL.revokeObjectURL(downloadUrl);
          }, 100);
          
          console.log('CSV download initiated');
        } else {
          console.error('No data in response:', jsonData);
          setError('No inventory data available to export');
        }
      } else {
        const errorText = await response.text();
        console.error('Response not OK:', errorText);
        setError(`Failed to fetch data: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error downloading CSV:', error);
      setError('Failed to download CSV. Please check the console for details.');
    }
  };

  const downloadPassageCsv = async () => {
    try {
      setError('');
      const url = getPassageUrl();
      const response = await fetch(url);

      if (response.ok) {
        const jsonData = await response.json();

        if (jsonData.data && jsonData.data.length > 0) {
          const headers = 'item_tag,item_name,category,location,total number of passages in the location,status\n';
          const rows = jsonData.data.map((item: {
            item_tag?: string;
            item_name?: string;
            category?: string;
            location?: string;
            passages?: number;
            status?: string;
          }) =>
            [
              escapeCsvValue(item.item_tag || ''),
              escapeCsvValue(item.item_name || ''),
              escapeCsvValue(item.category || ''),
              escapeCsvValue(item.location || ''),
              escapeCsvValue(item.passages ?? 0),
              escapeCsvValue(item.status || ''),
            ].join(',')
          ).join('\n');
          const csv = headers + rows;

          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
          const downloadUrl = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = downloadUrl;
          link.download = `passage_export_${new Date().toISOString().split('T')[0]}.csv`;
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();

          setTimeout(() => {
            document.body.removeChild(link);
            window.URL.revokeObjectURL(downloadUrl);
          }, 100);
        } else {
          setError('No passage data available to export');
        }
      } else {
        setError(`Failed to fetch passage data: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error downloading passage CSV:', error);
      setError('Failed to download passage CSV. Please check the console for details.');
    }
  };

  return (
    <div className="px-2 sm:px-0">
      <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-3 sm:mb-4 md:mb-6">{t('apiKey.title')}</h2>
      
      {/* Error Message */}
      {error && (
        <div className="mb-3 sm:mb-4 bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4">
          <div className="flex items-start sm:items-center gap-2">
            <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5 sm:mt-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs sm:text-sm text-red-800 break-words">{error}</p>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Generate API Key Section */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-1 sm:mb-2">Generate API Key</h3>
          <p className="text-xs sm:text-sm text-gray-600 mb-4 sm:mb-6">
            Create a new API key for accessing the inventory system.
          </p>

          {/* Generated API Key */}
          <div className="mb-3 sm:mb-4">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
              Generated API Key
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={loading ? 'Loading...' : apiKey || ''}
                readOnly
                placeholder="No API key generated yet"
                className="w-full sm:flex-1 px-2 sm:px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-md bg-gray-50 text-gray-700 break-all"
              />
              <button
                onClick={() => apiKey && copyToClipboard(apiKey, 'key')}
                disabled={!apiKey}
                className="w-full sm:w-auto px-4 py-2 bg-green-600 text-white text-xs sm:text-sm rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors sm:min-w-[80px]"
              >
                {copiedKey ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Complete API URL */}
          <div className="mb-4 sm:mb-6">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
              Complete API URL
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={loading ? 'Loading...' : getCompleteUrl()}
                readOnly
                className="w-full sm:flex-1 px-2 sm:px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-md bg-gray-50 text-gray-700 break-all overflow-x-auto"
              />
              <button
                onClick={() => apiKey && copyToClipboard(getCompleteUrl(), 'url')}
                disabled={!apiKey}
                className="w-full sm:w-auto px-4 py-2 bg-green-600 text-white text-xs sm:text-sm rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors sm:min-w-[80px]"
              >
                {copiedUrl ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Passage report */}
          <div className="mb-4 sm:mb-6">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              Passage report
            </label>
            <p className="text-xs text-gray-600 mb-2">
              How many times each item passed through each location
            </p>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
              Passage report API URL
            </label>
            <div className="flex flex-col sm:flex-row gap-2 mb-2">
              <input
                type="text"
                value={loading ? 'Loading...' : getPassageUrl()}
                readOnly
                className="w-full sm:flex-1 px-2 sm:px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-md bg-gray-50 text-gray-700 break-all overflow-x-auto"
              />
              <button
                onClick={() => apiKey && copyToClipboard(getPassageUrl(), 'passageUrl')}
                disabled={!apiKey}
                className="w-full sm:w-auto px-4 py-2 bg-green-600 text-white text-xs sm:text-sm rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors sm:min-w-[80px]"
              >
                {copiedPassageUrl ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={generateApiKey}
            disabled={generating || loading}
            className="w-full px-4 py-2.5 sm:py-3 bg-gray-900 text-white text-xs sm:text-sm font-medium rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            <span>{generating ? 'Generating...' : 'Generate Key'}</span>
          </button>
        </div>

        {/* Export to External File Section */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-1 sm:mb-2">Export to external file</h3>
          <p className="text-xs sm:text-sm text-gray-600 mb-4 sm:mb-6">
            Download inventory data in various formats for external use.
          </p>

          {/* Export to CSV */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4">
            <h4 className="text-sm sm:text-base font-semibold text-gray-800 mb-1 sm:mb-2">Export to CSV file</h4>
            <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
              CSV files are plaintext data files separated by commas, so they can be opened 
              directly as Excel sheets and are a very useful file format for exporting and 
              importing data from other programs.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={viewJson}
                disabled={!apiKey || loading}
                className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 bg-blue-600 text-white text-xs sm:text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span>View JSON</span>
              </button>
              <button
                onClick={downloadCsv}
                disabled={!apiKey || loading}
                className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 bg-green-600 text-white text-xs sm:text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Download CSV</span>
              </button>
            </div>
          </div>

          {/* CSV Structure Info */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4">
            <h4 className="text-xs sm:text-sm font-semibold text-gray-800 mb-1 sm:mb-2">CSV Structure</h4>
            <p className="text-xs text-gray-600 mb-2">
              The CSV file will contain all subscription fields with resolved names:
            </p>
            <div className="bg-yellow-100 border border-yellow-300 rounded p-2 overflow-x-auto">
              <code className="text-xs text-gray-800 whitespace-nowrap block">
                Item Name,Tag,Category,Location,Status
              </code>
            </div>
          </div>

          {/* Export passage report to CSV */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4">
            <h4 className="text-sm sm:text-base font-semibold text-gray-800 mb-1 sm:mb-2">Export passage report to CSV</h4>
            <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
              CSV can be opened in Excel. One row per item and location.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={viewPassageJson}
                disabled={!apiKey || loading}
                className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 bg-blue-600 text-white text-xs sm:text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span>View JSON</span>
              </button>
              <button
                onClick={downloadPassageCsv}
                disabled={!apiKey || loading}
                className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 bg-green-600 text-white text-xs sm:text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Download CSV</span>
              </button>
            </div>
          </div>

          {/* Passage CSV Structure */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4">
            <h4 className="text-xs sm:text-sm font-semibold text-gray-800 mb-1 sm:mb-2">Passage CSV structure</h4>
            <p className="text-xs text-gray-600 mb-2">
              Displaying history of locations
            </p>
            <div className="bg-yellow-100 border border-yellow-300 rounded p-2 overflow-x-auto">
              <code className="text-xs text-gray-800 whitespace-nowrap block">
                item_tag,item_name,category,location,total number of passages in the location,status
              </code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}