'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, ArrowRight } from 'lucide-react';
import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { updateCreditCard } from '@/lib/services/creditCardService';
import { useAuth } from '@/components/auth/AuthContext';
import { CreditCard } from '../../types/creditCard';

interface Wallet {
  id: string;
  name: string;
}

interface PayBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  card: CreditCard;
}

export default function PayBillModal({ isOpen, onClose, onSuccess, card }: PayBillModalProps) {
  const { user } = useAuth();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [sourceWallet, setSourceWallet] = useState('');
  const [amount, setAmount] = useState(card.currentBalance.toString());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Fetch standard wallets to fund the payment
  useEffect(() => {
    if (!user || !isOpen) return;
    const fetchWallets = async () => {
      const q = query(collection(db, "paymentMethods"), where("userId", "==", user.uid));
      const snapshot = await getDocs(q);
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
      setWallets(fetched);
      if (fetched.length > 0) setSourceWallet(fetched[0].name);
    };
    fetchWallets();
  }, [user, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !card.id || !sourceWallet) return;
    
    setIsSubmitting(true);
    setError('');

    const payAmount = Number(amount);

    try {
      // 1. Log the transaction so the Dashboard Debt Engine calculates it
      await addDoc(collection(db, "transactions"), {
        userId: user.uid,
        type: "transfer",
        amount: payAmount,
        fromAccount: sourceWallet,
        toAccount: card.cardName,
        category: "Credit Card Payment",
        description: `Paid bill for ${card.cardName}`,
        date: new Date(),
        createdAt: serverTimestamp(),
      });

      // 2. Update the physical card's document balance
      const newBalance = Math.max(0, card.currentBalance - payAmount);
      await updateCreditCard(card.id, { currentBalance: newBalance });

      onSuccess(); 
      onClose();   
    } catch (err: any) {
      console.error("Payment failed:", err);
      setError(err.message || 'Failed to process payment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50">
          <h2 className="text-xl font-bold text-gray-900">Pay Card Bill</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full text-gray-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && <div className="p-3 bg-red-50 text-red-600 text-sm font-medium rounded-lg">{error}</div>}

          <div className="flex items-center justify-between bg-blue-50 p-4 rounded-xl border border-blue-100">
            <div>
              <p className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-1">Paying Off</p>
              <p className="font-bold text-gray-900">{card.cardName}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-1">Current Balance</p>
              <p className="font-black text-blue-600">৳ {card.currentBalance.toLocaleString()}</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Payment Amount (৳)</label>
            <input 
              type="number" 
              required 
              min="1" 
              step="any"
              value={amount} 
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 bg-gray-50 rounded-xl focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none font-bold text-lg transition-all" 
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              Pay From <ArrowRight className="w-4 h-4 text-gray-400" />
            </label>
            <select 
              value={sourceWallet} 
              onChange={(e) => setSourceWallet(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 bg-gray-50 rounded-xl focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none font-bold text-gray-700 transition-all"
            >
              {wallets.length === 0 ? <option value="">No Wallets Found</option> : null}
              {wallets.map(w => <option key={w.id} value={w.name}>{w.name}</option>)}
            </select>
          </div>

          <div className="pt-2 flex gap-3">
            <button type="button" onClick={onClose} disabled={isSubmitting} className="flex-1 py-3.5 bg-gray-100 font-bold text-gray-600 hover:bg-gray-200 transition-colors rounded-xl">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting || !sourceWallet} className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-colors flex items-center justify-center gap-2">
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}