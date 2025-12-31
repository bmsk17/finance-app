// ARQUIVO: src/app/projections/page.tsx

import { getProjectionData } from "@/app/actions/projections";
// Note o import: agora aponta para a pasta
import { ProjectionSimulator } from "@/components/ProjectionSimulator"; 

export default async function ProjectionsPage() {
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