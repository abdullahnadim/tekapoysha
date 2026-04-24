"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthContext";
import { db } from "@/lib/firebase/config";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { Transaction } from "@/types";
import SpendingChart from "@/components/dashboard/SpendingChart";

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "transactions"), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched: Transaction[] = [];
      snapshot.forEach((doc) => fetched.push({ id: doc.id, ...doc.data() } as Transaction));
      setTransactions(fetched);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const filteredTransactions = transactions.filter(txn => {
    if (!txn.date) return false;
    const dateObj = (txn.date as any)?.toDate ? (txn.date as any).toDate() : new Date(txn.date);
    const txnMonth = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
    return txnMonth === selectedMonth;
  });

  // Calculate total spent for the summary card
  const totalSpent = filteredTransactions
    .filter(t => t.type === "expense")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  if (loading) return <div className="p-8 animate-pulse text-gray-500">Loading Analytics...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* HEADER */}
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Analytics</h2>
            <p className="text-gray-500 mt-1">Deep dive into your spending habits.</p>
          </div>
          <input 
            type="month" 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white shadow-sm font-bold text-gray-900 outline-none focus:border-blue-500"
          />
        </div>

        {/* CHART CARD */}
        <div className="bg-white p-6 md:p-10 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center">
          <h3 className="font-bold text-gray-900 text-xl mb-2">Spending Breakdown</h3>
          <p className="text-sm text-gray-500 mb-8">
            Total Spent: <span className="text-red-600 font-bold ml-1">৳ {totalSpent.toLocaleString('en-IN')}</span>
          </p>
          
          <div className="w-full max-w-2xl h-80">
            <SpendingChart transactions={filteredTransactions} />
          </div>
        </div>

      </div>
    </div>
  );
}