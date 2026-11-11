"use client";

import { useEffect, useState } from "react";
import LoadingShield from "@/components/ui/LoadingShield";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthContext";
import { db } from "@/lib/firebase/config";
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { Target, Landmark, Edit2, Trash2, Calculator, CalendarClock } from "lucide-react";

interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentSaved: number;
  deadlineDate: string;
  contributionFrequency: string;
  type?: 'goal' | 'dps';
  interestRate?: number;
  installmentAmount?: number;
  startDate?: string;
  paymentDate?: number;
}

export default function SavingsPlanner() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal & UI States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [fundGoalId, setFundGoalId] = useState<string | null>(null);
  const [editingGoal, setEditingGoal] = useState<any>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form States
  const [newGoal, setNewGoal] = useState({ 
    name: "", targetAmount: "", currentSaved: "", deadlineDate: "", contributionFrequency: "Monthly", 
    type: "goal", interestRate: "", installmentAmount: "", startDate: "", paymentDate: "" 
  });
  const [fundAmount, setFundAmount] = useState("");
  const [fundAccount, setFundAccount] = useState("Bank"); 

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "goals"), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedGoals: Goal[] = [];
      snapshot.forEach((doc) => fetchedGoals.push({ id: doc.id, ...doc.data() } as Goal));
      setGoals(fetchedGoals);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // --- DPS MATHEMATICS ENGINE ---
  const calculateDPSMaturity = (monthly: number, rate: number, start: string, end: string) => {
    if (!monthly || !start || !end) return { principal: 0, maturity: 0, months: 0 };
    const d1 = new Date(start);
    const d2 = new Date(end);
    let months = (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
    if (months <= 0) months = 1;
    
    const principal = monthly * months;
    const r = (rate / 100) / 12;
    // Compound interest formula for regular monthly deposits
    const maturity = r === 0 ? principal : monthly * ((Math.pow(1 + r, months) - 1) / r) * (1 + r);
    
    return { principal, maturity: Math.round(maturity), months };
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      let finalTarget = Number(newGoal.targetAmount);
      
      // Auto-calculate maturity target for DPS if not overridden
      if (newGoal.type === 'dps') {
        const { maturity } = calculateDPSMaturity(
          Number(newGoal.installmentAmount), Number(newGoal.interestRate), newGoal.startDate, newGoal.deadlineDate
        );
        finalTarget = maturity;
      }

      await addDoc(collection(db, "goals"), {
        name: newGoal.name,
        targetAmount: finalTarget,
        currentSaved: Number(newGoal.currentSaved) || 0,
        deadlineDate: newGoal.deadlineDate,
        contributionFrequency: newGoal.type === 'dps' ? 'Monthly' : newGoal.contributionFrequency,
        type: newGoal.type,
        interestRate: newGoal.type === 'dps' ? Number(newGoal.interestRate) : 0,
        installmentAmount: newGoal.type === 'dps' ? Number(newGoal.installmentAmount) : 0,
        startDate: newGoal.type === 'dps' ? newGoal.startDate : new Date().toISOString(),
        paymentDate: newGoal.type === 'dps' ? Number(newGoal.paymentDate) : null,
        userId: user.uid,
      });

      setIsCreateOpen(false);
      setNewGoal({ name: "", targetAmount: "", currentSaved: "", deadlineDate: "", contributionFrequency: "Monthly", type: "goal", interestRate: "", installmentAmount: "", startDate: "", paymentDate: "" });
      setToastMessage("Account created successfully!");
    } catch (error) { console.error("Error creating goal:", error); }
  };

  const handleAddFunds = async (e: React.FormEvent) => {
    e.preventDefault();
    const goalToUpdate = goals.find(g => g.id === fundGoalId);
    if (!goalToUpdate || !fundGoalId || !user) return;

    const amountToAdd = Number(fundAmount);

    try {
      const goalRef = doc(db, "goals", fundGoalId);
      await updateDoc(goalRef, {
        currentSaved: goalToUpdate.currentSaved + amountToAdd
      });

      // Synchronize with Main Ledger to impact monthly expenses
      await addDoc(collection(db, "transactions"), {
        userId: user.uid,
        amount: amountToAdd,
        type: "expense",
        category: goalToUpdate.type === 'dps' ? `DPS Installment: ${goalToUpdate.name}` : `Savings: ${goalToUpdate.name}`,
        account: fundAccount,
        date: new Date().toISOString(),
        description: goalToUpdate.type === 'dps' ? `Monthly DPS deposit` : `Deposited into ${goalToUpdate.name} goal`
      });

      setToastMessage(`Added ৳ ${amountToAdd.toLocaleString('en-IN')} to ${goalToUpdate.name} 🚀`);
      setFundGoalId(null);
      setFundAmount("");
    } catch (error) { console.error("Error adding funds:", error); }
  };

  const handleUpdateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGoal || !editingGoal.id) return;
    try {
      let finalTarget = Number(editingGoal.targetAmount);
      if (editingGoal.type === 'dps') {
        const { maturity } = calculateDPSMaturity(
          Number(editingGoal.installmentAmount), Number(editingGoal.interestRate), editingGoal.startDate, editingGoal.deadlineDate
        );
        finalTarget = maturity;
      }

      const goalRef = doc(db, "goals", editingGoal.id);
      await updateDoc(goalRef, {
        name: editingGoal.name,
        targetAmount: finalTarget,
        currentSaved: Number(editingGoal.currentSaved),
        deadlineDate: editingGoal.deadlineDate,
        contributionFrequency: editingGoal.contributionFrequency,
        type: editingGoal.type,
        interestRate: editingGoal.type === 'dps' ? Number(editingGoal.interestRate) : 0,
        installmentAmount: editingGoal.type === 'dps' ? Number(editingGoal.installmentAmount) : 0,
        startDate: editingGoal.type === 'dps' ? editingGoal.startDate : new Date().toISOString(),
        paymentDate: editingGoal.type === 'dps' ? Number(editingGoal.paymentDate) : null,
      });
      setEditingGoal(null);
      setToastMessage("Details updated!");
    } catch (error) { console.error("Error updating goal:", error); }
  };

  const handleDeleteGoal = async (id: string) => {
    if (!window.confirm("Delete this? This action cannot be undone.")) return;
    try {
      await deleteDoc(doc(db, "goals", id));
      setToastMessage("Account deleted.");
    } catch (error) { console.error("Error deleting goal:", error); }
  };

  if (loading) return <LoadingShield text="Syncing Vault..." />;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans pb-32">
      <div className="max-w-5xl mx-auto space-y-8 relative">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Savings & DPS</h1>
            <p className="text-gray-500 mt-1 font-medium">Track your goals and bank deposits in one place.</p>
          </div>
          <div className="flex gap-4 w-full md:w-auto">
            <Link href="/dashboard" className="px-6 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors text-center">
              Back
            </Link>
            <button onClick={() => setIsCreateOpen(true)} className="flex-1 md:flex-none px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-sm">
              + Add Account
            </button>
          </div>
        </div>

        {/* GOALS GRID */}
        {goals.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border-2 border-dashed border-gray-200 text-center">
            <p className="text-gray-500 font-medium">No savings or DPS accounts yet. Create one to start tracking!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {goals.map((goal) => {
              const isDPS = goal.type === 'dps';
              const progress = Math.min((goal.currentSaved / goal.targetAmount) * 100, 100);
              
              const { principal, months } = isDPS 
                ? calculateDPSMaturity(goal.installmentAmount || 0, goal.interestRate || 0, goal.startDate || "", goal.deadlineDate)
                : { principal: goal.targetAmount, months: 0 };
              
              const principalProgress = isDPS ? Math.min((goal.currentSaved / principal) * 100, 100) : progress;

              return (
                <div key={goal.id} className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between h-full group hover:shadow-md transition-all">
                  <div>
                    {/* Header with Edit/Delete */}
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                          {goal.name}
                        </h2>
                        
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          {isDPS ? (
                            <span className="flex items-center gap-1 bg-amber-50 text-amber-700 text-[10px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider border border-amber-100">
                              <Landmark className="w-3 h-3" /> {goal.interestRate}% DPS
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 bg-blue-50 text-blue-700 text-[10px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider border border-blue-100">
                              <Target className="w-3 h-3" /> Target Goal
                            </span>
                          )}
                          <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider">
                            Ends: {new Date(goal.deadlineDate).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                          </span>
                          {isDPS && goal.paymentDate && (
                            <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider">
                              Day {goal.paymentDate}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex gap-1">
                        <button onClick={() => setEditingGoal({ ...goal, type: goal.type || 'goal' })} className="p-2 text-gray-400 hover:text-blue-600 rounded-xl hover:bg-blue-50 transition-colors" title="Edit">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteGoal(goal.id)} className="p-2 text-gray-400 hover:text-red-600 rounded-xl hover:bg-red-50 transition-colors" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {isDPS ? (
                      <div className="grid grid-cols-2 gap-4 mt-6 mb-4 bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
                        <div>
                           <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Total Principal</p>
                           <p className="text-xl font-black text-gray-900 mt-0.5">৳ {principal.toLocaleString('en-IN')}</p>
                           <p className="text-xs text-gray-400 mt-1">{months} months @ ৳{goal.installmentAmount}</p>
                        </div>
                        <div>
                           <p className="text-[11px] font-bold text-amber-600 uppercase tracking-widest flex items-center gap-1"><Calculator className="w-3 h-3"/> Est. Maturity</p>
                           <p className="text-xl font-black text-amber-600 mt-0.5">৳ {goal.targetAmount.toLocaleString('en-IN')}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="mb-4 mt-6">
                        <p className="text-4xl font-black text-gray-900">৳ {goal.targetAmount.toLocaleString('en-IN')}</p>
                        <p className="text-sm text-gray-500 font-medium mt-1">Goal Target</p>
                      </div>
                    )}

                    <div className="w-full bg-gray-100 rounded-full h-3 mt-6 overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-1000 ease-out ${isDPS ? 'bg-amber-500' : 'bg-blue-600'}`} style={{ width: `${principalProgress}%` }}></div>
                    </div>
                    <div className="flex justify-between items-center mt-2 mb-6">
                      <p className="text-sm font-bold text-gray-700">৳ {goal.currentSaved.toLocaleString('en-IN')} deposited</p>
                      <p className="text-sm text-gray-400 font-bold">{Math.round(principalProgress)}% Paid</p>
                    </div>
                  </div>

                  <button 
                    onClick={() => {
                      setFundGoalId(goal.id);
                      setFundAmount(isDPS ? goal.installmentAmount?.toString() || "" : "");
                    }}
                    disabled={principalProgress >= 100}
                    className={`w-full py-4 rounded-xl font-bold transition-colors ${principalProgress >= 100 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-900 text-white hover:bg-gray-800 shadow-md active:scale-95'}`}
                  >
                    {principalProgress >= 100 ? 'Fully Funded' : isDPS ? 'Pay Installment' : 'Add Funds'}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* --- CREATE MODAL --- */}
        {isCreateOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]">
              <h2 className="text-2xl font-bold mb-6 text-gray-900">Add Account</h2>
              <form onSubmit={handleCreateGoal} className="space-y-5">
                
                <div className="flex gap-3 mb-2 p-1 bg-gray-100 rounded-2xl">
                  <button type="button" onClick={() => setNewGoal({...newGoal, type: 'goal'})} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all text-sm ${newGoal.type === 'goal' ? 'bg-white shadow-sm text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}>
                    <Target className="w-4 h-4" /> Custom Goal
                  </button>
                  <button type="button" onClick={() => setNewGoal({...newGoal, type: 'dps'})} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all text-sm ${newGoal.type === 'dps' ? 'bg-white shadow-sm text-amber-700' : 'text-gray-500 hover:text-gray-700'}`}>
                    <Landmark className="w-4 h-4" /> Bank DPS
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">{newGoal.type === 'dps' ? 'DPS Account Name' : 'Goal Name'}</label>
                  <input type="text" required value={newGoal.name} onChange={e => setNewGoal({...newGoal, name: e.target.value})} className="w-full rounded-xl border bg-gray-50 px-4 py-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder={newGoal.type === 'dps' ? "e.g., City Bank DPS" : "e.g., PC Setup"} />
                </div>
                
                {newGoal.type === 'dps' ? (
                  <>
                    <div className="grid grid-cols-2 gap-4 animate-in fade-in zoom-in duration-200">
                      <div>
                        <label className="block text-[11px] uppercase tracking-wider font-bold text-gray-500 mb-2">Monthly Installment (৳)</label>
                        <input type="number" required value={newGoal.installmentAmount} onChange={e => setNewGoal({...newGoal, installmentAmount: e.target.value})} className="w-full rounded-xl border bg-gray-50 px-4 py-3 outline-none focus:border-blue-500 font-bold" placeholder="1000" />
                      </div>
                      <div>
                        <label className="block text-[11px] uppercase tracking-wider font-bold text-gray-500 mb-2">Already Deposited (৳)</label>
                        <input type="number" value={newGoal.currentSaved} onChange={e => setNewGoal({...newGoal, currentSaved: e.target.value})} className="w-full rounded-xl border bg-gray-50 px-4 py-3 outline-none focus:border-blue-500 font-bold" placeholder="e.g. 5000" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 animate-in fade-in zoom-in duration-200">
                      <div>
                        <label className="block text-[11px] uppercase tracking-wider font-bold text-amber-600 mb-2">Interest Rate (%)</label>
                        <input type="number" step="any" required value={newGoal.interestRate} onChange={e => setNewGoal({...newGoal, interestRate: e.target.value})} className="w-full rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 outline-none focus:border-amber-500 text-amber-900 font-bold" placeholder="9.0" />
                      </div>
                      <div>
                        <label className="block text-[11px] uppercase tracking-wider font-bold text-gray-500 mb-2">Payment Date (1-31)</label>
                        <input type="number" min="1" max="31" required value={newGoal.paymentDate} onChange={e => setNewGoal({...newGoal, paymentDate: e.target.value})} className="w-full rounded-xl border bg-gray-50 px-4 py-3 outline-none focus:border-blue-500 font-bold" placeholder="e.g. 22" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 animate-in fade-in zoom-in duration-200">
                      <div>
                        <label className="block text-[11px] uppercase tracking-wider font-bold text-gray-500 mb-2">Start Date</label>
                        <input type="date" required value={newGoal.startDate} onChange={e => setNewGoal({...newGoal, startDate: e.target.value})} className="w-full rounded-xl border bg-gray-50 px-4 py-3 outline-none focus:border-blue-500" />
                      </div>
                      <div>
                        <label className="block text-[11px] uppercase tracking-wider font-bold text-gray-500 mb-2">Maturity Date</label>
                        <input type="date" required value={newGoal.deadlineDate} onChange={e => setNewGoal({...newGoal, deadlineDate: e.target.value})} className="w-full rounded-xl border bg-gray-50 px-4 py-3 outline-none focus:border-blue-500" />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4 animate-in fade-in zoom-in duration-200">
                      <div>
                        <label className="block text-[11px] uppercase tracking-wider font-bold text-gray-500 mb-2">Target Amount (৳)</label>
                        <input type="number" required value={newGoal.targetAmount} onChange={e => setNewGoal({...newGoal, targetAmount: e.target.value})} className="w-full rounded-xl border bg-gray-50 px-4 py-3 outline-none focus:border-blue-500 font-bold" placeholder="0" />
                      </div>
                      <div>
                        <label className="block text-[11px] uppercase tracking-wider font-bold text-gray-500 mb-2">Already Saved (৳)</label>
                        <input type="number" value={newGoal.currentSaved} onChange={e => setNewGoal({...newGoal, currentSaved: e.target.value})} className="w-full rounded-xl border bg-gray-50 px-4 py-3 outline-none focus:border-blue-500 font-bold" placeholder="0" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 animate-in fade-in zoom-in duration-200">
                      <div>
                        <label className="block text-[11px] uppercase tracking-wider font-bold text-gray-500 mb-2">Deadline</label>
                        <input type="date" required value={newGoal.deadlineDate} onChange={e => setNewGoal({...newGoal, deadlineDate: e.target.value})} className="w-full rounded-xl border bg-gray-50 px-4 py-3 outline-none focus:border-blue-500" />
                      </div>
                      <div>
                        <label className="block text-[11px] uppercase tracking-wider font-bold text-gray-500 mb-2">Save By</label>
                        <select value={newGoal.contributionFrequency} onChange={e => setNewGoal({...newGoal, contributionFrequency: e.target.value})} className="w-full rounded-xl border bg-gray-50 px-4 py-3 outline-none focus:border-blue-500">
                          <option value="Daily">Daily</option>
                          <option value="Weekly">Weekly</option>
                          <option value="Monthly">Monthly</option>
                        </select>
                      </div>
                    </div>
                  </>
                )}

                <div className="flex gap-4 mt-8">
                  <button type="button" onClick={() => setIsCreateOpen(false)} className="flex-1 py-4 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors">Cancel</button>
                  <button type="submit" className={`flex-1 py-4 text-white rounded-xl font-bold transition-colors shadow-md ${newGoal.type === 'dps' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'}`}>Create</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* --- EDIT MODAL --- */}
        {editingGoal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]">
              <h2 className="text-2xl font-bold mb-6 text-gray-900">Edit Details</h2>
              <form onSubmit={handleUpdateGoal} className="space-y-5">
                
                <div className="flex gap-3 mb-2 p-1 bg-gray-100 rounded-2xl">
                  <button type="button" onClick={() => setEditingGoal({...editingGoal, type: 'goal'})} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all text-sm ${editingGoal.type === 'goal' ? 'bg-white shadow-sm text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}>
                    <Target className="w-4 h-4" /> Goal
                  </button>
                  <button type="button" onClick={() => setEditingGoal({...editingGoal, type: 'dps'})} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all text-sm ${editingGoal.type === 'dps' ? 'bg-white shadow-sm text-amber-700' : 'text-gray-500 hover:text-gray-700'}`}>
                    <Landmark className="w-4 h-4" /> Bank DPS
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Name</label>
                  <input type="text" required value={editingGoal.name} onChange={e => setEditingGoal({...editingGoal, name: e.target.value})} className="w-full rounded-xl border bg-gray-50 px-4 py-3 outline-none focus:border-blue-500" />
                </div>
                
                {editingGoal.type === 'dps' ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] uppercase tracking-wider font-bold text-gray-500 mb-2">Monthly Installment (৳)</label>
                        <input type="number" required value={editingGoal.installmentAmount || ""} onChange={e => setEditingGoal({...editingGoal, installmentAmount: e.target.value})} className="w-full rounded-xl border bg-gray-50 px-4 py-3 outline-none focus:border-blue-500 font-bold" />
                      </div>
                      <div>
                        <label className="block text-[11px] uppercase tracking-wider font-bold text-gray-500 mb-2">Total Deposited (৳)</label>
                        <input type="number" value={editingGoal.currentSaved || ""} onChange={e => setEditingGoal({...editingGoal, currentSaved: e.target.value})} className="w-full rounded-xl border bg-gray-50 px-4 py-3 outline-none focus:border-blue-500 font-bold" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] uppercase tracking-wider font-bold text-amber-600 mb-2">Interest Rate (%)</label>
                        <input type="number" step="any" required value={editingGoal.interestRate || ""} onChange={e => setEditingGoal({...editingGoal, interestRate: e.target.value})} className="w-full rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 outline-none focus:border-amber-500 text-amber-900 font-bold" />
                      </div>
                      <div>
                        <label className="block text-[11px] uppercase tracking-wider font-bold text-gray-500 mb-2">Payment Date (1-31)</label>
                        <input type="number" min="1" max="31" required value={editingGoal.paymentDate || ""} onChange={e => setEditingGoal({...editingGoal, paymentDate: e.target.value})} className="w-full rounded-xl border bg-gray-50 px-4 py-3 outline-none focus:border-blue-500 font-bold" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] uppercase tracking-wider font-bold text-gray-500 mb-2">Start Date</label>
                        <input type="date" required value={editingGoal.startDate || ""} onChange={e => setEditingGoal({...editingGoal, startDate: e.target.value})} className="w-full rounded-xl border bg-gray-50 px-4 py-3 outline-none focus:border-blue-500" />
                      </div>
                      <div>
                        <label className="block text-[11px] uppercase tracking-wider font-bold text-gray-500 mb-2">Maturity Date</label>
                        <input type="date" required value={editingGoal.deadlineDate || ""} onChange={e => setEditingGoal({...editingGoal, deadlineDate: e.target.value})} className="w-full rounded-xl border bg-gray-50 px-4 py-3 outline-none focus:border-blue-500" />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] uppercase tracking-wider font-bold text-gray-500 mb-2">Target Amount (৳)</label>
                        <input type="number" required value={editingGoal.targetAmount} onChange={e => setEditingGoal({...editingGoal, targetAmount: e.target.value})} className="w-full rounded-xl border bg-gray-50 px-4 py-3 outline-none focus:border-blue-500 font-bold" />
                      </div>
                      <div>
                        <label className="block text-[11px] uppercase tracking-wider font-bold text-gray-500 mb-2">Already Saved (৳)</label>
                        <input type="number" value={editingGoal.currentSaved} onChange={e => setEditingGoal({...editingGoal, currentSaved: e.target.value})} className="w-full rounded-xl border bg-gray-50 px-4 py-3 outline-none focus:border-blue-500 font-bold" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] uppercase tracking-wider font-bold text-gray-500 mb-2">Deadline</label>
                        <input type="date" required value={editingGoal.deadlineDate} onChange={e => setEditingGoal({...editingGoal, deadlineDate: e.target.value})} className="w-full rounded-xl border bg-gray-50 px-4 py-3 outline-none focus:border-blue-500" />
                      </div>
                      <div>
                        <label className="block text-[11px] uppercase tracking-wider font-bold text-gray-500 mb-2">Save By</label>
                        <select value={editingGoal.contributionFrequency} onChange={e => setEditingGoal({...editingGoal, contributionFrequency: e.target.value})} className="w-full rounded-xl border bg-gray-50 px-4 py-3 outline-none focus:border-blue-500">
                          <option value="Daily">Daily</option>
                          <option value="Weekly">Weekly</option>
                          <option value="Monthly">Monthly</option>
                        </select>
                      </div>
                    </div>
                  </>
                )}

                <div className="flex gap-4 mt-8">
                  <button type="button" onClick={() => setEditingGoal(null)} className="flex-1 py-4 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors">Cancel</button>
                  <button type="submit" className="flex-1 py-4 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-colors shadow-md">Save Changes</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* --- ADD FUNDS MODAL --- */}
        {fundGoalId && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl">
              <h2 className="text-2xl font-bold mb-6 text-gray-900 flex items-center gap-2">
                {goals.find(g => g.id === fundGoalId)?.type === 'dps' ? <><Landmark className="w-6 h-6 text-amber-600"/> Pay Installment</> : <><Target className="w-6 h-6 text-blue-600"/> Add Funds</>}
              </h2>
              <form onSubmit={handleAddFunds} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Amount (৳)</label>
                  <input type="number" required value={fundAmount} onChange={e => setFundAmount(e.target.value)} className="w-full rounded-xl border bg-gray-50 px-4 py-3 outline-none focus:border-green-500 text-xl font-bold" placeholder="0" />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Deduct from Account</label>
                  <select value={fundAccount} onChange={e => setFundAccount(e.target.value)} className="w-full rounded-xl border bg-gray-50 px-4 py-3 outline-none focus:border-blue-500 text-gray-700 font-medium">
                    <option value="Bank">Bank</option>
                    <option value="Cash">Cash</option>
                    <option value="bKash">bKash</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-2">This money will be deducted from your available <b>{fundAccount}</b> balance and logged to the main ledger.</p>
                </div>

                <div className="flex gap-4 mt-8">
                  <button type="button" onClick={() => setFundGoalId(null)} className="flex-1 py-4 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors">Cancel</button>
                  <button type="submit" className="flex-1 py-4 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-colors shadow-md active:scale-95">Confirm</button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}