'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, Calculator } from 'lucide-react';
import { db } from '@/lib/firebase/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/components/auth/AuthContext';
import { CreditCard } from '../../types/creditCard';
import { updateCreditCard } from '@/lib/services/creditCardService';

interface AddEmiModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  cards: CreditCard[];
}

export default function AddEmiModal({ isOpen, onClose, onSuccess, cards }: AddEmiModalProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    cardId: '',
    itemName: '',
    principalAmount: '',
    interestInput: '0',
    interestType: 'percentage' as 'percentage' | 'flat',
    totalMonths: '12',
    startDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (cards.length > 0 && !formData.cardId) {
      setFormData(prev => ({ ...prev, cardId: cards[0].id || '' }));
    }
  }, [cards, formData.cardId]);

  if (!isOpen) return null;

  // Auto-calculate totals based on percentage or flat interest
  const principal = Number(formData.principalAmount) || 0;
  const rawInterest = Number(formData.interestInput) || 0;
  
  const calculatedInterest = formData.interestType === 'percentage' 
    ? principal * (rawInterest / 100) 
    : rawInterest;

  const totalPayable = principal + calculatedInterest;
  const monthlyAmount = formData.totalMonths 
    ? (totalPayable / Number(formData.totalMonths)).toFixed(2) 
    : '0.00';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const toggleInterestType = (type: 'percentage' | 'flat') => {
    setFormData({ ...formData, interestType: type, interestInput: '0' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setIsSubmitting(true);
    setError('');

    const selectedCard = cards.find(c => c.id === formData.cardId);
    if (!selectedCard || !selectedCard.id) {
      setError('Please select a valid credit card.');
      setIsSubmitting(false);
      return;
    }

    try {
      // 1. Create the EMI Record
      await addDoc(collection(db, "emis"), {
        userId: user.uid,
        cardId: selectedCard.id,
        cardName: selectedCard.cardName,
        itemName: formData.itemName,
        principalAmount: principal,
        interestAmount: calculatedInterest,
        totalAmount: totalPayable,
        monthlyAmount: Number(monthlyAmount),
        totalMonths: Number(formData.totalMonths),
        monthsPaid: 0,
        startDate: formData.startDate,
        status: 'active',
        createdAt: serverTimestamp(),
      });

      // 2. CONNECT TO CARD: Instantly add the full EMI liability to the Card's Current Balance
      await updateCreditCard(selectedCard.id, {
        currentBalance: selectedCard.currentBalance + totalPayable
      });

      setFormData({ ...formData, itemName: '', principalAmount: '', interestInput: '0' });
      onSuccess(); 
      onClose();   
    } catch (err: any) {
      console.error("Failed to add EMI:", err);
      setError(err.message || 'Failed to save the EMI.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50">
          <h2 className="text-xl font-bold text-gray-800">Log New EMI</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full text-gray-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-600 text-sm font-medium rounded-lg">{error}</div>}

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Item / Purchase Name</label>
            <input required type="text" name="itemName" value={formData.itemName} onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-200 bg-gray-50 rounded-xl focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none transition-all font-medium"
              placeholder="e.g., iPhone 15 Pro, AC" />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Select Credit Card</label>
            <select required name="cardId" value={formData.cardId} onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-200 bg-gray-50 rounded-xl focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none font-bold text-gray-700 transition-all">
              {cards.map(c => <option key={c.id} value={c.id}>{c.cardName} (•••• {c.lastFourDigits})</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Principal (৳)</label>
              <input required type="number" min="1" name="principalAmount" value={formData.principalAmount} onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-200 bg-gray-50 rounded-xl focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none transition-all font-bold"
                placeholder="120000" />
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-bold text-gray-700">Interest</label>
                <div className="flex bg-gray-200 p-0.5 rounded-lg">
                  <button type="button" onClick={() => toggleInterestType('percentage')}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-colors ${formData.interestType === 'percentage' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}
                  >%</button>
                  <button type="button" onClick={() => toggleInterestType('flat')}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-colors ${formData.interestType === 'flat' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}
                  >৳</button>
                </div>
              </div>
              <input required type="number" min="0" step="any" name="interestInput" value={formData.interestInput} onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-200 bg-gray-50 rounded-xl focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none transition-all font-bold text-red-600"
                placeholder={formData.interestType === 'percentage' ? '11.99' : '5000'} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Duration (Months)</label>
            <select required name="totalMonths" value={formData.totalMonths} onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-200 bg-gray-50 rounded-xl focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none transition-all font-bold">
              {[3, 6, 9, 12, 18, 24, 36].map(m => <option key={m} value={m}>{m} Months</option>)}
            </select>
          </div>

          {/* Calculator Preview Box */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex flex-col gap-2 mt-2">
            <div className="flex justify-between items-center text-sm font-bold text-blue-800">
              <span>Total Payable (Limit Blocked):</span>
              <span>৳ {totalPayable.toLocaleString('en-IN')}</span>
            </div>
            {formData.interestType === 'percentage' && (
              <div className="flex justify-between items-center text-xs font-bold text-blue-600/70">
                <span>Calculated Interest:</span>
                <span>+ ৳ {calculatedInterest.toLocaleString('en-IN')}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-lg font-black text-blue-600 mt-1 pt-2 border-t border-blue-200">
              <span className="flex items-center gap-2"><Calculator className="w-5 h-5" /> Monthly Hit:</span>
              <span>৳ {Number(monthlyAmount).toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div className="pt-2 flex gap-3">
            <button type="button" onClick={onClose} disabled={isSubmitting} className="flex-1 py-3.5 bg-gray-100 font-bold text-gray-600 hover:bg-gray-200 transition-colors rounded-xl">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-colors flex items-center justify-center">
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Start EMI'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}