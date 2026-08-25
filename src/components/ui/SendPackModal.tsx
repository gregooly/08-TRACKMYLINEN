'use client';

import { useEffect, useState } from 'react';

interface Location {
  id: number;
  name: string;
}

interface Status {
  id: number;
  status: string;
}

interface SendPackModalProps {
  isOpen: boolean;
  selectedCount: number;
  locations: Location[];
  statuses: Status[];
  onConfirm: (locationId: number, statusId: number) => void | Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export default function SendPackModal({
  isOpen,
  selectedCount,
  locations,
  statuses,
  onConfirm,
  onCancel,
  loading = false,
}: SendPackModalProps) {
  const [locationId, setLocationId] = useState<number | ''>('');
  const [statusId, setStatusId] = useState<number | ''>('');

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setLocationId('');
      setStatusId('');
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const canSubmit =
    locationId !== '' && statusId !== '' && !loading && selectedCount > 0;

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      <div className="fixed inset-0 bg-black opacity-60" onClick={onCancel} />

      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Send Pack
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Move {selectedCount} selected item{selectedCount === 1 ? '' : 's'} to
            a location. The virtual pack is destroyed after send.
          </p>

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location
              </label>
              <select
                value={locationId}
                onChange={(e) =>
                  setLocationId(e.target.value ? parseInt(e.target.value, 10) : '')
                }
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-green-400"
              >
                <option value="">Choose a location</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={statusId}
                onChange={(e) =>
                  setStatusId(e.target.value ? parseInt(e.target.value, 10) : '')
                }
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-green-400"
              >
                <option value="">Choose a status</option>
                {statuses.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.status}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="px-4 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!canSubmit}
              onClick={() => {
                if (locationId !== '' && statusId !== '') {
                  onConfirm(locationId, statusId);
                }
              }}
              className="px-4 py-1.5 text-sm font-medium rounded-md transition-colors bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
