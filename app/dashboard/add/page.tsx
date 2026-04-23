"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthContext";
import { db } from "@/lib/firebase/config";
import { collection, addDoc } from "firebase/firestore";

export default function AddTransaction() {
  const router = useRouter();
  const { user } = useAuth();
  
  // States
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("expense"); // 'expense', 'income', or 'transfer'
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState("");

  // States for Income/Expense
  const [account, setAccount] = useState("Cash");
  const [category, setCategory] = useState("Food");

  // States for Transfers
  const [fromAccount, setFromAccount] = useState("Bank");
  const [toAccount, setToAccount] = useState("Savings");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);

    try {
      // The Magic: Automatically save the right data based on the type
      const transactionData = {
        amount: Number(amount),
        type,
        date: new Date(date),
        description,
        userId: user.uid,
        ...(type === 'transfer' 
          ? { fromAccount, toAccount, category: 'Transfer' } 
          : { account, category })
      };

      await addDoc(collection(db, "transactions"), transactionData);
      
      // Go back to dashboard instantly
      router.push("/dashboard");
    } catch (error) {
      console.error("Error adding document: ", error);
      alert("Failed to save transaction.");
    } finally {
      setLoading(false);
    }
  };

  // Helper to dynamically change category options based on Expense vs Income
  const getCategories = () => {
    if (type === 'income') {
      return ['Salary', 'Freelance', 'Investment', 'Gift', 'Other'];
    }
    return ['Food', 'Transport', 'Bills', 'Shopping', 'Entertainment', 'Other'];
  };

  return (
    <div className="max-w-2xl mx-auto p-4 font-sans">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add Transaction</h1>
          <p className="text-gray-500 text-sm mt-1">Log a new entry or transfer funds.</p>
        </div>
        <Link href="/dashboard" className="text-gray-400 hover:text-gray-900 font-medium transition-colors">
          &larr; Cancel
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* --- 3-WAY TOGGLE (Expense / Income / Transfer) --- */}
          <div className="flex rounded-xl bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${type === 'expense' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => setType('income')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${type === 'income' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Income
            </button>
            <button
              type="button"
              onClick={() => setType('transfer')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${type === 'transfer' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Transfer
            </button>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (৳)</label>
            <input
              type="number"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 outline-none transition-all"
              placeholder="0.00"
            />
          </div>

          {/* --- DYNAMIC FIELDS --- */}
          {type === 'transfer' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From Account</label>
                <select required value={fromAccount} onChange={(e) => setFromAccount(e.target.value)} className="w-full rounded-xl border border-gray-300 px-4 py-3 bg-white">
                  <option value="Cash">Cash</option>
                  <option value="Bank">Bank</option>
                  <option value="bKash">bKash</option>
                  <option value="Metro">Metro</option>
                  <option value="Savings">Savings</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To Account</label>
                <select required value={toAccount} onChange={(e) => setToAccount(e.target.value)} className="w-full rounded-xl border border-gray-300 px-4 py-3 bg-white">
                  <option value="Savings">Savings</option>
                  <option value="Bank">Bank</option>
                  <option value="bKash">bKash</option>
                  <option value="Cash">Cash</option>
                  <option value="Metro">Metro</option>
                </select>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account</label>
                <select required value={account} onChange={(e) => setAccount(e.target.value)} className="w-full rounded-xl border border-gray-300 px-4 py-3 bg-white">
                  <option value="Cash">Cash</option>
                  <option value="Bank">Bank</option>
                  <option value="bKash">bKash</option>
                  <option value="Metro">Metro</option>
                  <option value="Savings">Savings</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select required value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-xl border border-gray-300 px-4 py-3 bg-white">
                  {getCategories().map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
          {/* ---------------------- */}

          {/* Date & Description */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What was this for?"
                className="w-full rounded-xl border border-gray-300 px-4 py-3"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3.5 rounded-xl text-white font-bold text-lg transition-all shadow-sm ${
              loading ? 'bg-gray-400 cursor-not-allowed' : 
              type === 'income' ? 'bg-green-600 hover:bg-green-700' : 
              type === 'transfer' ? 'bg-blue-600 hover:bg-blue-700' : 
              'bg-gray-900 hover:bg-gray-800'
            }`}
          >
            {loading ? 'Saving...' : `Save ${type.charAt(0).toUpperCase() + type.slice(1)}`}
          </button>
        </form>
      </div>
    </div>
  );
}