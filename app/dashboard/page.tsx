"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthContext";
import { db } from "@/lib/firebase/config";
import { collection, query, where, onSnapshot, doc, deleteDoc, updateDoc, getDocs } from "firebase/firestore";
import { Transaction } from "@/types";

export default function Dashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [balances, setBalances] = useState({
    Bank: 0,
    Cash: 0,
    bKash: 0,
  });
// --- NEW EDIT STATE & LOGIC ---
  const [editingTxn, setEditingTxn] = useState<Transaction | null>(null);

  // Helper to format Firebase date to "YYYY-MM-DD" for the HTML input
  const formatDateForInput = (dateObj: any) => {
    if (!dateObj) return "";
    const d = dateObj?.toDate ? dateObj.toDate() : new Date(dateObj);
    return d.toISOString().split('T')[0];
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTxn || !editingTxn.id) return;

    try {
      const txnRef = doc(db, "transactions", editingTxn.id);
      await updateDoc(txnRef, {
        amount: Number(editingTxn.amount),
        account: editingTxn.account,
        category: editingTxn.category,
        description: editingTxn.description,
        date: new Date(editingTxn.date as string), // Convert string back to Date
      });
      setEditingTxn(null); // Close the modal
      
      
    } catch (error) {
      console.error("Error updating transaction: ", error);
      alert("Failed to update transaction.");
    }
  };

const handleDelete = async (id: string) => {
    // Show a confirmation pop-up
    if (!window.confirm("Are you sure you want to delete this transaction?")) return;
    
    try {
      await deleteDoc(doc(db, "transactions", id));
      
    } catch (error) {
      console.error("Error deleting transaction: ", error);
      alert("Failed to delete transaction.");
    }
  };


  // ------------------------------
  useEffect(() => {
    if (!user) return;

    // Create the query
    const q = query(
      collection(db, "transactions"),
      where("userId", "==", user.uid)
    );

    // onSnapshot automatically runs EVERY time a transaction is added, edited, or deleted!
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedTransactions: Transaction[] = [];
      let newBalances = { Bank: 0, Cash: 0, bKash: 0, Metro: 0, Savings: 0 };

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        fetchedTransactions.push({ id: doc.id, ...data } as Transaction);

        // Calculate Balances safely
        const amount = Number(data.amount);
        const accountType = data.account as keyof typeof newBalances;
        
        if (data.type === "income") {
          newBalances[accountType] = (newBalances[accountType] || 0) + amount;
        } else if (data.type === "expense") {
          newBalances[accountType] = (newBalances[accountType] || 0) - amount;
        }
      });

      // Sort newest first
      fetchedTransactions.sort((a, b) => {
        const dateA = (a.date as any)?.toDate ? (a.date as any).toDate() : new Date(a.date);
        const dateB = (b.date as any)?.toDate ? (b.date as any).toDate() : new Date(b.date);
        return dateB.getTime() - dateA.getTime();
      });

      setTransactions(fetchedTransactions);
      setBalances(newBalances);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching live data:", error);
      setLoading(false);
    });

    // Cleanup the listener when you leave the page
    return () => unsubscribe();
  }, [user]);

  if (loading) {
    return <div className="animate-pulse flex space-x-4 p-6">Loading dashboard data...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Overview</h2>
        <p className="text-gray-600 mt-1">Here is your current financial summary.</p>
      </div>

      {/* Account Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Bank Balance</h3>
          <p className={`text-3xl font-bold ${balances.Bank < 0 ? 'text-red-600' : 'text-gray-900'}`}>
            ৳ {balances.Bank.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Cash</h3>
          <p className={`text-3xl font-bold ${balances.Cash < 0 ? 'text-red-600' : 'text-gray-900'}`}>
            ৳ {balances.Cash.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500 mb-2">bKash</h3>
          <p className={`text-3xl font-bold ${balances.bKash < 0 ? 'text-red-600' : 'text-gray-900'}`}>
            ৳ {balances.bKash.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Recent Transactions List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mt-8">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-gray-900">Recent Transactions</h3>
          <Link 
            href="/dashboard/add" 
            className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
          >
            + Add Transaction
          </Link>
        </div>

        {transactions.length === 0 ? (
          <div className="py-12 text-center border-2 border-dashed border-gray-100 rounded-xl">
            <p className="text-gray-500 text-sm">No transactions yet. Click above to add one.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {transactions.slice(0, 5).map((txn) => (
              <div key={txn.id} className="flex justify-between items-center p-4 hover:bg-gray-50 rounded-lg transition-colors border border-gray-50">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${txn.type === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                    {txn.type === 'income' ? 'np↓' : '↑'}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{txn.category}</p>
                    <p className="text-sm text-gray-500">
  {txn.account} • {new Date((txn.date as any)?.toDate ? (txn.date as any).toDate() : txn.date).toLocaleDateString('en-GB')}
</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
            <div className="text-right">
              <p className={`font-bold ${txn.type === 'income' ? 'text-green-600' : 'text-gray-900'}`}>
                {txn.type === 'income' ? '+' : '-'} ৳ {Number(txn.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              {txn.description && (
                <p className="text-xs text-gray-500 truncate max-w-[120px] sm:max-w-[200px]">{txn.description}</p>
              )}
            </div>
            
            {/* Edit Button */}
            <button
              onClick={() => setEditingTxn({
                ...txn,
                date: formatDateForInput(txn.date)
              })}
              className="text-gray-400 hover:text-blue-500 hover:bg-blue-50 p-2 rounded-full transition-colors"
              title="Edit Transaction"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
            </button>

            {/* Delete Button */}
            <button
              onClick={() => txn.id && handleDelete(txn.id)}
              className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition-colors"
              title="Delete Transaction"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* --- EDIT MODAL --- */}
      {editingTxn && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-xl font-bold mb-4">Edit Transaction</h2>
            
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (৳)</label>
                <input
                  type="number"
                  required
                  value={editingTxn.amount}
                  onChange={(e) => setEditingTxn({ ...editingTxn, amount: Number(e.target.value) })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account</label>
                  <select
                    value={editingTxn.account}
                    onChange={(e) => setEditingTxn({ ...editingTxn, account: e.target.value as any })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank">Bank</option>
                    <option value="bKash">bKash</option>
                    <option value="Metro">Metro</option>
                    <option value="Savings">Savings</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={editingTxn.date as string}
                    onChange={(e) => setEditingTxn({ ...editingTxn, date: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  value={editingTxn.description}
                  onChange={(e) => setEditingTxn({ ...editingTxn, description: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setEditingTxn(null)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}