import type { Metadata } from "next";
import { Geist_Mono, Rajdhani } from "next/font/google";
import "./globals.css";

const display = Rajdhani({ subsets: ["latin"], weight: ["500", "600", "700"] });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: "F1 24 Time Trial | Live Telemetry",
  description: "Local F1 24 telemetry displayed live.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={`${display.className} ${mono.variable}`}>{children}</body></html>;
}
