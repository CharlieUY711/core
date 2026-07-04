import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title:       "Market Rewards",
  description: "Girá y ganá premios exclusivos",
  manifest:    "/manifest.json",
  appleWebApp: {
    capable:         true,
    statusBarStyle:  "black-translucent",
    title:           "Market Rewards",
  },
};

export const viewport: Viewport = {
  themeColor:     "#7C3AED",
  width:          "device-width",
  initialScale:   1,
  maximumScale:   1,
  userScalable:   false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={cn("dark", "font-sans", geist.variable)}>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className="min-h-screen antialiased" style={{ background: "var(--background)", color: "var(--text)" }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
