// ARQUIVO: src/app/projections/page.tsx
import { getProjectionData } from "@/app/actions/projections";
import { ProjectionSimulator } from "@/components/ProjectionSimulator";

// Importações do motor de Login
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function ProjectionsPage() {
  // 1. VERIFICAÇÃO DE IDENTIDADE
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect("/login");
  }

  // 2. Busca os dados (agora blindados na action)
  const data = await getProjectionData();

  return (
    <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
      <h1 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)' }}>
        Simulador de Futuro 🔮
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
        Veja como ficará seu saldo nos próximos anos com base nas suas parcelas e contas fixas.
        Adicione cenários hipotéticos para testar decisões.
      </p>

      <ProjectionSimulator initialData={data} />
    </main>
  );
}