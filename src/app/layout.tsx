import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

const eventName = process.env.NEXT_PUBLIC_EVENT_NAME ?? "Corrida de Trilha";

export const metadata: Metadata = {
  title: `${eventName} — Inscrições`,
  description: `Inscrições abertas para o ${eventName}: trilhas de 8km e 18km.`,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
