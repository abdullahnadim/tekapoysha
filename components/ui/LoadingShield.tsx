import Image from "next/image";

interface LoadingShieldProps {
  text?: string;
}

export default function LoadingShield({ text = "Loading..." }: LoadingShieldProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[70vh] animate-in fade-in duration-500">
      <div className="relative flex items-center justify-center w-24 h-24">
        {/* Outer elegant spinning gradient ring */}
        <div className="absolute inset-0 rounded-full border-t-2 border-r-2 border-blue-600/30 animate-spin"></div>
        <div className="absolute inset-2 rounded-full border-b-2 border-l-2 border-blue-500/50 animate-[spin_2s_reverse_infinite]"></div>
        
        {/* Inner pulsing logo */}
        <div className="relative w-12 h-12 animate-pulse flex items-center justify-center">
          <Image 
            src="/tekapoysha-logo.png" 
            alt="Loading TekaPoysha" 
            width={48} 
            height={48} 
            className="object-contain"
            priority
          />
        </div>
      </div>
      <p className="mt-6 text-sm font-bold text-gray-400 uppercase tracking-widest animate-pulse">
        {text}
      </p>
    </div>
  );
}