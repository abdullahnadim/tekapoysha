import Link from "next/link";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { guidesData } from "../page";

// Define the new Promise-based type for Next.js 15/16
type Props = {
  params: Promise<{ slug: string }>;
};

// --- 1. DYNAMIC SEO METADATA GENERATOR ---
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // Await the params before reading the slug
  const resolvedParams = await params;
  const guide = guidesData.find((g) => g.slug === resolvedParams.slug);
  
  if (!guide) return { title: "Guide Not Found" };

  return {
    title: `${guide.title} | TekaPoysha Guides`,
    description: guide.excerpt,
    openGraph: {
      title: guide.title,
      description: guide.excerpt,
      type: "article",
      publishedTime: guide.date,
    },
  };
}

// --- 2. DYNAMIC PAGE TEMPLATE ---
export default async function GuideArticle({ params }: Props) {
  // Await the params before reading the slug
  const resolvedParams = await params;
  const guide = guidesData.find((g) => g.slug === resolvedParams.slug);

  // If the URL doesn't match an article, show a 404 page
  if (!guide) return notFound();

  return (
    <div className="min-h-screen bg-white pb-24">
      
      {/* Top Navigation */}
      <nav className="border-b border-gray-100 py-6 px-6">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/guides" className="text-sm font-bold text-gray-400 hover:text-blue-600 transition-colors">
            ← Back to all guides
          </Link>
          <Link href="/" className="px-4 py-2 bg-blue-50 text-blue-600 text-xs font-black uppercase tracking-widest rounded-full hover:bg-blue-100 transition-colors">
            Open App
          </Link>
        </div>
      </nav>

      {/* Article Header */}
      <header className="pt-16 pb-12 px-6 border-b border-gray-50">
        <div className="max-w-3xl mx-auto text-center">
          <span className="text-blue-600 text-xs font-black uppercase tracking-widest bg-blue-50 px-3 py-1.5 rounded-full mb-6 inline-block">
            {guide.category}
          </span>
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight leading-[1.1] mb-6">
            {guide.title}
          </h1>
          <div className="flex items-center justify-center gap-4 text-sm font-bold text-gray-400">
            <span>{guide.date}</span>
            <span>•</span>
            <span>{guide.readTime}</span>
          </div>
        </div>
      </header>

      {/* Article Content (Prose) */}
      <article className="max-w-3xl mx-auto px-6 py-16">
        <div className="prose prose-lg prose-blue max-w-none text-gray-600">
          
          <p className="lead text-xl text-gray-500 font-medium mb-10">
            {guide.excerpt}
          </p>

          <h2>The Core Concept</h2>
          <p>
            When you are facing multiple sources of debt, it can feel overwhelming. Do you pay off the largest interest rate first, or do you tackle the smallest balance to get a quick psychological win? This is the classic debate in personal finance.
          </p>

          <h3>Method 1: The Debt Snowball</h3>
          <p>
            The Snowball method ignores interest rates. Instead, you list your debts from smallest balance to largest. You pay minimums on everything, but throw every extra Taka at the smallest debt. 
          </p>
          <ul>
            <li><strong>Pros:</strong> Immediate dopamine hits. You see entire debts vanish quickly.</li>
            <li><strong>Cons:</strong> You might pay slightly more in total interest over time.</li>
          </ul>

          <h3>Method 2: The Debt Avalanche</h3>
          <p>
            The Avalanche method is strictly mathematical. You list your debts from highest interest rate to lowest. You attack the highest rate first.
          </p>
          <ul>
            <li><strong>Pros:</strong> Saves you the absolute maximum amount of money.</li>
            <li><strong>Cons:</strong> Can take months or years before you feel the satisfaction of clearing a full account.</li>
          </ul>

        </div>

        {/* --- PRODUCT-LED SEO CALL TO ACTION --- */}
        <div className="mt-20 bg-gray-900 rounded-[40px] p-10 md:p-16 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/30 blur-3xl rounded-full"></div>
          <div className="relative z-10">
            <h3 className="text-3xl font-black text-white mb-4">Ready to crush your debt?</h3>
            <p className="text-gray-400 font-medium mb-8 max-w-md mx-auto">
              Stop calculating in spreadsheets. TekaPoysha has a built-in Debt Eliminator that automatically builds your Snowball plan.
            </p>
            <Link href="/register" className="inline-block px-8 py-4 bg-blue-600 text-white font-black rounded-2xl shadow-lg hover:bg-blue-700 hover:-translate-y-1 transition-all">
              Launch Dashboard Free
            </Link>
          </div>
        </div>
      </article>
    </div>
  );
}