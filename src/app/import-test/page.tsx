// ARQUIVO: src/app/import-test/page.tsx
'use client'

import { useState } from 'react'
// 1. AQUI: Atualizamos para o nome novo da função!
import { analyzeNubankCsvAction } from '@/app/actions/import'

export default function TestImportPage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  async function handleUpload(formData: FormData) {
    setLoading(true)
    try {
      // 2. AQUI: Chamamos a função com o nome novo!
      const data = await analyzeNubankCsvAction(formData)
      setResult(data)
    } catch (error: any) {
      setResult({ erro: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Teste do Cérebro de Importação</h1>
      <p>Faça o upload do seu ficheiro CSV para ver as etiquetas mágicas.</p>
      
      <form action={handleUpload} style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
        <input 
          type="file" 
          name="file" 
          accept=".csv" 
          style={{ padding: '10px', border: '1px solid #ccc' }}
        />
        <button 
          type="submit" 
          disabled={loading}
          style={{ padding: '10px 20px', background: '#8a05be', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
        >
          {loading ? 'A analisar...' : 'Ler Ficheiro'}
        </button>
      </form>

      {result && (
        <div style={{ marginTop: '30px' }}>
          <h3>Resultado da Análise:</h3>
          <p>Foram processadas <strong>{result.length}</strong> transações.</p>
          <pre style={{ background: '#1e293b', color: '#10b981', padding: '20px', borderRadius: '8px', overflowX: 'auto', maxHeight: '500px' }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}