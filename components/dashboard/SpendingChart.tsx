"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Transaction } from "@/types"; // <-- THE FIX: Import your official global type!

// Define the colors for our categories
const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#64748b"];

// Notice we deleted the local 'interface Transaction' block here.

export default function SpendingChart({ transactions }: { transactions: Transaction[] }) {
  
  const expenseData = transactions
    .filter((t) => t.type === "expense")
    .reduce((acc: any[], curr) => {
      const existingCategory = acc.find((item) => item.name === curr.category);
      if (existingCategory) {
        existingCategory.value += Number(curr.amount); // Added Number() to be extra safe with TS
      } else {
        acc.push({ name: curr.category, value: Number(curr.amount) });
      }
      return acc;
    }, [])
    .sort((a, b) => b.value - a.value); 

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-100 shadow-xl rounded-xl">
          <p className="font-bold text-gray-900">{payload[0].name}</p>
          <p className="text-blue-600 font-medium">৳ {payload[0].value.toLocaleString()}</p>
        </div>
      );
    }
    return null;
  };

  if (expenseData.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
        <span className="text-2xl mb-2">📊</span>
        <p className="font-medium">No expenses to chart yet!</p>
      </div>
    );
  }

  return (
    <div className="h-72 w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={expenseData}
            cx="50%"
            cy="50%"
            innerRadius={60} 
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
            animationBegin={0}
            animationDuration={800}
          >
            {expenseData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            verticalAlign="bottom" 
            height={36} 
            iconType="circle"
            formatter={(value) => <span className="text-gray-700 font-medium">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}