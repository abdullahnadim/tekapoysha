'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { db } from '@/lib/firebase/config';
import { doc, updateDoc, deleteDoc, increment } from 'firebase/firestore';

interface WalletOption {
  id: string;
  name: string;
  isCreditCard?: boolean;
}

interface TransactionRecord {
  id: string;
  type: 'expense' | 'income' | 'transfer';
  amount: number;
  category: string;
  account?: string;
  fromAccount?: string;
  toAccount?: string;
  description: string;
  date: any; // Allow Firebase Timestamps
}

interface EditRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  record: TransactionRecord | null;
  wallets: WalletOption[];
}

export default function EditRecordModal({ isOpen, onClose, onSuccess, record, wallets }: EditRecordModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [account, setAccount] = useState('');
  const [fromAccount, setFromAccount] = useState('');
  const [toAccount, setToAccount] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');

  // Standard Categories
  const expenseCategories = ["Food & Dining", "Transportation", "Shopping", "Housing", "Bills & Utilities", "Entertainment", "Healthcare", "Personal Care", "Education", "Other"];
  const incomeCategories = ["Salary", "Business", "Freelance", "Gifts", "Investments", "Other"];

  useEffect(() => {
    if (record && isOpen) {
      setAmount(record.amount.toString());
      setCategory(record.category || '');
      setAccount(record.account || '');
      setFromAccount(record.fromAccount || '');
      setToAccount(record.toAccount || '');
      
      // --- BULLETPROOF DATE PARSER ---
      let formattedDate = new Date().toISOString().split('T')[0]; // Fallback
      
      if (record.date) {
        if (typeof record.date === 'string') {
          // Handle ISO strings
          formattedDate = record.date.split('T')[0];
        } else if (typeof record.date.toDate === 'function') {
          // Handle Firebase Timestamps
          formattedDate = record.date.toDate().toISOString().split('T')[0];
        } else {
          // Handle standard JS Date objects
          try {
            formattedDate = new Date(record.date).toISOString().split('T')[0];
          } catch (e) {
            console.warn("Date parsing failed, falling back to today.");
          }
        }
      }
      
      setDate(formattedDate);
      setDescription(record.description || '');
      setError('');
    }
  }, [record, isOpen]);

  if (!isOpen || !record) return null;

  // --- BALANCE ENGINE ---
  const applyBalanceChange = async (walletName: string, amountChange: number, isTransferToCreditCard = false) => {
    const wallet = wallets.find(w => w.name === walletName);
    if (!wallet) return;

    if (wallet.isCreditCard) {
      let finalChange = amountChange;
      if (isTransferToCreditCard) finalChange = -amountChange;
      
      await updateDoc(doc(db, "creditCards", wallet.id), {
        currentBalance: increment(finalChange)
      });
    } else {
      await updateDoc(doc(db, "paymentMethods", wallet.id), {
        balance: increment(-amountChange) 
      }).catch(() => { /* Silently fail if standard wallets don't track running balances yet */ });
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this record? Associated account balances will be restored automatically.")) return;
    
    setIsDeleting(true);
    setError('');

    try {
      if (record.type === 'expense') {
        await applyBalanceChange(record.account!, -record.amount); 
      } else if (record.type === 'income') {
        await applyBalanceChange(record.account!, record.amount); 
      } else if (record.type === 'transfer') {
        await applyBalanceChange(record.fromAccount!, -record.amount); 
        await applyBalanceChange(record.toAccount!, record.amount, true); 
      }

      await deleteDoc(doc(db, "transactions", record.id));
      
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Deletion failed:", err);
      setError("Failed to delete the record. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Number(amount) <= 0) return;

    setIsSubmitting(true);
    setError('');

    try {
      const numAmount = Number(amount);

      // 1. REVERSE THE ORIGINAL BALANCES
      if (record.type === 'expense') {
        await applyBalanceChange(record.account!, -record.amount);
      } else if (record.type === 'income') {
        await applyBalanceChange(record.account!, record.amount);
      } else if (record.type === 'transfer') {
        await applyBalanceChange(record.fromAccount!, -record.amount);
        await applyBalanceChange(record.toAccount!, record.amount, true);
      }

      // 2. APPLY THE NEW BALANCES
      if (record.type === 'expense') {
        await applyBalanceChange(account, numAmount);
      } else if (record.type === 'income') {
        await applyBalanceChange(account, -numAmount);
      } else if (record.type === 'transfer') {
        await applyBalanceChange(fromAccount, numAmount);
        await applyBalanceChange(toAccount, numAmount, true);
      }

      // 3. UPDATE RECORD IN DATABASE
      const updateData: any = {
        amount: numAmount,
        date: new Date(date).toISOString(),
        description,
        category,
      };

      if (record.type === 'transfer') {
        updateData.fromAccount = fromAccount;
        updateData.toAccount = toAccount;
      } else {
        updateData.account = account;
      }

      await updateDoc(doc(db, "transactions", record.id), updateData);

      onSuccess();
      onClose();
    } catch (err) {
      console.error("Update failed:", err);
      setError("Failed to save changes. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md transition-opacity">
      <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        
        {/* HEADER */}
        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Edit {record.type.charAt(0).toUpperCase() + record.type.slice(1)}
            </h2>
            <p className="text-xs text-gray-500 font-medium mt-1">Updates will automatically sync to your accounts.</p>
          </div>
          <button onClick={onClose} disabled={isSubmitting || isDeleting} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* FORM BODY */}
        <form onSubmit={handleUpdate} className="p-6 space-y-6 overflow-y-auto">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 text-sm font-bold rounded-xl border border-red-100">
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
          )}

          {/* AMOUNT INPUT */}
          <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 text-center">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Total Amount</label>
            <div className="flex items-center justify-center text-4xl font-black text-gray-900">
              <span className="mr-2 text-gray-400">৳</span>
              <input 
                type="number" 
                required 
                min="1"
                step="any"
                value={amount} 
                onChange={(e) => setAmount(e.target.value)}
                className="w-full max-w-[200px] bg-transparent outline-none text-center placeholder-gray-300 p-0 focus:ring-0 border-none"
              />
            </div>
          </div>

          {/* ACCOUNTS & CATEGORY */}
          {record.type !== 'transfer' ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Account</label>
                <select value={account} onChange={(e) => setAccount(e.target.value)} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3.5 font-bold text-gray-700 outline-none focus:border-blue-500 transition-colors">
                  {wallets.map(w => (
                    <option key={w.id} value={w.name}>{w.name} {w.isCreditCard ? '💳' : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3.5 font-bold text-gray-700 outline-none focus:border-blue-500 transition-colors">
                  {(record.type === "expense" ? expenseCategories : incomeCategories).map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
              <div>
                <label className="block text-xs font-bold text-blue-800 uppercase tracking-wider mb-2">From</label>
                <select value={fromAccount} onChange={(e) => setFromAccount(e.target.value)} className="w-full bg-white border border-blue-200 rounded-xl px-4 py-3.5 font-bold text-gray-700 outline-none focus:border-blue-500">
                  {wallets.map(w => (
                    <option key={w.id} value={w.name}>{w.name} {w.isCreditCard ? '💳' : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-blue-800 uppercase tracking-wider mb-2">To</label>
                <select value={toAccount} onChange={(e) => setToAccount(e.target.value)} className="w-full bg-white border border-blue-200 rounded-xl px-4 py-3.5 font-bold text-gray-700 outline-none focus:border-blue-500">
                  {wallets.map(w => (
                    <option key={w.id} value={w.name}>{w.name} {w.isCreditCard ? '💳' : ''}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* DATE & NOTE */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3.5 font-bold text-gray-700 outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Note</label>
              <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional details..." className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3.5 font-bold text-gray-700 outline-none focus:border-blue-500" />
            </div>
          </div>

          {/* ACTIONS */}
          <div className="pt-4 flex flex-col-reverse sm:flex-row gap-3 border-t border-gray-100">
            <button 
              type="button" 
              onClick={handleDelete} 
              disabled={isSubmitting || isDeleting}
              className="px-6 py-4 flex items-center justify-center gap-2 bg-white border border-red-100 text-red-600 font-bold rounded-xl hover:bg-red-50 hover:border-red-200 transition-colors"
            >
              {isDeleting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
              <span className="sm:hidden">Delete Record</span>
            </button>
            <button 
              type="button" 
              onClick={onClose} 
              disabled={isSubmitting || isDeleting} 
              className="flex-1 py-4 bg-gray-100 font-bold text-gray-600 hover:bg-gray-200 transition-colors rounded-xl"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting || isDeleting} 
              className="flex-[2] py-4 bg-gray-900 hover:bg-black text-white font-bold rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />} Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}