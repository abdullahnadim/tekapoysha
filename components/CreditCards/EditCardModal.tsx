'use client';

import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { updateCreditCard } from '@/lib/services/creditCardService';
import { CreditCard } from '../../types/creditCard';

const GRADIENT_OPTIONS = [
  { id: 'blue', classes: 'from-blue-900 to-blue-600', hex: 'bg-blue-600' },
  { id: 'green', classes: 'from-emerald-900 to-emerald-600', hex: 'bg-emerald-600' },
  { id: 'dark', classes: 'from-gray-900 to-gray-700', hex: 'bg-gray-800' },
  { id: 'purple', classes: 'from-purple-900 to-purple-600', hex: 'bg-purple-600' },
  { id: 'orange', classes: 'from-orange-700 to-orange-500', hex: 'bg-orange-500' },
  { id: 'red', classes: 'from-red-900 to-red-600', hex: 'bg-red-600' },
];

interface EditCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  card: CreditCard;
}

export default function EditCardModal({ isOpen, onClose, onSuccess, card }: EditCardModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Fallback if the card was created before custom colors existed
  const getInitialColor = () => {
    if (card.colorTheme) return card.colorTheme;
    switch (card.network.toLowerCase()) {
      case 'visa': return 'from-blue-900 to-blue-600';
      case 'mastercard': return 'from-gray-900 to-gray-700';
      case 'amex': return 'from-emerald-900 to-emerald-600';
      case 'discover': return 'from-orange-700 to-orange-500';
      default: return 'from-slate-800 to-slate-600';
    }
  };

  const [formData, setFormData] = useState({
    cardName: card.cardName,
    network: card.network,
    creditLimit: card.creditLimit.toString(),
    statementDay: card.statementDay.toString(),
    dueDay: card.dueDay.toString(),
    colorTheme: getInitialColor(),
  });

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!card.id) return;
    
    setIsSubmitting(true);
    setError('');

    try {
      await updateCreditCard(card.id, {
        cardName: formData.cardName,
        network: formData.network as any,
        creditLimit: Number(formData.creditLimit),
        statementDay: Number(formData.statementDay),
        dueDay: Number(formData.dueDay),
        colorTheme: formData.colorTheme,
      });
      onSuccess(); 
      onClose();   
    } catch (err: any) {
      setError(err.message || 'Failed to update the credit card.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        <div className="flex justify-between items-center p-5 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-800">Edit Credit Card</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

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
            <label className="block text-sm font-medium text-gray-700 mb-1">Card Name</label>
            <input required type="text" name="cardName" value={formData.cardName} onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none" />
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Credit Limit</label>
              <input required type="number" min="1" name="creditLimit" value={formData.creditLimit} onChange={handleChange}
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

          <div className="pt-4 mt-2 flex justify-end gap-3 border-t border-gray-100">
            <button type="button" onClick={onClose} disabled={isSubmitting} className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-md transition-colors flex items-center justify-center min-w-[120px]">
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}