'use client';

import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { db } from '@/lib/firebase/config';
import { collection, addDoc, updateDoc, doc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '@/components/auth/AuthContext';
import { Budget } from '@/types/budget';

interface AddBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingBudgets: Budget[];
}

export default function AddBudgetModal({ isOpen, onClose, existingBudgets }: AddBudgetModalProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    category: 'Food & Dining',
    monthlyLimit: '',
  });

  const categories = ["Food & Dining", "Transportation", "Shopping", "Housing", "Bills & Utilities", "Entertainment", "Healthcare", "Personal Care", "Education", "Other"];

  // When a user selects a category, check if they already have a budget for it to pre-fill the form
  useEffect(() => {
    const existing = existingBudgets.find(b => b.category === formData.category);
    if (existing) {
      setFormData(prev => ({ ...prev, monthlyLimit: existing.monthlyLimit.toString() }));
    } else {
      setFormData(prev => ({ ...prev, monthlyLimit: '' }));
    }
  }, [formData.category, existingBudgets]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setIsSubmitting(true);
    setError('');

    try {
      const existingBudget = existingBudgets.find(b => b.category === formData.category);

      if (existingBudget && existingBudget.id) {
        // Update existing budget
        await updateDoc(doc(db, "budgets", existingBudget.id), {
          monthlyLimit: Number(formData.monthlyLimit),
        });
      } else {
        // Create new budget
        await addDoc(collection(db, "budgets"), {
          userId: user.uid,
          category: formData.category,
          monthlyLimit: Number(formData.monthlyLimit),
          createdAt: serverTimestamp(),
        });
      }

      onClose();   
    } catch (err) {
      console.error("Failed to save budget:", err);
      setError('Failed to save the budget limit.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50">
          <h2 className="text-xl font-bold text-gray-800">Set Category Budget</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full text-gray-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && <div className="p-3 bg-red-50 text-red-600 text-sm font-medium rounded-lg">{error}</div>}

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Category</label>
            <select required name="category" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})}
              className="w-full px-4 py-3 border border-gray-200 bg-gray-50 rounded-xl focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none font-bold text-gray-700 transition-all">
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Monthly Limit (৳)</label>
            <input required type="number" min="1" step="any" name="monthlyLimit" value={formData.monthlyLimit} onChange={(e) => setFormData({...formData, monthlyLimit: e.target.value})}
              className="w-full px-4 py-3 border border-gray-200 bg-gray-50 rounded-xl focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none transition-all font-black text-gray-900 text-lg"
              placeholder="5000" />
          </div>

          <div className="pt-2 flex gap-3">
            <button type="button" onClick={onClose} disabled={isSubmitting} className="flex-1 py-3.5 bg-gray-100 font-bold text-gray-600 hover:bg-gray-200 transition-colors rounded-xl">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-colors flex items-center justify-center">
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Limit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}