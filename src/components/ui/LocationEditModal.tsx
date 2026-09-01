'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from '@/contexts/LanguageContext';

export type LocationEditTarget = {
  id: number;
  name: string;
  email: string | null;
};

interface LocationEditModalProps {
  isOpen: boolean;
  location: LocationEditTarget | null;
  onSave: (id: number, name: string, email: string | null) => void | Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export default function LocationEditModal({
  isOpen,
  location,
  onSave,
  onCancel,
  loading = false,
}: LocationEditModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (isOpen && location) {
      setName(location.name);
      setEmail(location.email ?? '');
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, location]);

  if (!isOpen || !location) return null;

  const canSave = name.trim().length > 0 && !loading;

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      <div className="fixed inset-0 bg-black opacity-60" onClick={onCancel} />

      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t('locationEdit.title')}
          </h3>

          <div className="space-y-3 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('locationEdit.nameLabel')}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('settings.enterLocation')}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-green-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('locationEdit.emailLabel')}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('settings.enterEmailOptional')}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-green-400"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="px-4 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              disabled={!canSave}
              onClick={() =>
                onSave(location.id, name.trim(), email.trim() || null)
              }
              className="px-4 py-1.5 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {loading ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
