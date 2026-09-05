import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "KIDOO",
  description:
    "Tarefas em família com prova em foto. Pais acompanham, filhos concluem, pontos no fim do mês.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "KIDOO",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#187bcd",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={`${nunito.variable} h-full antialiased`}>
      <body className="min-h-full bg-canvas text-navy">{children}</body>
    </html>
  );
}
