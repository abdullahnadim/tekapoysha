'use client';

import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Transaction } from '@/types';

interface ExpenseDonutProps {
  transactions: Transaction[];
}

// Premium color palette for financial categories
const COLORS = ['#2563eb', '#16a34a', '#dc2626', '#ca8a04', '#9333ea', '#0891b2', '#ea580c', '#475569'];

export default function ExpenseDonut({ transactions }: ExpenseDonutProps) {
  
  // Filter expenses and group by category
  const data = useMemo(() => {
    const expenses = transactions.filter(t => t.type === 'expense');
    
    const grouped = expenses.reduce((acc, curr) => {
      const cat = curr.category || 'Other';
      if (!acc[cat]) acc[cat] = 0;
      acc[cat] += Number(curr.amount);
      return acc;
    }, {} as Record<string, number>);

    // Convert to array and sort largest to smallest
    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', minimumFractionDigits: 0 }).format(value);
  };

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-400 font-medium text-sm">
        No expense data available to chart.
      </div>
    );
  }

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={70}
            outerRadius={100}
            paddingAngle={3}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value: any) => [formatCurrency(Number(value)), 'Amount']}
            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
          />
          <Legend 
            verticalAlign="bottom" 
            height={36} 
            iconType="circle"
            wrapperStyle={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}