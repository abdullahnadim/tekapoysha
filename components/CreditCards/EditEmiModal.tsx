'use client';

import { useState } from 'react';
import { X, Loader2, Calculator, AlertTriangle } from 'lucide-react';
import { db } from '@/lib/firebase/config';
import { doc, updateDoc } from 'firebase/firestore';
import { EMI } from '../../types/emi';
import { CreditCard } from '../../types/creditCard';

interface EditEmiModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  emi: EMI;
  cards: CreditCard[];
}

export default function EditEmiModal({ isOpen, onClose, onSuccess, emi, cards }: EditEmiModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    cardId: emi.cardId,
    itemName: emi.itemName,
    totalAmount: emi.totalAmount.toString(),
    monthlyAmount: emi.monthlyAmount.toString(),
    totalMonths: emi.totalMonths.toString(),
    monthsPaid: emi.monthsPaid.toString(),
  });

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      
      // Auto-recalculate the monthly amount if total amount or total months are changed
      if (name === 'totalAmount' || name === 'totalMonths') {
        const total = Number(updated.totalAmount) || 0;
        const months = Number(updated.totalMonths) || 1;
        updated.monthlyAmount = (total / months).toFixed(2);
      }
      
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emi.id) return;
    
    setIsSubmitting(true);
    setError('');

    const selectedCard = cards.find(c => c.id === formData.cardId);
    if (!selectedCard) {
      setError('Selected card not found.');
      setIsSubmitting(false);
      return;
    }

    try {
      await updateDoc(doc(db, "emis", emi.id), {
        cardId: selectedCard.id,
        cardName: selectedCard.cardName,
        itemName: formData.itemName,
        totalAmount: Number(formData.totalAmount),
        monthlyAmount: Number(formData.monthlyAmount),
        totalMonths: Number(formData.totalMonths),
        monthsPaid: Number(formData.monthsPaid),
      });

      // NOTE: We do NOT auto-update the Credit Card balance on an EDIT to prevent 
      // accidentally overriding manual payments you may have already made. 

      onSuccess(); 
      onClose();   
    } catch (err: any) {
      console.error("Failed to update EMI:", err);
      setError(err.message || 'Failed to update the EMI.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50">
          <h2 className="text-xl font-bold text-gray-800">Edit EMI Log</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full text-gray-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-600 text-sm font-medium rounded-lg">{error}</div>}

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Item Name</label>
            <input required type="text" name="itemName" value={formData.itemName} onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-200 bg-gray-50 rounded-xl focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none transition-all font-medium" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Total Payable (৳)</label>
              <input required type="number" min="0" name="totalAmount" value={formData.totalAmount} onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-200 bg-gray-50 rounded-xl focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none transition-all font-bold" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Total Months</label>
              <input required type="number" min="1" name="totalMonths" value={formData.totalMonths} onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-200 bg-gray-50 rounded-xl focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none transition-all font-bold" />
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center justify-between mt-2">
            <div className="flex items-center gap-2 text-blue-800">
              <Calculator className="w-5 h-5" />
              <span className="text-sm font-bold">Calculated Hit:</span>
            </div>
            <input 
              required type="number" min="0" step="any" name="monthlyAmount" 
              value={formData.monthlyAmount} onChange={handleChange}
              className="w-28 bg-transparent text-right outline-none font-black text-blue-600 text-lg" 
            />
          </div>

          <div className="flex items-start gap-3 p-3 bg-orange-50 border border-orange-100 rounded-xl mt-2">
            <AlertTriangle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
            <p className="text-xs font-medium text-orange-800 leading-relaxed">
              Editing the total here updates your EMI tracker, but will <span className="font-bold">not</span> retroactively alter your physical Credit Card balance to prevent overriding your manual bill payments.
            </p>
          </div>

          <div className="pt-2 flex gap-3">
            <button type="button" onClick={onClose} disabled={isSubmitting} className="flex-1 py-3.5 bg-gray-100 font-bold text-gray-600 hover:bg-gray-200 transition-colors rounded-xl">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-colors flex items-center justify-center">
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}