'use client';

import { useState, useRef } from 'react';
import { useNotification } from '@/hooks/useNotification';

interface ImportResult {
  success: boolean;
  message: string;
  summary?: {
    totalRows: number;
    successfulImports: number;
    skippedRows: number;
    errors: string[];
  };
}

export default function ImportPage() {
  const notification = useNotification();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        setSelectedFile(file);
        setImportResult(null);
      } else {
        notification.error('Invalid File Type', 'Please upload a CSV file.');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        setSelectedFile(file);
        setImportResult(null);
      } else {
        notification.error('Invalid File Type', 'Please upload a CSV file.');
      }
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      notification.error('No File Selected', 'Please select a CSV file first.');
      return;
    }

    setImporting(true);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('/api/import-csv', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setImportResult(result);
        notification.success('Import Successful', result.message);
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        notification.error('Import Failed', result.error || 'Import failed');
        setImportResult({ success: false, message: result.error || 'Import failed' });
      }
    } catch (error) {
      console.error('Import error:', error);
      notification.error('Import Error', 'An error occurred during import');
      setImportResult({ success: false, message: 'An error occurred during import' });
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const csvContent = `category,item_name,item_tag,location,status
Linen,Bed Sheet,BS-001,Room 101,Clean
Linen,Pillow Case,PC-001,Room 101,Clean
Towel,Bath Towel,BT-001,Room 102,In Use`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'inventory_import_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Import CSV</h2>
          <p className="text-sm text-gray-500 mt-1">Bulk import inventory data from CSV files</p>
        </div>
        <button
          onClick={downloadTemplate}
          className="group w-full sm:w-auto px-5 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm rounded-md hover:shadow-lg hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2 font-medium"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Download Template
        </button>
      </div>

      {/* CSV Format Documentation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Instructions Card */}
        <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6 border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-2">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900">CSV Format Requirements</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Required Columns</h4>
              <p className="text-sm text-gray-600 mb-3">Your CSV file must include these columns in this exact order:</p>
              <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex-shrink-0 mt-0.5">1</span>
                  <div>
                    <span className="font-mono text-sm font-semibold text-gray-900">category</span>
                    <p className="text-xs text-gray-600">Category name (e.g., "Linen", "Towel")</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex-shrink-0 mt-0.5">2</span>
                  <div>
                    <span className="font-mono text-sm font-semibold text-gray-900">item_name</span>
                    <p className="text-xs text-gray-600">Name of the item (e.g., "Bed Sheet")</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex-shrink-0 mt-0.5">3</span>
                  <div>
                    <span className="font-mono text-sm font-semibold text-gray-900">item_tag</span>
                    <p className="text-xs text-gray-600">Unique tag/identifier (e.g., "BS-001")</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex-shrink-0 mt-0.5">4</span>
                  <div>
                    <span className="font-mono text-sm font-semibold text-gray-900">location</span>
                    <p className="text-xs text-gray-600">Location name (e.g., "Room 101")</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex-shrink-0 mt-0.5">5</span>
                  <div>
                    <span className="font-mono text-sm font-semibold text-gray-900">status</span>
                    <p className="text-xs text-gray-600">Status name (e.g., "Clean", "In Use")</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <h4 className="font-semibold text-gray-900 mb-2">Important Notes</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Categories, locations, and statuses will be created automatically if they don't exist</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Item tags must be unique across your inventory</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Empty rows will be skipped automatically</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>History records will be created automatically for each import</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Example Card */}
        <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6 border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-2">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900">Example CSV</h3>
          </div>

          <div className="space-y-4">
            <p className="text-sm text-gray-600">Here's an example of a properly formatted CSV file:</p>
            
            <div className="bg-gray-900 rounded-lg p-3 md:p-4 overflow-x-auto">
              <pre className="text-xs text-green-400 font-mono whitespace-pre">
{`category,item_name,item_tag,location,status
Linen,Bed Sheet,BS-001,Room 101,Clean
Linen,Pillow Case,PC-001,Room 101,Clean
Linen,Bed Sheet,BS-002,Room 102,In Use
Towel,Bath Towel,BT-001,Room 102,Clean
Towel,Hand Towel,HT-001,Laundry,Washing
Uniform,Chef Jacket,CJ-001,Kitchen,Clean
Uniform,Waiter Vest,WV-001,Storage,Clean`}
              </pre>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div>
                  <h4 className="font-semibold text-blue-900 mb-1">Pro Tip</h4>
                  <p className="text-sm text-blue-800">Download the template file above to get started quickly with the correct format!</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-gray-900 text-sm">What Happens on Import:</h4>
              <div className="space-y-2">
                <div className="flex items-start gap-2 text-sm">
                  <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">1</div>
                  <p className="text-gray-600">System checks for existing categories, locations, and statuses</p>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">2</div>
                  <p className="text-gray-600">Creates new ones if they don't exist</p>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">3</div>
                  <p className="text-gray-600">Creates or updates items with the provided tags</p>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">4</div>
                  <p className="text-gray-600">Adds inventory records and history entries</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Section */}
      <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6 border border-gray-100">
        <div className="flex items-center gap-3 mb-4 md:mb-6">
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-2">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <h3 className="text-base md:text-lg font-bold text-gray-900">Upload CSV File</h3>
        </div>

        {/* Drag and Drop Area */}
        <div
          className={`relative border-2 border-dashed rounded-xl p-6 md:p-12 text-center transition-all duration-300 ${
            dragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 bg-gray-50 hover:border-gray-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
            id="csv-upload"
          />

          <div className="space-y-3 md:space-y-4">
            <div className="w-12 h-12 md:w-16 md:h-16 mx-auto bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 md:w-8 md:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>

            {selectedFile ? (
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2 text-green-600 flex-wrap">
                  <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="font-semibold text-sm md:text-base break-all">{selectedFile.name}</span>
                </div>
                <p className="text-xs md:text-sm text-gray-500">
                  {(selectedFile.size / 1024).toFixed(2)} KB
                </p>
              </div>
            ) : (
              <>
                <p className="text-base md:text-lg font-semibold text-gray-700 px-4">
                  Drag and drop your CSV file here
                </p>
                <p className="text-xs md:text-sm text-gray-500">or</p>
              </>
            )}

            <label
              htmlFor="csv-upload"
              className="inline-flex items-center justify-center gap-2 px-4 md:px-6 py-2 md:py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm md:text-base rounded-md hover:shadow-lg hover:scale-105 transition-all duration-300 cursor-pointer font-medium w-full sm:w-auto max-w-xs mx-auto"
            >
              <svg className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="truncate">{selectedFile ? 'Choose Different File' : 'Choose CSV File'}</span>
            </label>
          </div>
        </div>

        {/* Import Button */}
        {selectedFile && (
          <div className="mt-4 md:mt-6 flex justify-center px-4">
            <button
              onClick={handleImport}
              disabled={importing}
              className={`w-full sm:w-auto px-6 md:px-8 py-2.5 md:py-3 rounded-md font-semibold text-white text-sm md:text-base transition-all duration-300 flex items-center justify-center gap-2 ${
                importing
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-green-600 to-green-700 hover:shadow-lg hover:scale-105'
              }`}
            >
              {importing ? (
                <>
                  <img src="/svg/6-dots-spinner.svg" alt="Loading..." className="w-5 h-5 flex-shrink-0" />
                  <span>Importing...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  <span>Start Import</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Import Results */}
      {importResult && (
        <div className={`rounded-2xl shadow-lg p-4 md:p-6 border ${
          importResult.success 
            ? 'bg-green-50 border-green-200' 
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-start gap-3 md:gap-4">
            <div className={`rounded-full p-2 flex-shrink-0 ${
              importResult.success ? 'bg-green-100' : 'bg-red-100'
            }`}>
              {importResult.success ? (
                <svg className="w-5 h-5 md:w-6 md:h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5 md:w-6 md:h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className={`text-base md:text-lg font-bold mb-2 ${
                importResult.success ? 'text-green-900' : 'text-red-900'
              }`}>
                {importResult.success ? 'Import Successful!' : 'Import Failed'}
              </h3>
              <p className={`text-xs md:text-sm mb-4 ${
                importResult.success ? 'text-green-800' : 'text-red-800'
              }`}>
                {importResult.message}
              </p>

              {importResult.summary && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                      <p className="text-xs text-gray-600 mb-1">Total Rows</p>
                      <p className="text-2xl font-bold text-gray-900">{importResult.summary.totalRows}</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-green-200">
                      <p className="text-xs text-green-700 mb-1">Successfully Imported</p>
                      <p className="text-2xl font-bold text-green-700">{importResult.summary.successfulImports}</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-yellow-200">
                      <p className="text-xs text-yellow-700 mb-1">Skipped</p>
                      <p className="text-2xl font-bold text-yellow-700">{importResult.summary.skippedRows}</p>
                    </div>
                  </div>

                  {importResult.summary.errors && importResult.summary.errors.length > 0 && (
                    <div className="bg-white rounded-lg p-3 md:p-4 border border-red-200">
                      <h4 className="font-semibold text-red-900 mb-2 text-sm md:text-base">Errors:</h4>
                      <ul className="space-y-1">
                        {importResult.summary.errors.map((error, index) => (
                          <li key={index} className="text-xs md:text-sm text-red-800 flex items-start gap-2">
                            <span className="text-red-600 font-bold flex-shrink-0">•</span>
                            <span className="break-words">{error}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
