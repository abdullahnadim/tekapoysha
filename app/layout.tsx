import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth/AuthContext";

const inter = Inter({ subsets: ["latin"] });

// --- PREMIUM SEO & SOCIAL SHARING METADATA ---
export const metadata: Metadata = {
  // 👇 THIS IS THE FIX: Added metadataBase to resolve the warning and social images 👇
  metadataBase: new URL("https://tekapoysha.vercel.app"),
  
  title: "TekaPoysha | The Premium Money Tracker & Debt Eliminator",
  description: "Stop guessing where your money goes. TekaPoysha is the ultimate money manager to track savings, eliminate debt, and build financial freedom.",
  keywords: ["Money Tracker", "Money Manager", "Money App", "TekaPoysha", "Teka Poysha", "Debt Snowball", "Bangladesh Finance"],
  authors: [{ name: "TekaPoysha Team" }],
  
  // PWA Settings
  manifest: "/manifest.json", 
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "TekaPoysha",
  },

  // Open Graph (How it looks when shared on Facebook/Discord/LinkedIn)
  openGraph: {
    title: "TekaPoysha | Master Your Money",
    description: "The ultimate money tracker to crush debt and gamify your savings.",
    url: "https://tekapoysha.vercel.app", 
    siteName: "TekaPoysha",
    images: [
      {
        url: "/og-image.png", // Next.js will pull this from your 'public' folder
        width: 1200,
        height: 630,
        alt: "TekaPoysha Dashboard Preview",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  
  // Twitter / X Card settings
  twitter: {
    card: "summary_large_image",
    title: "TekaPoysha | Master Your Money",
    description: "The ultimate money tracker to crush debt and gamify your savings.",
    images: ["/og-image.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#2563eb", 
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        
        {/* INVISIBLE SEO SUPER-WEAPON (JSON-LD) */}
        <Script id="tekapoysha-schema" type="application/ld+json" strategy="beforeInteractive">
          {`
            {
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "TekaPoysha",
              "alternateName": "Teka Poysha",
              "applicationCategory": "FinanceApplication",
              "operatingSystem": "Web, iOS, Android",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "BDT"
              },
              "description": "TekaPoysha is a premium money manager and money tracker application designed to help users crush debt with the Snowball method and gamify their savings goals.",
              "creator": {
                "@type": "Organization",
                "name": "TekaPoysha"
              }
            }
          `}
        </Script>

        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}