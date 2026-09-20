"use client";

import { useEffect, useState } from "react";
import LoadingShield from "@/components/ui/LoadingShield";
import { useAuth } from "@/components/auth/AuthContext";
import { db } from "@/lib/firebase/config";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { Transaction } from "@/types";
import ExpenseDonut from "@/components/Analytics/ExpenseDonut"; // <-- Using the Recharts donut

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });

  // Fetch all transactions
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

  // Filter by selected month
  const filteredTransactions = transactions.filter(txn => {
    if (!txn.date) return false;
    const dateObj = (txn.date as any)?.toDate ? (txn.date as any).toDate() : new Date(txn.date);
    const txnMonth = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
    return txnMonth === selectedMonth;
  });

  // Calculate totals for the summary cards
  const totalSpent = filteredTransactions
    .filter(t => t.type === "expense")
    .reduce((sum, t) => sum + Number(t.amount), 0);
    
  const totalIncome = filteredTransactions
    .filter(t => t.type === "income")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const netSavings = totalIncome - totalSpent;

  if (loading) return <LoadingShield text="Crunching numbers..." />;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
        
        {/* HEADER & CONTROLS */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100">
          <div>
            <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Analytics Hub</h2>
            <p className="text-gray-500 mt-1 font-medium">Deep dive into your monthly cash flow.</p>
          </div>
          <div className="w-full md:w-auto flex items-center gap-3">
            <span className="text-sm font-bold text-gray-400 uppercase tracking-widest hidden md:inline">Period:</span>
            <input 
              type="month" 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full md:w-auto px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 shadow-inner font-bold text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all cursor-pointer"
            />
          </div>
        </div>

        {/* CASH FLOW SUMMARY WIDGETS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-green-50/50 p-6 rounded-3xl border border-green-100 flex flex-col justify-between">
            <h3 className="text-sm font-bold text-green-800 mb-1">Total Income</h3>
            <p className="text-3xl font-black text-green-600">৳ {totalIncome.toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-red-50/50 p-6 rounded-3xl border border-red-100 flex flex-col justify-between">
            <h3 className="text-sm font-bold text-red-800 mb-1">Total Expenses</h3>
            <p className="text-3xl font-black text-red-600">৳ {totalSpent.toLocaleString('en-IN')}</p>
          </div>
          <div className={`${netSavings >= 0 ? 'bg-blue-50/50 border-blue-100' : 'bg-orange-50/50 border-orange-100'} p-6 rounded-3xl border flex flex-col justify-between`}>
            <h3 className={`text-sm font-bold mb-1 ${netSavings >= 0 ? 'text-blue-800' : 'text-orange-800'}`}>Net Savings</h3>
            <p className={`text-3xl font-black ${netSavings >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
              {netSavings >= 0 ? '+' : ''}৳ {netSavings.toLocaleString('en-IN')}
            </p>
          </div>
        </div>

        {/* CHART CARD */}
        <div className="bg-white p-6 md:p-10 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center">
          <div className="w-full text-left mb-8">
            <h3 className="font-bold text-gray-900 text-xl">Spending Breakdown</h3>
            <p className="text-sm text-gray-500 font-medium">Where your money went in {new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
          </div>
          
          <div className="w-full max-w-2xl h-80">
            {/* Injecting the premium Recharts Donut here */}
            <ExpenseDonut transactions={filteredTransactions} />
          </div>
        </div>

      </div>
    </div>
  );
}