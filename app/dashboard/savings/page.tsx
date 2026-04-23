"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthContext";
import { db } from "@/lib/firebase/config";
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";

interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentSaved: number;
  deadlineDate: string;
  contributionFrequency: string;
}

export default function SavingsPlanner() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [fundGoalId, setFundGoalId] = useState<string | null>(null);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  // Form States
  const [newGoal, setNewGoal] = useState({ name: "", targetAmount: "", deadlineDate: "", contributionFrequency: "Monthly" });
  const [fundAmount, setFundAmount] = useState("");

  // --- REAL-TIME FIREBASE CONNECTION ---
  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, "goals"), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedGoals: Goal[] = [];
      snapshot.forEach((doc) => fetchedGoals.push({ id: doc.id, ...doc.data() } as Goal));
      setGoals(fetchedGoals);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching goals:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // --- THE MATH BRAIN ---
  const calculateRequiredContribution = (target: number, current: number, deadline: string, freq: string) => {
    const remaining = target - current;
    if (remaining <= 0) return 0;

    const today = new Date();
    const targetDate = new Date(deadline);
    const diffTime = targetDate.getTime() - today.getTime();
    const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (daysLeft <= 0) return remaining;

    if (freq === "Daily") return remaining / daysLeft;
    if (freq === "Weekly") return remaining / (daysLeft / 7);
    if (freq === "Monthly") return remaining / (daysLeft / 30.44);
    
    return remaining;
  };

  // --- CRUD HANDLERS ---
  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      await addDoc(collection(db, "goals"), {
        ...newGoal,
        targetAmount: Number(newGoal.targetAmount),
        currentSaved: 0,
        userId: user.uid,
      });
      setIsCreateOpen(false);
      setNewGoal({ name: "", targetAmount: "", deadlineDate: "", contributionFrequency: "Monthly" });
    } catch (error) {
      console.error("Error creating goal:", error);
    }
  };

  const handleAddFunds = async (e: React.FormEvent) => {
    e.preventDefault();
    const goalToUpdate = goals.find(g => g.id === fundGoalId);
    if (!goalToUpdate || !fundGoalId) return;

    try {
      const goalRef = doc(db, "goals", fundGoalId);
      await updateDoc(goalRef, {
        currentSaved: goalToUpdate.currentSaved + Number(fundAmount)
      });
      setFundGoalId(null);
      setFundAmount("");
    } catch (error) {
      console.error("Error adding funds:", error);
    }
  };

  const handleUpdateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGoal || !editingGoal.id) return;

    try {
      const goalRef = doc(db, "goals", editingGoal.id);
      await updateDoc(goalRef, {
        name: editingGoal.name,
        targetAmount: Number(editingGoal.targetAmount),
        currentSaved: Number(editingGoal.currentSaved),
        deadlineDate: editingGoal.deadlineDate,
        contributionFrequency: editingGoal.contributionFrequency,
      });
      setEditingGoal(null);
    } catch (error) {
      console.error("Error updating goal:", error);
    }
  };

  const handleDeleteGoal = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this goal? This action cannot be undone.")) return;
    try {
      await deleteDoc(doc(db, "goals", id));
    } catch (error) {
      console.error("Error deleting goal:", error);
    }
  };

  if (loading) return <div className="p-8 animate-pulse text-gray-500">Loading your future...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Savings Planner</h1>
            <p className="text-gray-500 mt-1 font-medium">Track your goals and automate your future.</p>
          </div>
          <div className="flex gap-4 w-full md:w-auto">
            <Link href="/dashboard" className="px-6 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors text-center">
              Back
            </Link>
            <button onClick={() => setIsCreateOpen(true)} className="flex-1 md:flex-none px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-sm">
              + Create Goal
            </button>
          </div>
        </div>

        {/* GOALS GRID */}
        {goals.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border-2 border-dashed border-gray-200 text-center">
            <p className="text-gray-500 font-medium">No savings goals yet. Create one to start tracking!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {goals.map((goal) => {
              const progress = Math.min((goal.currentSaved / goal.targetAmount) * 100, 100);
              const requiredSave = calculateRequiredContribution(goal.targetAmount, goal.currentSaved, goal.deadlineDate, goal.contributionFrequency);

              return (
                <div key={goal.id} className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between h-full group hover:shadow-md transition-all">
                  <div>
                    {/* Header with Edit/Delete */}
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">{goal.name}</h2>
                        <span className="inline-block mt-2 bg-gray-100 text-gray-600 text-xs font-bold px-3 py-1 rounded-full">
                          Target: {new Date(goal.deadlineDate).toLocaleDateString('en-GB')}
                        </span>
                      </div>
                      <div className="flex gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setEditingGoal(goal)} className="p-2 text-gray-400 hover:text-blue-600 rounded-full hover:bg-blue-50 transition-colors" title="Edit Goal">
                          ✎
                        </button>
                        <button onClick={() => handleDeleteGoal(goal.id)} className="p-2 text-gray-400 hover:text-red-600 rounded-full hover:bg-red-50 transition-colors" title="Delete Goal">
                          🗑
                        </button>
                      </div>
                    </div>

                    <div className="mb-4">
                      <p className="text-4xl font-black text-gray-900">৳ {goal.currentSaved.toLocaleString('en-IN')}</p>
                      <p className="text-sm text-gray-500 font-medium mt-1">saved of ৳ {goal.targetAmount.toLocaleString('en-IN')}</p>
                    </div>

                    <div className="w-full bg-gray-100 rounded-full h-4 mb-2 mt-6 overflow-hidden">
                      <div className="bg-blue-600 h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${progress}%` }}></div>
                    </div>
                    <p className="text-right text-sm text-gray-400 font-bold mb-6">{Math.round(progress)}% Complete</p>
                    
                    <div className={`p-5 rounded-2xl border mb-6 ${progress >= 100 ? 'bg-green-50 border-green-100' : 'bg-blue-50/50 border-blue-100'}`}>
                      <p className="text-sm font-medium text-gray-700">
                        {progress >= 100 ? (
                          <span className="text-green-600 font-bold text-base flex items-center gap-2">🎉 Target Reached!</span>
                        ) : (
                          <>Action Plan: <span className="text-blue-600 font-bold block text-lg mt-1">Save ৳ {Math.ceil(requiredSave).toLocaleString('en-IN')} / {goal.contributionFrequency.toLowerCase()}</span></>
                        )}
                      </p>
                    </div>
                  </div>

                  <button 
                    onClick={() => setFundGoalId(goal.id)}
                    disabled={progress >= 100}
                    className={`w-full py-4 rounded-xl font-bold transition-colors ${progress >= 100 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-900 text-white hover:bg-gray-800 shadow-md'}`}
                  >
                    {progress >= 100 ? 'Fully Funded' : 'Add Funds'}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* --- CREATE MODAL --- */}
        {isCreateOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
              <h2 className="text-2xl font-bold mb-6 text-gray-900">Create Goal</h2>
              <form onSubmit={handleCreateGoal} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Goal Name</label>
                  <input type="text" required value={newGoal.name} onChange={e => setNewGoal({...newGoal, name: e.target.value})} className="w-full rounded-xl border bg-gray-50 px-4 py-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="e.g., PC Setup" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Target Amount (৳)</label>
                  <input type="number" required value={newGoal.targetAmount} onChange={e => setNewGoal({...newGoal, targetAmount: e.target.value})} className="w-full rounded-xl border bg-gray-50 px-4 py-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="0" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Deadline</label>
                    <input type="date" required value={newGoal.deadlineDate} onChange={e => setNewGoal({...newGoal, deadlineDate: e.target.value})} className="w-full rounded-xl border bg-gray-50 px-4 py-3 outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Save By</label>
                    <select value={newGoal.contributionFrequency} onChange={e => setNewGoal({...newGoal, contributionFrequency: e.target.value})} className="w-full rounded-xl border bg-gray-50 px-4 py-3 outline-none focus:border-blue-500">
                      <option value="Daily">Daily</option>
                      <option value="Weekly">Weekly</option>
                      <option value="Monthly">Monthly</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-4 mt-8">
                  <button type="button" onClick={() => setIsCreateOpen(false)} className="flex-1 py-4 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors">Cancel</button>
                  <button type="submit" className="flex-1 py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors">Create</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* --- EDIT MODAL --- */}
        {editingGoal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
              <h2 className="text-2xl font-bold mb-6 text-gray-900">Edit Goal</h2>
              <form onSubmit={handleUpdateGoal} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Goal Name</label>
                  <input type="text" required value={editingGoal.name} onChange={e => setEditingGoal({...editingGoal, name: e.target.value})} className="w-full rounded-xl border bg-gray-50 px-4 py-3 outline-none focus:border-blue-500" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Target (৳)</label>
                    <input type="number" required value={editingGoal.targetAmount} onChange={e => setEditingGoal({...editingGoal, targetAmount: Number(e.target.value)})} className="w-full rounded-xl border bg-gray-50 px-4 py-3 outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Current (৳)</label>
                    <input type="number" required value={editingGoal.currentSaved} onChange={e => setEditingGoal({...editingGoal, currentSaved: Number(e.target.value)})} className="w-full rounded-xl border bg-gray-50 px-4 py-3 outline-none focus:border-blue-500" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Deadline</label>
                    <input type="date" required value={editingGoal.deadlineDate} onChange={e => setEditingGoal({...editingGoal, deadlineDate: e.target.value})} className="w-full rounded-xl border bg-gray-50 px-4 py-3 outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Save By</label>
                    <select value={editingGoal.contributionFrequency} onChange={e => setEditingGoal({...editingGoal, contributionFrequency: e.target.value})} className="w-full rounded-xl border bg-gray-50 px-4 py-3 outline-none focus:border-blue-500">
                      <option value="Daily">Daily</option>
                      <option value="Weekly">Weekly</option>
                      <option value="Monthly">Monthly</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-4 mt-8">
                  <button type="button" onClick={() => setEditingGoal(null)} className="flex-1 py-4 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors">Cancel</button>
                  <button type="submit" className="flex-1 py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors">Save</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* --- ADD FUNDS MODAL --- */}
        {fundGoalId && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl">
              <h2 className="text-2xl font-bold mb-6 text-gray-900">Add Funds</h2>
              <form onSubmit={handleAddFunds} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Amount (৳)</label>
                  <input type="number" required value={fundAmount} onChange={e => setFundAmount(e.target.value)} className="w-full rounded-xl border bg-gray-50 px-4 py-3 outline-none focus:border-green-500 text-xl font-bold" placeholder="0" />
                </div>
                <div className="flex gap-4 mt-8">
                  <button type="button" onClick={() => setFundGoalId(null)} className="flex-1 py-4 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors">Cancel</button>
                  <button type="submit" className="flex-1 py-4 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-colors">Add</button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}