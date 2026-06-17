import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Mail } from 'lucide-react';
import { Button } from '../../components/ui';
import type { Invoice, SendInvoiceFormData } from '../../types/invoice';
import { invoiceLayoutConfig } from './invoiceLayoutConfig';
import { InvoiceEmailService } from '../../services/invoiceEmailService';

interface SendInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: SendInvoiceFormData) => Promise<void> | void;
  invoice?: Invoice | null;
  loading?: boolean;
}

const SendInvoiceModal: React.FC<SendInvoiceModalProps> = ({ isOpen, onClose, onSubmit, invoice, loading }) => {
  const [form, setForm] = useState<SendInvoiceFormData>({
    email: '',
    subject: '',
    message: '',
    send_copy: false,
    schedule_date: ''
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (invoice) {
      const defaultSubject = InvoiceEmailService.generateEmailSubject(invoice, 'invoice');
      const defaultMessage = InvoiceEmailService.generateEmailMessage
        ? InvoiceEmailService.generateEmailMessage(invoice, undefined as any, 'invoice')
        : 'Please find your invoice attached.';

      setForm({
        email: invoice?.tenant?.email || '',
        subject: defaultSubject || '',
        message: defaultMessage || '',
        send_copy: false,
        schedule_date: ''
      });
    } else {
      setForm({ email: '', subject: '', message: '', send_copy: false, schedule_date: '' });
    }
    setErrors({});
  }, [invoice, isOpen]);

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    const fields = invoiceLayoutConfig.sendInvoiceFormFields;

    if (fields.email.required && !form.email) {
      newErrors.email = 'Email recipient is required';
    } else if (form.email && !InvoiceEmailService.validateEmail(form.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (fields.subject.required && !form.subject) {
      newErrors.subject = 'Subject is required';
    }

    if (fields.message.required && !form.message) {
      newErrors.message = 'Message is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (key: keyof SendInvoiceFormData, value: any) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit(form);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div className="fixed inset-0 z-50 overflow-y-auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="flex items-center justify-center min-h-screen p-4">
            {/* Overlay */}
            <motion.div className="fixed inset-0 bg-black bg-opacity-30" onClick={onClose} />

            {/* Modal Card */}
            <motion.div
              className="relative bg-white rounded-lg shadow-xl w-full max-w-lg"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <div className="flex items-center">
                  <Mail className="w-5 h-5 text-blue-600 mr-2" />
                  <h3 className="text-lg font-semibold">Send Invoice</h3>
                </div>
                <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <form onSubmit={handleSubmit} className="px-4 py-4 space-y-4">
                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{invoiceLayoutConfig.sendInvoiceFormFields.email.label}</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder={invoiceLayoutConfig.sendInvoiceFormFields.email.placeholder}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring focus:ring-blue-200"
                  />
                  {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{invoiceLayoutConfig.sendInvoiceFormFields.subject.label}</label>
                  <input
                    type="text"
                    value={form.subject}
                    onChange={(e) => handleChange('subject', e.target.value)}
                    placeholder={invoiceLayoutConfig.sendInvoiceFormFields.subject.placeholder}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring focus:ring-blue-200"
                  />
                  {errors.subject && <p className="mt-1 text-xs text-red-600">{errors.subject}</p>}
                </div>

                {/* Message */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{invoiceLayoutConfig.sendInvoiceFormFields.message.label}</label>
                  <textarea
                    value={form.message}
                    onChange={(e) => handleChange('message', e.target.value)}
                    placeholder={invoiceLayoutConfig.sendInvoiceFormFields.message.placeholder}
                    rows={invoiceLayoutConfig.sendInvoiceFormFields.message.rows || 4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring focus:ring-blue-200"
                  />
                  {errors.message && <p className="mt-1 text-xs text-red-600">{errors.message}</p>}
                </div>

                {/* Footer */}
                <div className="flex justify-end space-x-2 pt-2 border-t">
                  <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">Cancel</button>
                  <button type="submit" disabled={!!loading} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50">
                    {loading ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SendInvoiceModal;

