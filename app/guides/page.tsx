import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Financial Guides & Mastery | TekaPoysha",
  description: "Learn the exact strategies to eliminate debt, build wealth, and master your money in Bangladesh.",
};

// This is your temporary "Database" of articles. 
// Later, you can move this to Firebase or a CMS!
export const guidesData = [
  {
    slug: "debt-snowball-vs-avalanche",
    title: "Snowball vs. Avalanche: The Fastest Mathematical Way Out of Debt",
    excerpt: "Discover which debt elimination strategy is right for you, and how utilizing the right math can save you thousands in interest.",
    category: "Debt Elimination",
    readTime: "5 min read",
    date: "April 29, 2026",
    image: "🎯", // You can replace these with actual image URLs later
  },
  {
    slug: "bkash-expense-tracking-guide",
    title: "How to Track Your bKash Expenses Without Going Crazy",
    excerpt: "Mobile money is fast, but it's easy to lose track of where it goes. Here is the ultimate framework for managing your digital wallets.",
    category: "Money Tracking",
    readTime: "4 min read",
    date: "April 20, 2026",
    image: "📱",
  },
  {
    slug: "50-30-20-budget-bangladesh",
    title: "The 50/30/20 Budgeting Rule Adapted for Dhaka Living",
    excerpt: "Can you actually save 20% of your income while living in a massive city? Yes, if you structure your vault correctly.",
    category: "Savings Hacks",
    readTime: "6 min read",
    date: "April 15, 2026",
    image: "💎",
  }
];

export default function GuidesHub() {
  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      
      {/* HEADER SECTION */}
      <div className="bg-gray-900 pt-32 pb-24 px-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/20 blur-[100px] rounded-full pointer-events-none"></div>
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <Link href="/" className="inline-block text-blue-400 font-bold text-sm mb-6 hover:text-blue-300 transition-colors">
            ← Back to TekaPoysha
          </Link>
          <h1 className="text-5xl md:text-7xl font-black text-white tracking-tight mb-6">
            Master your <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">Money.</span>
          </h1>
          <p className="text-xl text-gray-400 font-medium max-w-2xl mx-auto">
            Actionable guides, debt elimination strategies, and wealth-building frameworks for the modern professional.
          </p>
        </div>
      </div>

      {/* ARTICLE GRID */}
      <div className="max-w-5xl mx-auto px-6 -mt-10 relative z-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {guidesData.map((guide) => (
            <Link 
              key={guide.slug} 
              href={`/guides/${guide.slug}`}
              className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 flex flex-col group"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                  {guide.image}
                </div>
                <span className="bg-gray-50 text-gray-500 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full">
                  {guide.category}
                </span>
              </div>
              
              <h2 className="text-xl font-black text-gray-900 leading-tight mb-3 group-hover:text-blue-600 transition-colors">
                {guide.title}
              </h2>
              <p className="text-gray-500 text-sm font-medium leading-relaxed mb-6 flex-grow">
                {guide.excerpt}
              </p>
              
              <div className="flex items-center justify-between text-xs font-bold text-gray-400 border-t border-gray-50 pt-4 mt-auto">
                <span>{guide.date}</span>
                <span>{guide.readTime}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

    </div>
  );
}