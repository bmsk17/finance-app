// ARQUIVO: src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { ThemeProvider } from "@/providers/theme-provider";

// --- IMPORTAÇÕES DE SESSÃO ---
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FinControl",
  description: "Controle Financeiro Pessoal",
};

// Adicionamos o 'async' aqui para ele conseguir ir no banco buscar o usuário
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  
  // Pegamos a sessão no servidor
  const session = await getServerSession(authOptions);
  // Se tiver um usuário logado, pegamos o nome dele. Se não, fica "Usuário"
  const userName = session?.user?.name || "Usuário";

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={inter.className} style={{ display: 'flex', minHeight: '100vh' }}>
        
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          
          {/* Passamos o nome dinâmico para a Sidebar */}
          <Sidebar userName={userName} />

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {children}
          </div>

        </ThemeProvider>

      </body>
    </html>
  );
}