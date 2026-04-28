"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/components/auth/AuthContext";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  // Interactive Calculator State
  const [weeklySave, setWeeklySave] = useState(500);
  const yearlyTotal = weeklySave * 52;
  
  // Auto-Redirect logged-in users to the dashboard
  useEffect(() => {
    if (user) {
      router.push("/dashboard");
    } else {
      const timer = setTimeout(() => setIsChecking(false), 400); // Prevents a flash of the landing page
      return () => clearTimeout(timer);
    }
  }, [user, router]);

  // Calculate which badge they would earn
  const getBadge = (amount: number) => {
    if (amount >= 100000) return { name: "Diamond Hands", icon: "💎" };
    if (amount >= 50000) return { name: "Gold Vault", icon: "🏆" };
    if (amount >= 10000) return { name: "Silver Saver", icon: "🥈" };
    return { name: "Seed Planter", icon: "🌱" };
  };

  const projectedBadge = getBadge(yearlyTotal);

  // Show a sleek loading state while checking auth
  if (isChecking || user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-pulse">
          <Image src="/tekapoysha-logo.png" alt="Loading TekaPoysha" width={64} height={64} priority />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white text-gray-900 selection:bg-blue-100 min-h-screen overflow-hidden">
      
      {/* --- NAVIGATION --- */}
      <nav className="fixed top-0 w-full z-50 bg-white/60 backdrop-blur-xl border-b border-gray-100/50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src="/tekapoysha-logo.png" alt="TekaPoysha" width={32} height={32} />
            <span className="text-xl font-black tracking-tighter text-blue-600">TekaPoysha</span>
          </div>
          <Link href="/login" className="px-5 py-2.5 bg-gray-900 text-white text-sm font-bold rounded-full hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5">
            Login
          </Link>
        </div>
      </nav>

      {/* --- HERO SECTION --- */}
      <header className="relative pt-40 pb-20 px-6 min-h-screen flex flex-col items-center">
        
        {/* Background Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-400/20 rounded-full blur-[100px] pointer-events-none"></div>

        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-4xl mx-auto text-center space-y-8 relative z-10"
        >
          <div className="inline-block px-4 py-1.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-full text-sm font-bold tracking-wide uppercase shadow-sm">
            🚀 The #1 Financial Tool for Bangladesh
          </div>
          
          <h1 className="text-6xl md:text-8xl font-black tracking-tight leading-[0.9]">
            Take control of your <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">Teka.</span> <br />
            Crush your <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500">Debts.</span>
          </h1>
          
          <p className="text-xl text-gray-500 font-medium max-w-2xl mx-auto leading-relaxed">
            Stop guessing where your money goes. Track savings, eliminate liabilities with the Snowball method, and earn badges for financial discipline.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link href="/register" className="w-full sm:w-auto px-10 py-5 bg-blue-600 text-white text-lg font-black rounded-2xl hover:bg-blue-700 transition-all shadow-[0_0_40px_rgba(37,99,235,0.4)] hover:shadow-[0_0_60px_rgba(37,99,235,0.6)]">
              Start Free Today
            </Link>
          </div>
        </motion.div>

        {/* --- GLASSMORPHISM PREVIEW --- */}
        <motion.div 
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.4, ease: "easeOut" }}
          className="relative mt-24 w-full max-w-5xl hidden md:block z-10"
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/10 to-purple-600/10 rounded-[40px] blur-2xl"></div>
          <div className="relative bg-white/40 backdrop-blur-2xl border border-white/60 rounded-[40px] shadow-2xl p-6 overflow-hidden">
            {/* Fake Dashboard Header */}
            <div className="flex items-center gap-4 mb-8 pb-6 border-b border-white/40">
              <div className="w-12 h-12 bg-gradient-to-tr from-blue-600 to-blue-400 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">M</div>
              <div>
                <div className="h-4 w-32 bg-gray-900/10 rounded-full mb-2"></div>
                <div className="h-3 w-24 bg-gray-500/10 rounded-full"></div>
              </div>
            </div>
            
            {/* Fake Dashboard Cards */}
            <div className="grid grid-cols-3 gap-6">
              <div className="h-40 bg-white/60 rounded-3xl border border-white p-6 shadow-sm">
                <div className="w-8 h-8 rounded-full bg-blue-100 mb-4"></div>
                <div className="h-8 w-3/4 bg-gray-900/10 rounded-full mb-2"></div>
                <div className="h-3 w-1/2 bg-gray-500/10 rounded-full"></div>
              </div>
              <div className="h-40 bg-white/60 rounded-3xl border border-white p-6 shadow-sm">
                <div className="w-8 h-8 rounded-full bg-red-100 mb-4"></div>
                <div className="h-8 w-2/3 bg-gray-900/10 rounded-full mb-2"></div>
                <div className="h-3 w-1/2 bg-gray-500/10 rounded-full"></div>
              </div>
              <div className="h-40 bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
                <div className="text-white/60 text-xs font-bold uppercase tracking-widest">Next Target</div>
                <div className="text-white text-2xl font-black">PC Setup</div>
                <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden mt-2">
                  <div className="bg-blue-400 w-2/3 h-full rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </header>

      {/* --- INTERACTIVE CALCULATOR SECTION --- */}
      <section className="py-32 px-6 bg-gray-900 text-white relative overflow-hidden">
        <div className="absolute right-0 top-0 w-[500px] h-[500px] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none"></div>
        
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-6">Small habits.<br/>Massive rewards.</h2>
              <p className="text-gray-400 text-lg leading-relaxed mb-8">
                You don't need a massive salary to build wealth. Consistency is the ultimate cheat code. Use our momentum calculator to see what happens when you commit to a weekly habit.
              </p>
              
              <div className="bg-white/10 border border-white/10 rounded-3xl p-8 backdrop-blur-sm">
                <div className="flex justify-between items-end mb-4">
                  <label className="text-sm font-bold text-gray-300 uppercase tracking-widest">I can save weekly</label>
                  <span className="text-3xl font-black text-blue-400">৳ {weeklySave}</span>
                </div>
                
                <input 
                  type="range" 
                  min="100" 
                  max="5000" 
                  step="100" 
                  value={weeklySave}
                  onChange={(e) => setWeeklySave(Number(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500 mb-8"
                />
                
                <div className="pt-6 border-t border-white/10">
                  <p className="text-sm text-gray-400 mb-1 font-medium">In exactly one year, you will have</p>
                  <p className="text-5xl font-black text-white mb-4">৳ {yearlyTotal.toLocaleString('en-IN')}</p>
                  
                  <div className="inline-flex items-center gap-3 bg-blue-500/20 border border-blue-500/30 text-blue-300 px-4 py-2 rounded-xl">
                    <span className="text-xl">{projectedBadge.icon}</span>
                    <span className="font-bold text-sm">Unlocks the {projectedBadge.name} Rank</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Feature List */}
            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="space-y-8"
            >
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-2xl shrink-0">🎯</div>
                <div>
                  <h3 className="text-xl font-bold mb-2 text-white">Debt Eliminator Strategy</h3>
                  <p className="text-gray-400 leading-relaxed text-sm">Instantly toggle between Snowball and Avalanche methods to find the fastest mathematical route out of debt.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-2xl shrink-0">💎</div>
                <div>
                  <h3 className="text-xl font-bold mb-2 text-white">Trophy Room Engine</h3>
                  <p className="text-gray-400 leading-relaxed text-sm">Turn saving money into a game. Earn exclusive badges, rank up, and trigger celebrations when you hit financial milestones.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-2xl shrink-0">⚡</div>
                <div>
                  <h3 className="text-xl font-bold mb-2 text-white">Instant Sync Ecosystem</h3>
                  <p className="text-gray-400 leading-relaxed text-sm">Make a payment from your bank or bKash, and watch your debt balances and savings goals update automatically across the entire app.</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* --- SEO FAQ SECTION --- */}
      <section className="py-24 px-6 bg-white border-t border-gray-100">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tight mb-4">
              Questions about <span className="text-blue-600">TekaPoysha?</span>
            </h2>
            <p className="text-gray-500 font-medium">Everything you need to know about Bangladesh's rising money manager.</p>
          </div>

          <div className="space-y-6">
            <div className="p-8 bg-gray-50 rounded-3xl border border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 mb-3">Why is Teka Poysha the ultimate money tracker?</h3>
              <p className="text-gray-600 leading-relaxed font-medium">
                Unlike basic spreadsheets, TekaPoysha is an active <strong>money tracker</strong> that gamifies your financial habits. It doesn't just log expenses; it actively helps you eliminate debt using the Snowball method and builds a visual roadmap to your savings goals.
              </p>
            </div>

            <div className="p-8 bg-gray-50 rounded-3xl border border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 mb-3">Do I need banking details to use this money manager?</h3>
              <p className="text-gray-600 leading-relaxed font-medium">
                No. TekaPoysha is a privacy-first <strong>money manager</strong>. You manually log your Bank, Cash, and bKash transactions. We never ask for your banking passwords or route your money, ensuring 100% security while you manage your wealth.
              </p>
            </div>

            <div className="p-8 bg-gray-50 rounded-3xl border border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 mb-3">Is TekaPoysha a mobile money app?</h3>
              <p className="text-gray-600 leading-relaxed font-medium">
                Yes! TekaPoysha is built as a Progressive Web App (PWA). You can install this <strong>money app</strong> directly to your iOS or Android home screen straight from your browser. Enjoy app-like speeds and offline capabilities without visiting the App Store.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* --- PREMIUM FOOTER WITH SOCIALS --- */}
      <footer className="bg-gray-900 border-t border-white/10 pt-16 pb-8 px-6 relative overflow-hidden">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[300px] h-[100px] bg-blue-600/20 blur-[80px] rounded-full pointer-events-none"></div>
        
        <div className="max-w-5xl mx-auto relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="flex flex-col md:flex-row items-center justify-between gap-8"
          >
            
            {/* Brand Logo & Name */}
            <div className="flex items-center gap-3 opacity-50 hover:opacity-100 transition-opacity cursor-default">
              <Image 
                src="/tekapoysha-logo.png" 
                alt="TekaPoysha" 
                width={24} 
                height={24} 
                className="grayscale hover:grayscale-0 transition-all"
              />
              <span className="text-lg font-black tracking-tighter text-white">TekaPoysha</span>
            </div>

            {/* --- NEW: SOCIAL MEDIA LINKS --- */}
            <div className="flex items-center gap-5">
              
              {/* Facebook */}
              <a href="https://facebook.com/TekaPoysha" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white hover:-translate-y-1 transition-all">
                <span className="sr-only">Facebook</span>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                </svg>
              </a>

              {/* Instagram */}
              <a href="https://instagram.com/iam_nadim" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white hover:-translate-y-1 transition-all">
                <span className="sr-only">Instagram</span>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                </svg>
              </a>

              {/* GitHub */}
              <a href="https://github.com/abdullahnadim" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white hover:-translate-y-1 transition-all">
                <span className="sr-only">GitHub</span>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
              </a>

            </div>
          {/* Legal Links for SEO/YMYL */}
            <div className="flex items-center justify-center md:justify-end gap-4 text-xs font-bold text-gray-500 w-full mt-6 md:mt-0 md:w-auto">
              <Link href="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link>
              <span>•</span>
              <Link href="/terms-of-service" className="hover:text-white transition-colors">Terms of Service</Link>
            </div>
            {/* Copyright */}
            <div className="text-sm font-bold text-gray-500 md:text-right">
              © {new Date().getFullYear()} • Made by MirShaheb.
            </div>

          </motion.div>
        </div>
      </footer>
      
    </div>
  );
}