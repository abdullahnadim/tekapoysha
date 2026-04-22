import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="max-w-md text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 mb-2">
          Teka Poysha
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          A minimal, fast way to track your bank, cash, and bKash.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/login" className="rounded-lg bg-gray-900 px-6 py-2 text-white font-medium hover:bg-gray-800 transition-colors">
            Log In
          </Link>
          <Link href="/register" className="rounded-lg bg-white border border-gray-300 px-6 py-2 text-gray-900 font-medium hover:bg-gray-50 transition-colors">
            Sign Up
          </Link>
        </div>
      </div>
    </main>
  );
}