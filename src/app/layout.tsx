import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { ThemeProvider } from "@/providers/theme-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FinControl",
  description: "Controle Financeiro Pessoal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // O suppressHydrationWarning deve estar aqui para evitar erros com o tema escuro/claro
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={inter.className} style={{ display: 'flex', minHeight: '100vh' }}>
        
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          
          <Sidebar />

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {children}
          </div>

        </ThemeProvider>

      </body>
    </html>
  );
}