import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth/AuthContext";

const inter = Inter({ subsets: ["latin"] });

// 1. ADD THE MANIFEST LINK HERE 👇
export const metadata: Metadata = {
  title: "TekaPoysha",
  description: "Personal financial command center",
  manifest: "/manifest.json", 
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "TekaPoysha",
  },
};

// 2. ADD THE THEME COLOR HERE 👇
export const viewport: Viewport = {
  themeColor: "#2563eb", // This makes the phone's top battery/wifi bar match your brand color
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}