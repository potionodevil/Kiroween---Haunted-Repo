import type { Metadata } from "next";
import { Bricolage_Grotesque, JetBrains_Mono, Pirata_One } from "next/font/google";
import "./globals.css";
import { SideDecor } from "@/components/SideDecor";

const display = Pirata_One({ weight: "400", subsets: ["latin"], variable: "--ff-display" });
const text = Bricolage_Grotesque({ subsets: ["latin"], variable: "--ff-text" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--ff-mono" });

export const metadata: Metadata = {
  title: "Haunted Repo",
  description: "Your git history is haunted. Find leaked secrets, bugs and slow code, then banish them.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${text.variable} ${mono.variable}`}>
      <body>
        {children}
        <SideDecor />
      </body>
    </html>
  );
}
