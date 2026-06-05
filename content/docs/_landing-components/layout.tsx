import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  weight: ["300", "400", "500"],
});

export const metadata: Metadata = {
  title: "CORE — The Operating System for Commerce",
  description:
    "Others integrate software. CORE integrates operations. Connecting Brands, Operations and Markets.",
  openGraph: {
    title: "CORE — The Operating System for Commerce",
    description: "Others integrate software. CORE integrates operations.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={geist.variable}>
      <body>{children}</body>
    </html>
  );
}
