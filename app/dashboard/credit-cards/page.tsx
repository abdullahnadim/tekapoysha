'use client';

import Link from "next/link";
import CardList from "@/components/CreditCards/CardList";

export default function CreditCardsPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
        
        {/* Navigation Breadcrumb */}
        <Link 
          href="/dashboard" 
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Dashboard
        </Link>

        {/* Core Module */}
        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <CardList />
        </div>

      </div>
    </div>
  );
}