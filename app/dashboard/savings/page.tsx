"use client";

import { useState } from "react";
import Link from "next/link";

// Dummy data to start with
const initialGoals = [
  {
    id: "1",
    name: "New PC Setup",
    targetAmount: 100000,
    currentSaved: 45000,
    deadlineDate: "2026-12-31", // Using standard YYYY-MM-DD for math
    contributionFrequency: "Monthly",
  }
];

export default function SavingsPlanner() {
  const [goals, setGoals] = useState(initialGoals);
  
  // Modal States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [fundGoalId, setFundGoalId] = useState<string | null>(null);

  // Form States
  const [newGoal, setNewGoal] = useState({ name: "", targetAmount: 0, deadlineDate: "", contributionFrequency: "Monthly" });
  const [fundAmount, setFundAmount] = useState(0);

  // --- THE MATH BRAIN ---
  const calculateRequiredContribution = (target: number, current: number, deadline: string, freq: string) => {
    const remaining = target - current;
    if (remaining <= 0) return 0;

    const today = new Date();
    const targetDate = new Date(deadline);
    
    // Calculate days left
    const diffTime = targetDate.getTime() - today.getTime();
    const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (daysLeft <= 0) return remaining; // If deadline passed, you need it all now!

    // Calculate based on preference
    if (freq === "Daily") return remaining / daysLeft;
    if (freq === "Weekly") return remaining / (daysLeft / 7);
    if (freq === "Monthly") return remaining / (daysLeft / 30.44); // Average days in month
    
    return remaining;
  };

  // --- HANDLERS ---
  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const goal = {
      id: Math.random().toString(),
      ...newGoal,
      currentSaved: 0, // Starts at 0
    };
    setGoals([...goals, goal]);
    setIsCreateOpen(false);
    setNewGoal({ name: "", targetAmount: 0, deadlineDate: "", contributionFrequency: "Monthly" });
  };

  const handleAddFunds = (e: React.FormEvent) => {
    e.preventDefault();
    setGoals(goals.map(g => {
      if (g.id === fundGoalId) {
        return { ...g, currentSaved: g.currentSaved + Number(fundAmount) };
      }
      return g;
    }));
    setFundGoalId(null);
    setFundAmount(0);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* HEADER */}
        <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Savings Planner</h1>
            <p className="text-gray-500 text-sm mt-1">Track your goals and automate your future.</p>
          </div>
          <Link href="/dashboard" className="text-gray-400 hover:text-gray-900 font-medium transition-colors">
            &larr; Back
          </Link>
        </div>

        {/* ACTION BAR */}
        <div className="flex justify-end">
          <button 
            onClick={() => setIsCreateOpen(true)}
            className="bg-gray-900 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-gray-800 transition-colors shadow-sm"
          >
            + Create Goal
          </button>
        </div>

        {/* GOALS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {goals.map((goal) => {
            const progress = Math.min((goal.currentSaved / goal.targetAmount) * 100, 100);
            const requiredSave = calculateRequiredContribution(goal.targetAmount, goal.currentSaved, goal.deadlineDate, goal.contributionFrequency);

            return (
              <div key={goal.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-full hover:shadow-md transition-shadow">
                <div>
                  <div className="flex justify-between items-start mb-6">
                    <h2 className="text-lg font-bold text-gray-900">{goal.name}</h2>
                    <span className="bg-gray-100 text-gray-600 text-xs font-bold px-3 py-1 rounded-full">
                      Target: {new Date(goal.deadlineDate).toLocaleDateString('en-GB')}
                    </span>
                  </div>

                  <div className="mb-2">
                    <p className="text-3xl font-bold text-gray-900">৳ {goal.currentSaved.toLocaleString('en-IN')}</p>
                    <p className="text-sm text-gray-500 font-medium mt-1">saved of ৳ {goal.targetAmount.toLocaleString('en-IN')}</p>
                  </div>

                  <div className="w-full bg-gray-100 rounded-full h-3 mb-2 mt-5">
                    <div className="bg-gray-900 h-3 rounded-full transition-all duration-1000 ease-out" style={{ width: `${progress}%` }}></div>
                  </div>
                  <p className="text-right text-xs text-gray-400 font-bold mb-6">{Math.round(progress)}% Complete</p>
                  
                  <div className={`p-4 rounded-xl border mb-6 ${progress >= 100 ? 'bg-green-50 border-green-100' : 'bg-blue-50/50 border-blue-100'}`}>
                    <p className="text-sm font-medium text-gray-700">
                      {progress >= 100 ? (
                        <span className="text-green-600 font-bold">🎉 Goal Completed!</span>
                      ) : (
                        <>Action Plan: <span className="text-blue-600 font-bold">Save ৳ {Math.ceil(requiredSave).toLocaleString('en-IN')} / {goal.contributionFrequency}</span></>
                      )}
                    </p>
                  </div>
                </div>

                <button 
                  onClick={() => setFundGoalId(goal.id)}
                  disabled={progress >= 100}
                  className={`w-full border-2 py-3 rounded-xl font-bold transition-colors ${progress >= 100 ? 'border-gray-100 text-gray-300 bg-gray-50 cursor-not-allowed' : 'border-gray-100 text-gray-600 hover:border-gray-900 hover:text-gray-900'}`}
                >
                  {progress >= 100 ? 'Fully Funded' : 'Add Funds'}
                </button>
              </div>
            );
          })}
        </div>

        {/* --- CREATE GOAL MODAL --- */}
        {isCreateOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
              <h2 className="text-xl font-bold mb-4">Create Savings Goal</h2>
              <form onSubmit={handleCreateGoal} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Goal Name</label>
                  <input type="text" required value={newGoal.name} onChange={e => setNewGoal({...newGoal, name: e.target.value})} className="w-full rounded-lg border px-3 py-2" placeholder="e.g., Mac Mini" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Target Amount (৳)</label>
                  <input type="number" required value={newGoal.targetAmount || ""} onChange={e => setNewGoal({...newGoal, targetAmount: Number(e.target.value)})} className="w-full rounded-lg border px-3 py-2" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
                    <input type="date" required value={newGoal.deadlineDate} onChange={e => setNewGoal({...newGoal, deadlineDate: e.target.value})} className="w-full rounded-lg border px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Save By</label>
                    <select value={newGoal.contributionFrequency} onChange={e => setNewGoal({...newGoal, contributionFrequency: e.target.value})} className="w-full rounded-lg border px-3 py-2">
                      <option value="Daily">Daily</option>
                      <option value="Weekly">Weekly</option>
                      <option value="Monthly">Monthly</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button type="button" onClick={() => setIsCreateOpen(false)} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200">Cancel</button>
                  <button type="submit" className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800">Create</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* --- ADD FUNDS MODAL --- */}
        {fundGoalId && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
              <h2 className="text-xl font-bold mb-4">Add Funds to Goal</h2>
              <form onSubmit={handleAddFunds} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount (৳)</label>
                  <input type="number" required value={fundAmount || ""} onChange={e => setFundAmount(Number(e.target.value))} className="w-full rounded-lg border px-3 py-2" placeholder="0" />
                </div>
                <div className="flex gap-3 mt-6">
                  <button type="button" onClick={() => setFundGoalId(null)} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200">Cancel</button>
                  <button type="submit" className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700">Add to Savings</button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}