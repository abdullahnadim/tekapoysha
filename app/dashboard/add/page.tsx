"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth/AuthContext";
import { db } from "@/lib/firebase/config";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AddTransaction() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    type: "expense",
    amount: "",
    account: "Cash",
    category: "Food",
    description: "",
    date: new Date().toISOString().split("T")[0], // YYYY-MM-DD
  });

  const categories = {
    expense: ["Food", "Transport", "Bills", "Shopping", "Entertainment", "Other"],
    income: ["Salary", "Freelance", "Gift", "Investment", "Other"],
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    setError("");

    try {
      // 1. Reference the "transactions" collection in Firebase
      const transactionsRef = collection(db, "transactions");
      
      // 2. Add the document
      await addDoc(transactionsRef, {
        userId: user.uid,
        type: formData.type,
        amount: parseFloat(formData.amount),
        account: formData.account,
        category: formData.category,
        description: formData.description,
        date: Timestamp.fromDate(new Date(formData.date)),
        createdAt: Timestamp.now(),
      });

      // 3. Redirect back to dashboard on success
      router.push("/dashboard");
    } catch (err: any) {
      console.error("Error adding document: ", err);
      setError("Failed to save transaction. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Add Transaction</h2>
        <Link href="/dashboard" className="text-sm font-medium text-gray-500 hover:text-gray-900">
          Cancel
        </Link>
      </div>

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Type Selection (Income vs Expense) */}
        <div className="flex p-1 bg-gray-100 rounded-lg">
          <button
            type="button"
            onClick={() => setFormData({ ...formData, type: "expense", category: "Food" })}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              formData.type === "expense" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-900"
            }`}
          >
            Expense
          </button>
          <button
            type="button"
            onClick={() => setFormData({ ...formData, type: "income", category: "Salary" })}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              formData.type === "income" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-900"
            }`}
          >
            Income
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (৳)</label>
            <input
              type="number"
              required
              min="0"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none"
              placeholder="0.00"
            />
          </div>

          {/* Account */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Account</label>
            <select
              value={formData.account}
              onChange={(e) => setFormData({ ...formData, account: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none bg-white"
            >
              <option value="Cash">Cash</option>
              <option value="Bank">Bank</option>
              <option value="bKash">bKash</option>
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none bg-white"
            >
              {categories[formData.type as keyof typeof categories].map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              required
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
          <input
            type="text"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none"
            placeholder="e.g., Lunch at Kacchi Bhai"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-gray-900 px-4 py-3 text-white font-medium hover:bg-gray-800 transition-colors disabled:bg-gray-400"
        >
          {loading ? "Saving..." : "Save Transaction"}
        </button>
      </form>
    </div>
  );
}