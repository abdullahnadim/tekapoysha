"use client";

import { useEffect, useState } from "react";
import { Target, Plus, AlertTriangle, CheckCircle2, PieChart } from "lucide-react";
import { useAuth } from "@/components/auth/AuthContext";
import { db } from "@/lib/firebase/config";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import LoadingShield from "@/components/ui/LoadingShield";
import AddBudgetModal from "@/components/Budgets/AddBudgetModal";
import { Budget } from "@/types/budget";
import { Transaction } from "@/types";

export default function BudgetsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [currentMonthExpenses, setCurrentMonthExpenses] = useState<Transaction[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Get current YYYY-MM string to filter transactions efficiently
  const currentMonthPrefix = new Date().toISOString().slice(0, 7); 
  const currentMonthName = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  useEffect(() => {
    if (!user) return;

    // 1. Fetch Budgets
    const qBudgets = query(collection(db, "budgets"), where("userId", "==", user.uid));
    const unsubBudgets = onSnapshot(qBudgets, (snapshot) => {
      const fetched = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Budget));
      setBudgets(fetched);
    });

    // 2. Fetch Expenses for Current Month
    const qExpenses = query(
      collection(db, "transactions"), 
      where("userId", "==", user.uid),
      where("type", "==", "expense")
    );
    
    const unsubExpenses = onSnapshot(qExpenses, (snapshot) => {
      const fetched: Transaction[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        // Firebase Timestamp fallback check
        const dateStr = typeof data.date === 'string' ? data.date : data.date.toDate().toISOString();
        
        // Only keep expenses from the current YYYY-MM
        if (dateStr.startsWith(currentMonthPrefix)) {
          fetched.push({ id: doc.id, ...data } as Transaction);
        }
      });
      setCurrentMonthExpenses(fetched);
      setLoading(false);
    });

    return () => { unsubBudgets(); unsubExpenses(); };
  }, [user, currentMonthPrefix]);

  // Global Math
  const totalBudgetLimit = budgets.reduce((sum, b) => sum + b.monthlyLimit, 0);
  
  // Calculate total spent only against budgeted categories
  const totalBudgetSpent = currentMonthExpenses.reduce((sum, txn) => {
    if (budgets.some(b => b.category === txn.category)) {
      return sum + Number(txn.amount);
    }
    return sum;
  }, 0);

  if (loading) return <LoadingShield text="Loading Budget Engine..." />;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans pb-24">
      <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
        
        {/* HEADER WIDGET */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-gray-100">
          <div>
            <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
              <Target className="w-8 h-8 text-blue-600" /> Monthly Allocations
            </h2>
            <p className="text-gray-500 mt-2 font-medium">Control spending limits for <span className="font-bold text-gray-700">{currentMonthName}</span>.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 w-full sm:w-auto text-center sm:text-right">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Total Budgeted Spend</p>
              <p className="text-2xl font-black text-gray-900 leading-none">
                ৳ {totalBudgetSpent.toLocaleString('en-IN')} <span className="text-sm text-gray-400 font-bold">/ {totalBudgetLimit.toLocaleString('en-IN')}</span>
              </p>
            </div>
            
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-4 md:py-5 bg-gray-900 hover:bg-black text-white font-bold rounded-2xl shadow-md transition-all active:scale-95 whitespace-nowrap"
            >
              <Plus className="w-5 h-5" /> Set Limit
            </button>
          </div>
        </div>

        {/* BUDGET GRID */}
        {budgets.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[2rem] border border-dashed border-gray-200">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <PieChart className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">No budgets set</h3>
            <p className="text-gray-500 max-w-sm mx-auto">Set a monthly spending limit for a category to start tracking your allocations.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {budgets.map((budget) => {
              // Calculate spent for this specific category
              const spent = currentMonthExpenses
                .filter(txn => txn.category === budget.category)
                .reduce((sum, txn) => sum + Number(txn.amount), 0);
              
              const progressPercentage = (spent / budget.monthlyLimit) * 100;
              const isOver = spent > budget.monthlyLimit;
              const remaining = budget.monthlyLimit - spent;

              // Color Logic (Banking standards: Safe, Warning, Danger)
              let barColor = 'bg-emerald-500';
              let textColor = 'text-emerald-600';
              let lightBgColor = 'bg-emerald-50';
              let StatusIcon = CheckCircle2;

              if (progressPercentage >= 100) {
                barColor = 'bg-red-500';
                textColor = 'text-red-600';
                lightBgColor = 'bg-red-50';
                StatusIcon = AlertTriangle;
              } else if (progressPercentage >= 80) {
                barColor = 'bg-amber-500';
                textColor = 'text-amber-600';
                lightBgColor = 'bg-amber-50';
                StatusIcon = AlertTriangle;
              }

              return (
                <div key={budget.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col gap-4 relative transition-all hover:shadow-md">
                  
                  {/* Edit Button (Absolute) */}
                  <button 
                    onClick={() => setIsModalOpen(true)}
                    className="absolute top-5 right-5 text-xs font-bold text-gray-400 hover:text-blue-600 uppercase tracking-widest bg-gray-50 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Edit
                  </button>

                  <div className="pr-16">
                    <h4 className="font-black text-xl text-gray-900 truncate">{budget.category}</h4>
                  </div>

                  {/* Financial Meta */}
                  <div className="flex items-end justify-between">
                    <div>
                      <p className={`text-3xl font-black ${textColor}`}>৳ {spent.toLocaleString('en-IN')}</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                        Spent of ৳ {budget.monthlyLimit.toLocaleString('en-IN')} Limit
                      </p>
                    </div>
                    <div className={`p-3 rounded-xl flex items-center gap-2 ${lightBgColor}`}>
                      <StatusIcon className={`w-4 h-4 ${textColor}`} />
                      <div>
                        <p className={`text-[10px] font-bold uppercase tracking-widest ${textColor}`}>{isOver ? 'Overspent' : 'Remaining'}</p>
                        <p className={`text-sm font-bold ${textColor}`}>
                          ৳ {Math.abs(remaining).toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-2 space-y-2">
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className="text-gray-500">{progressPercentage.toFixed(0)}% Utilized</span>
                    </div>
                    <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${barColor} transition-all duration-1000 ease-out`} 
                        style={{ width: `${Math.min(progressPercentage, 100)}%` }} 
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
      
      <AddBudgetModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        existingBudgets={budgets}
      />
    </div>
  );
}