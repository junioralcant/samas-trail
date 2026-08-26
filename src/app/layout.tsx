import type { Metadata } from "next";
import { Anton, Inter } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const anton = Anton({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-anton",
});
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

const eventName = process.env.NEXT_PUBLIC_EVENT_NAME ?? "Corrida de Trilha";

export const metadata: Metadata = {
  title: `${eventName} — Inscrições`,
  description: `Inscrições abertas para o ${eventName}: trilhas de 8km e 18km.`,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${anton.variable} ${inter.variable}`}>{children}</body>
    </html>
  );
}
