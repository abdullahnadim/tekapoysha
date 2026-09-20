'use client';

import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { addCreditCard } from '@/lib/services/creditCardService';
// Adjust this import path based on exactly how you export your auth context
import { useAuth } from '@/components/auth/AuthContext'; 

const GRADIENT_OPTIONS = [
  { id: 'blue', classes: 'from-blue-900 to-blue-600', hex: 'bg-blue-600' },
  { id: 'green', classes: 'from-emerald-900 to-emerald-600', hex: 'bg-emerald-600' },
  { id: 'dark', classes: 'from-gray-900 to-gray-700', hex: 'bg-gray-800' },
  { id: 'purple', classes: 'from-purple-900 to-purple-600', hex: 'bg-purple-600' },
  { id: 'orange', classes: 'from-orange-700 to-orange-500', hex: 'bg-orange-500' },
  { id: 'red', classes: 'from-red-900 to-red-600', hex: 'bg-red-600' },
];

interface AddCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void; // Call this to refresh the list after saving
}

export default function AddCardModal({ isOpen, onClose, onSuccess }: AddCardModalProps) {
  const { user } = useAuth(); // Getting the logged-in Firebase user
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    cardName: '',
    network: 'Visa',
    lastFourDigits: '',
    creditLimit: '',
    currentBalance: '0',
    statementDay: '1',
    dueDay: '15',
    apr: '',
    colorTheme: GRADIENT_OPTIONS[0].classes, // Default to first color
  });

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError('You must be logged in to add a card.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // Build the core payload without the optional APR field
      const newCardData: any = {
        userId: user.uid,
        cardName: formData.cardName,
        network: formData.network as 'Visa' | 'Mastercard' | 'Amex' | 'Discover' | 'Other',
        lastFourDigits: formData.lastFourDigits,
        creditLimit: Number(formData.creditLimit),
        currentBalance: Number(formData.currentBalance),
        statementDay: Number(formData.statementDay),
        dueDay: Number(formData.dueDay),
        colorTheme: formData.colorTheme, // Include selected theme
        createdAt: Date.now(),
      };

      // Only attach APR if the user actually provided a value to prevent Firebase 'undefined' errors
      if (formData.apr) {
        newCardData.apr = Number(formData.apr);
      }

      await addCreditCard(newCardData);
      
      // Reset form on success
      setFormData({
        cardName: '', network: 'Visa', lastFourDigits: '', creditLimit: '',
        currentBalance: '0', statementDay: '1', dueDay: '15', apr: '',
        colorTheme: GRADIENT_OPTIONS[0].classes,
      });

      onSuccess(); 
      onClose();   
    } catch (err: any) {
      console.error("Failed to add card:", err);
      setError(err.message || 'Failed to save the credit card.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-800">Add Credit Card</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>}

          {/* Color Picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Card Color</label>
            <div className="flex gap-3">
              {GRADIENT_OPTIONS.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, colorTheme: theme.classes })}
                  className={`w-8 h-8 rounded-full ${theme.hex} transition-all ${
                    formData.colorTheme === theme.classes 
                    ? 'ring-2 ring-offset-2 ring-gray-900 scale-110 shadow-md' 
                    : 'hover:scale-110 opacity-70 hover:opacity-100'
                  }`}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Card Name (e.g., City Bank AMEX)</label>
            <input required type="text" name="cardName" value={formData.cardName} onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
              placeholder="My Rewards Card" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Network</label>
              <select name="network" value={formData.network} onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none bg-white">
                <option value="Visa">Visa</option>
                <option value="Mastercard">Mastercard</option>
                <option value="Amex">American Express</option>
                <option value="Discover">Discover</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last 4 Digits</label>
              <input required type="text" name="lastFourDigits" maxLength={4} pattern="\d{4}" value={formData.lastFourDigits} onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none"
                placeholder="1234" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Credit Limit</label>
              <input required type="number" min="0" name="creditLimit" value={formData.creditLimit} onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none"
                placeholder="50000" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Balance</label>
              <input required type="number" min="0" name="currentBalance" value={formData.currentBalance} onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Statement Day</label>
              <input required type="number" min="1" max="31" name="statementDay" value={formData.statementDay} onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Day</label>
              <input required type="number" min="1" max="31" name="dueDay" value={formData.dueDay} onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none" />
            </div>
          </div>

          {/* Footer */}
          <div className="pt-4 mt-2 flex justify-end gap-3 border-t border-gray-100">
            <button type="button" onClick={onClose} disabled={isSubmitting}
              className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-md transition-colors flex items-center justify-center min-w-[120px]">
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Card'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}