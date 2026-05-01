"use client";

export default function SupportDevPage() {
  // Keeping the copy function commented out for future use when you reveal your numbers!
  /*
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    alert(`Copied ${text} to clipboard!`);
  };
  */

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans">
      <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500">
        
        <div className="text-center space-y-3 mb-8">
          <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center text-4xl shadow-sm mx-auto mb-4 border-4 border-white">
            ☕
          </div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Support the Developer</h1>
          <p className="text-gray-500 font-medium max-w-lg mx-auto leading-relaxed">
            TekaPoysha is an indie project built with love in Bangladesh. It is 100% free and ad-free. If this app helps you manage your wealth, consider buying me a Chaa to help keep the servers running!
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* --- ACTIVE: PATHAO PAY --- */}
          <div className="col-span-1 md:col-span-2 bg-gradient-to-r from-red-500 to-rose-600 p-8 rounded-3xl shadow-lg text-white text-center mt-2">
            <div className="w-16 h-16 bg-white text-red-600 rounded-full flex items-center justify-center font-black text-2xl mx-auto mb-4 shadow-sm">
              P
            </div>
            <h3 className="text-2xl font-black mb-2">Support via Pathao Pay</h3>
            <p className="text-red-100 font-medium mb-6">Send your support securely via link (no phone number required).</p>
            <a 
              href="https://pathaopay.me/@mirnadim" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-block px-8 py-4 bg-white text-red-600 font-black rounded-xl hover:bg-gray-50 hover:scale-105 transition-all shadow-md"
            >
              Pay with Pathao Pay ❤️
            </a>
          </div>

          {/* --- COMMENTED OUT FOR FUTURE USE --- */}
          
          {/* bKash CARD */}
          {/* <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:border-pink-200 transition-colors group">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-pink-100 text-pink-600 rounded-full flex items-center justify-center font-black">bK</div>
              <h3 className="font-bold text-gray-900 text-lg">bKash (Personal)</h3>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl flex justify-between items-center border border-gray-100">
              <span className="font-mono font-bold text-lg text-gray-800 tracking-wider">017XX-XXXXXX</span>
              <button onClick={() => handleCopy("01700000000")} className="text-sm font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors">Copy</button>
            </div>
          </div>
          */}

          {/* Nagad CARD */}
          {/* <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:border-orange-200 transition-colors group">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center font-black">N</div>
              <h3 className="font-bold text-gray-900 text-lg">Nagad (Personal)</h3>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl flex justify-between items-center border border-gray-100">
              <span className="font-mono font-bold text-lg text-gray-800 tracking-wider">017XX-XXXXXX</span>
              <button onClick={() => handleCopy("01700000000")} className="text-sm font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors">Copy</button>
            </div>
          </div>
          */}

          {/* BUY ME A COFFEE (INTERNATIONAL) */}
          {/* <div className="col-span-1 md:col-span-2 bg-gradient-to-r from-amber-500 to-orange-500 p-8 rounded-3xl shadow-lg text-white text-center mt-2">
            <h3 className="text-2xl font-black mb-2">International Supporter?</h3>
            <p className="text-amber-100 font-medium mb-6">You can support the project securely via Buy Me A Coffee.</p>
            <a 
              href="https://buymeacoffee.com/yourlink" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-block px-8 py-4 bg-white text-amber-600 font-black rounded-xl hover:bg-gray-50 hover:scale-105 transition-all shadow-md"
            >
              Buy me a Coffee ☕
            </a>
          </div>
          */}

        </div>
      </div>
    </div>
  );
}