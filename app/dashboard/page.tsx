"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthContext";
import { db } from "@/lib/firebase/config";
import { collection, query, where, getDocs } from "firebase/firestore";
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

  useEffect(() => {
    async function fetchDashboardData() {
      if (!user) return;

      try {
        // 1. Get all transactions for the logged-in user
        const q = query(
          collection(db, "transactions"),
          where("userId", "==", user.uid)
        );
        
        const querySnapshot = await getDocs(q);
        const fetchedTransactions: Transaction[] = [];
        let newBalances = { Bank: 0, Cash: 0, bKash: 0 };

        // 2. Process each transaction
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          fetchedTransactions.push({ id: doc.id, ...data } as Transaction);

          // Calculate Balances
          const amount = Number(data.amount);
          if (data.type === "income") {
            newBalances[data.account as keyof typeof newBalances] += amount;
          } else if (data.type === "expense") {
            newBalances[data.account as keyof typeof newBalances] -= amount;
          }
        });

        // 3. Sort transactions by date (newest first)
fetchedTransactions.sort((a, b) => {
  // Use "as any" to bypass the strict check and verify .toDate existence
  const dateA = (a.date as any)?.toDate ? (a.date as any).toDate() : new Date(a.date);
  const dateB = (b.date as any)?.toDate ? (b.date as any).toDate() : new Date(b.date);
  return dateB.getTime() - dateA.getTime();
});

        setTransactions(fetchedTransactions);
        setBalances(newBalances);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
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
                <div className="text-right">
                  <p className={`font-bold ${txn.type === 'income' ? 'text-green-600' : 'text-gray-900'}`}>
                    {txn.type === 'income' ? '+' : '-'} ৳ {Number(txn.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                  {txn.description && (
                    <p className="text-xs text-gray-500 truncate max-w-[120px] sm:max-w-[200px]">{txn.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}