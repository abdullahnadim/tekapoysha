'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, CalendarClock, CreditCard as CardIcon } from 'lucide-react';
import { db } from '@/lib/firebase/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/components/auth/AuthContext';

interface WalletOption {
  id: string;
  name: string;
  isCreditCard: boolean;
}

interface AddSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  wallets: WalletOption[];
}

export default function AddSubscriptionModal({ isOpen, onClose, onSuccess, wallets }: AddSubscriptionModalProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    billingCycle: 'monthly',
    nextBillingDate: new Date().toISOString().split('T')[0],
    endDate: '', // New optional field
    walletId: '',
    walletName: '',
    isCreditCard: false,
    category: 'AI Services',
  });

  useEffect(() => {
    if (wallets.length > 0 && !formData.walletId) {
      setFormData(prev => ({
        ...prev,
        walletId: wallets[0].id,
        walletName: wallets[0].name,
        isCreditCard: wallets[0].isCreditCard
      }));
    }
  }, [wallets, formData.walletId]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleWalletChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    const selectedWallet = wallets.find(w => w.id === selectedId);
    if (selectedWallet) {
      setFormData({
        ...formData,
        walletId: selectedWallet.id,
        walletName: selectedWallet.name,
        isCreditCard: selectedWallet.isCreditCard
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setIsSubmitting(true);
    setError('');

    try {
      const payload: any = {
        userId: user.uid,
        name: formData.name,
        amount: Number(formData.amount),
        billingCycle: formData.billingCycle,
        nextBillingDate: formData.nextBillingDate,
        walletId: formData.walletId,
        walletName: formData.walletName,
        isCreditCard: formData.isCreditCard,
        category: formData.category,
        status: 'active',
        createdAt: serverTimestamp(),
      };

      if (formData.endDate) {
        payload.endDate = formData.endDate;
      }

      await addDoc(collection(db, "subscriptions"), payload);

      setFormData({ ...formData, name: '', amount: '', endDate: '' });
      onSuccess(); 
      onClose();   
    } catch (err: any) {
      console.error("Failed to add subscription:", err);
      setError('Failed to save the subscription.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md transition-opacity">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Add Subscription</h2>
            <p className="text-xs text-gray-500 font-medium mt-1">Track fixed overhead and recurring tools.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
          {error && <div className="p-3 bg-red-50 text-red-600 text-sm font-bold rounded-xl border border-red-100">{error}</div>}

          {/* Section 1: Core Details */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-black text-gray-800 uppercase tracking-widest border-b border-gray-100 pb-2">
              <CalendarClock className="w-4 h-4 text-blue-600" /> Core Details
            </div>
            
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Service Name</label>
              <input required type="text" name="name" value={formData.name} onChange={handleChange}
                className="w-full px-4 py-3.5 border border-gray-200 bg-gray-50 rounded-xl focus:ring-2 focus:ring-blue-600 focus:bg-white focus:border-transparent outline-none transition-all font-bold text-gray-800"
                placeholder="e.g., ChatGPT, Midjourney, Netflix" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Amount (৳)</label>
                <input required type="number" min="0" step="any" name="amount" value={formData.amount} onChange={handleChange}
                  className="w-full px-4 py-3.5 border border-gray-200 bg-gray-50 rounded-xl focus:ring-2 focus:ring-blue-600 focus:bg-white focus:border-transparent outline-none transition-all font-bold text-gray-800"
                  placeholder="0 for Free" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Billing Cycle</label>
                <select required name="billingCycle" value={formData.billingCycle} onChange={handleChange}
                  className="w-full px-4 py-3.5 border border-gray-200 bg-gray-50 rounded-xl focus:ring-2 focus:ring-blue-600 focus:bg-white focus:border-transparent outline-none transition-all font-bold text-gray-800">
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Timeline */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-black text-gray-800 uppercase tracking-widest border-b border-gray-100 pb-2">
              <CalendarClock className="w-4 h-4 text-purple-600" /> Timeline
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Next Due Date</label>
                <input required type="date" name="nextBillingDate" value={formData.nextBillingDate} onChange={handleChange}
                  className="w-full px-4 py-3.5 border border-gray-200 bg-gray-50 rounded-xl focus:ring-2 focus:ring-blue-600 focus:bg-white focus:border-transparent outline-none transition-all font-bold text-gray-800" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">End Date (Optional)</label>
                <input type="date" name="endDate" value={formData.endDate} onChange={handleChange}
                  className="w-full px-4 py-3.5 border border-gray-200 bg-gray-50 rounded-xl focus:ring-2 focus:ring-blue-600 focus:bg-white focus:border-transparent outline-none transition-all font-bold text-gray-800" 
                  title="Leave blank if it renews forever" />
              </div>
            </div>
          </div>

          {/* Section 3: Payment & Category */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-black text-gray-800 uppercase tracking-widest border-b border-gray-100 pb-2">
              <CardIcon className="w-4 h-4 text-emerald-600" /> Payment & Categorization
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Category</label>
                <select required name="category" value={formData.category} onChange={handleChange}
                  className="w-full px-4 py-3.5 border border-gray-200 bg-gray-50 rounded-xl focus:ring-2 focus:ring-blue-600 focus:bg-white focus:border-transparent outline-none transition-all font-bold text-gray-800">
                  <option value="AI Services">AI Services</option>
                  <option value="Software">Software</option>
                  <option value="Entertainment">Entertainment</option>
                  <option value="Bills & Utilities">Bills & Utilities</option>
                  <option value="Health & Fitness">Health & Fitness</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Paid Via</label>
                <select required value={formData.walletId} onChange={handleWalletChange}
                  className="w-full px-4 py-3.5 border border-gray-200 bg-gray-50 rounded-xl focus:ring-2 focus:ring-blue-600 focus:bg-white focus:border-transparent outline-none transition-all font-bold text-gray-800">
                  {wallets.length === 0 && <option value="">No accounts found</option>}
                  {wallets.map(w => (
                    <option key={w.id} value={w.id}>
                      {w.name} {w.isCreditCard ? '💳' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 flex gap-3">
            <button type="button" onClick={onClose} disabled={isSubmitting} 
              className="flex-1 py-4 bg-gray-100 font-bold text-gray-600 hover:bg-gray-200 transition-colors rounded-xl">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} 
              className="flex-1 py-4 bg-gray-900 hover:bg-black text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center">
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Subscription'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}