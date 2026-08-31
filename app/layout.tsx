import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { AuthProvider } from "@/components/shared/AuthProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "PROJECT NOVA — AI Emergency Response Network",
    template: "%s | PROJECT NOVA",
  },
  description:
    "An intelligent emergency response network that transforms real-time citizen reports into coordinated rescue decisions. From Emergency Reports to Intelligent Action — in Seconds.",
  keywords: [
    "emergency response",
    "AI disaster management",
    "Sri Lanka",
    "flood monitoring",
    "rescue coordination",
    "PROJECT NOVA",
  ],
  openGraph: {
    title: "PROJECT NOVA — AI Emergency Response Network",
    description: "From Emergency Reports to Intelligent Action — in Seconds.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <link href="https://api.mapbox.com/mapbox-gl-js/v3.2.0/mapbox-gl.css" rel="stylesheet" />
      </head>
      <body className={`${inter.variable} antialiased bg-nova-bg text-nova-text`}>
        <AuthProvider>
          {children}
        </AuthProvider>
        <Toaster
          theme="dark"
          toastOptions={{
            style: {
              background: '#0d1629',
              border: '1px solid #1a2744',
              color: '#e8f0fe',
            },
          }}
          position="top-right"
        />
      </body>
    </html>
  );
}
