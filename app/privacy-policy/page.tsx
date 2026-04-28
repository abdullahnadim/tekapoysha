import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | TekaPoysha",
  description: "How TekaPoysha protects your financial data.",
};

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 py-20 px-6">
      <div className="max-w-3xl mx-auto bg-white p-10 md:p-16 rounded-[40px] shadow-sm border border-gray-100">
        <Link href="/" className="inline-flex items-center text-sm font-bold text-blue-600 hover:text-blue-700 mb-8 transition-colors">
          ← Back to Home
        </Link>
        
        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-gray-900 mb-8">Privacy Policy</h1>
        
        <div className="prose prose-blue prose-lg text-gray-600">
          <p className="font-medium"><strong>Last Updated:</strong> {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
          
          <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">1. Data Collection & Usage</h2>
          <p>TekaPoysha is a manual money tracker. We do not connect to your bank accounts, bKash API, or credit cards. The only financial data we collect is the data you manually input into the application to track your savings and debts.</p>
          
          <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">2. Data Storage & Security</h2>
          <p>Your authentication and database records are securely handled by Google Firebase. Your data is encrypted in transit and at rest. We do not have direct access to your plaintext passwords, and we will never sell your financial activity to third-party advertisers.</p>
          
          <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">3. Local Storage (PWA)</h2>
          <p>As a Progressive Web App (PWA), TekaPoysha may utilize your device's local storage to save application states (like your gamification badge preferences) to ensure a high-speed, offline-capable experience.</p>
          
          <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">4. Your Rights</h2>
          <p>You own your data. You can delete specific transactions, modify your balances, or request the complete deletion of your account and associated data at any time through the application settings.</p>

          <hr className="my-10 border-gray-100" />
          <p className="text-sm text-gray-400">If you have any questions regarding this policy, please contact support.</p>
        </div>
      </div>
    </div>
  );
}