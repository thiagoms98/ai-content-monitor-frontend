import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NEON · AI Content Monitor",
  description: "Um blog temporário com moderação de texto e imagem por IA.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
