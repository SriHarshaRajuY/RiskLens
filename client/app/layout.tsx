import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AppProviders } from "@/components/layout/AppProviders";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap"
});

export const metadata: Metadata = {
  title: {
    template: "%s | RiskLens",
    default: "RiskLens"
  },
  description: "Production-grade portfolio analytics and risk alert platform. Monitor performance, analyze asset allocation, and configure advanced risk thresholds.",
  openGraph: {
    title: "RiskLens",
    description: "Production-grade portfolio analytics and risk alert platform.",
    siteName: "RiskLens",
    type: "website"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
