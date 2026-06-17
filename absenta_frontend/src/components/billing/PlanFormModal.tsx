import React, { useState, useEffect } from 'react';
import { Modal, Button, Input } from '../../components/ui';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import type { Plan, CreatePlanRequest } from '../../types/billing';

interface PlanFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreatePlanRequest) => Promise<void>;
  plan?: Plan | null;
  loading: boolean;
}

export const PlanFormModal: React.FC<PlanFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  plan = null,
  loading
}) => {
  const [formData, setFormData] = useState<CreatePlanRequest>({
    name: '',
    description: '',
    price_monthly: 0,
    currency: 'IDR',
    max_user: 0,
    features: '',
    is_active: true
  });

  const availableFeatures = [
    { id: 'CORE', label: 'Core System (Wajib)', disabled: true },
    { id: 'ABSENSI', label: 'Modul Absensi', disabled: false },
    { id: 'KOPERASI', label: 'Modul Koperasi', disabled: false },
    { id: 'RAPORT', label: 'Modul Raport', disabled: false },
    { id: 'PPDB', label: 'Modul PPDB', disabled: false },
  ];

  useEffect(() => {
    if (plan) {
      setFormData({
        name: plan.name,
        description: plan.description || '',
        price_monthly: plan.price_monthly || plan.price || 0,
        currency: plan.currency,
        max_user: plan.max_user || plan.max_users || 0,
        features: plan.features || '',
        is_active: plan.is_active
      });
    } else {
      setFormData({
        name: '',
        description: '',
        price_monthly: 0,
        currency: 'IDR',
        max_user: 0,
        features: '',
        is_active: true
      });
    }
  }, [plan, isOpen]);

  const handleFeatureToggle = (featureId: string, checked: boolean) => {
    let currentFeatures: string[] = [];
    try {
      if (formData.features && formData.features.startsWith('[')) {
        currentFeatures = JSON.parse(formData.features);
      } else if (formData.features) {
        currentFeatures = formData.features.split(',').map(f => f.trim()).filter(Boolean);
      }
    } catch {
      currentFeatures = [];
    }

    if (checked) {
      if (!currentFeatures.includes(featureId)) {
        currentFeatures.push(featureId);
      }
    } else {
      currentFeatures = currentFeatures.filter(f => f !== featureId);
    }
    
    if (!currentFeatures.includes('CORE')) {
      currentFeatures.unshift('CORE');
    }

    setFormData(prev => ({ ...prev, features: JSON.stringify(currentFeatures) }));
  };
  
  const isFeatureSelected = (featureId: string): boolean => {
    try {
      if (!formData.features) return featureId === 'CORE';
      if (formData.features.startsWith('[')) {
        const parsed = JSON.parse(formData.features);
        return Array.isArray(parsed) && parsed.includes(featureId);
      }
      return formData.features.includes(featureId);
    } catch {
      return featureId === 'CORE';
    }
  };

  const handleSave = () => {
    onSubmit(formData);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={plan ? "Edit Plan" : "Buat Plan Baru"}
      size="lg"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nama Plan *
            </label>
            <Input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Masukkan nama plan"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Harga *
            </label>
            <Input
              type="number"
              value={formData.price_monthly}
              onChange={(e) => setFormData(prev => ({ ...prev, price_monthly: Number(e.target.value) }))}
              placeholder="0"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Deskripsi
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Deskripsi plan"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Currency
            </label>
            <SearchableSelect
              value={formData.currency}
              onValueChange={(val) => setFormData(prev => ({ ...prev, currency: val }))}
              options={[
                { value: "IDR", label: "IDR" },
                { value: "USD", label: "USD" }
              ]}
              placeholder="Pilih Mata Uang"
              searchPlaceholder="Cari mata uang..."
              triggerClassName="w-full bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Max Users
            </label>
            <Input
              type="number"
              value={formData.max_user}
              onChange={(e) => setFormData(prev => ({ ...prev, max_user: Number(e.target.value) }))}
              placeholder="0"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Features (Modules)
            </label>
            <div className="space-y-2 border p-3 rounded-md border-gray-300 dark:border-gray-600">
              {availableFeatures?.map((feat) => (
                <div key={feat.id} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`feat-${feat.id}`}
                    checked={feat.id === 'CORE' ? true : isFeatureSelected(feat.id)}
                    disabled={feat.id === 'CORE'}
                    onChange={(e) => handleFeatureToggle(feat.id, e.target.checked)}
                    className="mr-2"
                  />
                  <label htmlFor={`feat-${feat.id}`} className="text-sm text-gray-700 dark:text-gray-300">
                    {feat.label}
                  </label>
                </div>
              ))}
              <div className="text-xs text-gray-500 mt-1">
                Value: {formData.features || '[]'}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="is_active"
            checked={formData.is_active}
            onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
            className="mr-2"
          />
          <label htmlFor="is_active" className="text-sm text-gray-700 dark:text-gray-300">
            Plan aktif
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button
            variant="outline"
            onClick={onClose}
          >
            Batal
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading || !formData.name || formData.price_monthly <= 0}
          >
            {loading ? 'Menyimpan...' : plan ? 'Update Plan' : 'Buat Plan'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
