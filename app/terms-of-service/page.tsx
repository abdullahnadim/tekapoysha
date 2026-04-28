import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | TekaPoysha",
  description: "Terms and conditions for using TekaPoysha.",
};

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gray-50 py-20 px-6">
      <div className="max-w-3xl mx-auto bg-white p-10 md:p-16 rounded-[40px] shadow-sm border border-gray-100">
        <Link href="/" className="inline-flex items-center text-sm font-bold text-blue-600 hover:text-blue-700 mb-8 transition-colors">
          ← Back to Home
        </Link>
        
        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-gray-900 mb-8">Terms of Service</h1>
        
        <div className="prose prose-blue prose-lg text-gray-600">
          <p className="font-medium"><strong>Last Updated:</strong> {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
          
          <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">1. Acceptance of Terms</h2>
          <p>By accessing and using TekaPoysha, you accept and agree to be bound by the terms and provisions of this agreement. If you do not agree to abide by these terms, please do not use this service.</p>
          
          <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">2. Financial Disclaimer (Not a Bank)</h2>
          <p><strong>TekaPoysha is a productivity and tracking tool, not a financial institution, bank, or registered financial advisor.</strong> Any calculations, badge estimations, or debt payoff strategies (such as the Snowball method) provided by the app are for informational and educational purposes only.</p>
          
          <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">3. User Responsibilities</h2>
          <p>You are responsible for maintaining the confidentiality of your account login information. TekaPoysha is not liable for any loss or damage arising from your failure to protect your login credentials.</p>
          
          <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">4. Beta Release</h2>
          <p>The service is currently provided "as is." While we strive for 100% uptime and data accuracy, TekaPoysha does not guarantee that the service will be uninterrupted or completely error-free.</p>

          <hr className="my-10 border-gray-100" />
          <p className="text-sm text-gray-400">These terms are subject to change. Continued use of the application constitutes acceptance of any updated terms.</p>
        </div>
      </div>
    </div>
  );
}