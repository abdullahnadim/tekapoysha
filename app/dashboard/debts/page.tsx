"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth/AuthContext";
import { db } from "@/lib/firebase/config";
import { collection, addDoc, query, where, getDocs, Timestamp, updateDoc, doc } from "firebase/firestore";

interface Debt {
  id: string;
  type: "borrowed" | "lent";
  person: string;
  amount: number;
  status: "pending" | "cleared";
  dueDate: string;
}

export default function DebtsPage() {
  const { user } = useAuth();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    type: "lent",
    person: "",
    amount: "",
    dueDate: new Date().toISOString().split("T")[0],
  });

  // Fetch Debts from Firebase
  useEffect(() => {
    async function fetchDebts() {
      if (!user) return;
      try {
        const q = query(collection(db, "debts"), where("userId", "==", user.uid));
        const snapshot = await getDocs(q);
        const fetchedDebts = snapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        } as Debt));
        
        // Sort: Pending first, then by date (newest first)
        fetchedDebts.sort((a, b) => {
          if (a.status === b.status) {
            return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
          }
          return a.status === "pending" ? -1 : 1;
        });

        setDebts(fetchedDebts);
      } catch (error) {
        console.error("Error fetching debts:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchDebts();
  }, [user]);

  // Add New Debt
  const handleAddDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const debtData = {
        userId: user.uid,
        type: formData.type,
        person: formData.person,
        amount: parseFloat(formData.amount),
        dueDate: formData.dueDate,
        status: "pending",
        createdAt: Timestamp.now(),
      };

      const docRef = await addDoc(collection(db, "debts"), debtData);

      // Update local state to show new debt immediately
      setDebts([{ id: docRef.id, ...debtData } as any, ...debts]);
      setShowForm(false);
      setFormData({ type: "lent", person: "", amount: "", dueDate: new Date().toISOString().split("T")[0] });
    } catch (error) {
      console.error("Error adding debt: ", error);
      alert("Failed to save debt record.");
    }
  };

  // Mark as Cleared
  const handleClearDebt = async (id: string) => {
    try {
      await updateDoc(doc(db, "debts", id), { status: "cleared" });
      setDebts(debts.map(d => d.id === id ? { ...d, status: "cleared" } : d));
    } catch (error) {
      console.error("Error clearing debt: ", error);
    }
  };

  if (loading) return <div className="p-6 text-gray-500 animate-pulse">Loading debts...</div>;

  // Calculate totals for the summary cards
  const totalOwedToYou = debts
    .filter(d => d.type === "lent" && d.status === "pending")
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalYouOwe = debts
    .filter(d => d.type === "borrowed" && d.status === "pending")
    .reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Debt Control</h2>
          <p className="text-gray-600 mt-1">Track money you owe and money owed to you.</p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            showForm ? "bg-gray-200 text-gray-700" : "bg-gray-900 text-white hover:bg-gray-800"
          }`}
        >
          {showForm ? "Cancel" : "+ Add Record"}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-100">
          <h3 className="text-sm font-medium text-gray-500 mb-2">People Owe You (Receivable)</h3>
          <p className="text-3xl font-bold text-emerald-600">৳ {totalOwedToYou.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-rose-100">
          <h3 className="text-sm font-medium text-gray-500 mb-2">You Owe (Payable)</h3>
          <p className="text-3xl font-bold text-rose-600">৳ {totalYouOwe.toLocaleString('en-IN')}</p>
        </div>
      </div>

      {/* Add Debt Form */}
      {showForm && (
        <form onSubmit={handleAddDebt} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select 
                value={formData.type} 
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-1 focus:ring-gray-900 bg-white"
              >
                <option value="lent">I lent money (Receivable)</option>
                <option value="borrowed">I borrowed money (Payable)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Person Name</label>
              <input type="text" required value={formData.person} onChange={(e) => setFormData({ ...formData, person: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-1 focus:ring-gray-900" placeholder="e.g. Rahim" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount (৳)</label>
              <input type="number" required min="1" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-1 focus:ring-gray-900" placeholder="0.00" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <input type="date" required value={formData.dueDate} onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-1 focus:ring-gray-900" />
            </div>
          </div>
          <button type="submit" className="w-full md:w-auto bg-gray-900 text-white px-8 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors">
            Save Record
          </button>
        </form>
      )}

      {/* Debt List Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-sm font-semibold text-gray-600">Person</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600">Type</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600">Amount</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600">Due Date</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {debts.map((debt) => (
                <tr key={debt.id} className={`hover:bg-gray-50/50 transition-colors ${debt.status === 'cleared' ? 'opacity-60' : ''}`}>
                  <td className="px-6 py-4 text-sm text-gray-900 font-medium">{debt.person}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-2 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold ${
                      debt.type === 'lent' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                    }`}>
                      {debt.type === 'lent' ? 'Receivable' : 'Payable'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 font-bold">
                    ৳ {debt.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(debt.dueDate).toLocaleDateString('en-GB')}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {debt.status === "pending" ? (
                      <button 
                        onClick={() => handleClearDebt(debt.id)} 
                        className="text-indigo-600 hover:text-indigo-800 font-semibold text-xs border border-indigo-200 px-3 py-1 rounded-full hover:bg-indigo-50 transition-all"
                      >
                        Clear Debt
                      </button>
                    ) : (
                      <span className="text-emerald-600 font-bold text-xs flex items-center gap-1">
                        Settled ✓
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {debts.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400 text-sm italic">
                    No debt records found. Click "+ Add Record" to start.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}