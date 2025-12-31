'use client' // OBRIGATÓRIO para usar onInput e hooks de estado

import { useEffect, useState } from 'react';
import { createTransaction } from "@/app/actions/transactions";
import { getAccountsAction, getCategoriesAction } from "@/app/actions/transactions"; // Você precisará criar essas ações simples
import Link from "next/link";
import styles from "./page.module.scss";

export default function NewTransactionPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Carregamos os dados via Action pois estamos em um Client Component
  useEffect(() => {
    async function loadData() {
      // Essas funções devem ser exportadas do seu arquivo de actions
      const accs = await getAccountsAction();
      const cats = await getCategoriesAction();
      setAccounts(accs);
      setCategories(cats);
      setLoading(false);
    }
    loadData();
  }, []);

  if (loading) return <p style={{textAlign: 'center', padding: '40px'}}>Carregando...</p>;

  return (
    <main className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Nova Movimentação</h1>

        <form action={createTransaction} className={styles.form}>
          
          {/* Descrição */}
          <div className={styles.formGroup}>
            <label>Descrição</label>
            <input type="text" name="description" placeholder="Ex: Mercado, Salário..." required />
          </div>

          <div className={styles.row}>
            {/* Valor - CORRIGIDO PARA ACEITAR VÍRGULA */}
            <div className={styles.formGroup}>
              <label>Valor da Parcela (R$)</label>
              <input 
                type="text" // Mudamos para text para permitir a vírgula
                name="amount" 
                placeholder="0,00" 
                required 
                onInput={(e: any) => {
                  // Substitui vírgula por ponto
                  let value = e.target.value.replace(',', '.');
                  // Remove tudo que não for número ou ponto
                  value = value.replace(/[^0-9.]/g, '');
                  // Evita múltiplos pontos decimais
                  const parts = value.split('.');
                  if (parts.length > 2) {
                    value = parts[0] + '.' + parts.slice(1).join('');
                  }
                  e.target.value = value;
                }}
              />
            </div>

            {/* Data */}
            <div className={styles.formGroup}>
              <label>Data 1ª Parcela</label>
              <input 
                type="date" 
                name="date" 
                defaultValue={new Date().toISOString().split('T')[0]} 
                required 
              />
            </div>
          </div>
          
          <div className={styles.row}>
            {/* Tipo */}
            <div className={styles.formGroup}>
              <label>Tipo</label>
              <select name="type" defaultValue="expense">
                <option value="expense">🔴 Despesa</option>
                <option value="income">🟢 Receita</option>
              </select>
            </div>

            {/* Categoria */}
            <div className={styles.formGroup}>
              <label>Categoria</label>
              <select name="categoryId" required defaultValue="">
                <option value="" disabled>Selecione...</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Conta */}
          <div className={styles.formGroup}>
            <label>Conta / Carteira</label>
            <select name="accountId" required>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} (Saldo: R$ {Number(acc.currentBalance).toFixed(2)})
                </option>
              ))}
            </select>
          </div>

          <div className={styles.installmentsBlock}>
            <div className={styles.formGroup}>
              <label>Repetir (Parcelas)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input 
                  type="number" 
                  name="installments" 
                  defaultValue="1" 
                  min="1" 
                  max="48"
                  style={{ width: '80px' }} 
                />
                <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>meses (1x = à vista)</span>
              </div>
            </div>

            <div>
                <div className={styles.checkboxWrapper}>
                <input 
                    type="checkbox" 
                    name="isPaid" 
                    id="isPaid" 
                    defaultChecked 
                />
                <label htmlFor="isPaid">Já está pago/consolidado?</label>
                </div>
                <p className={styles.helperText}>
                  Desmarque se for um gasto planejado (opcional) ou futuro.
                </p>
            </div>
          </div>

          <button type="submit" className={styles.btnSubmit}>Salvar</button>
        </form>

        <Link href="/" className={styles.backLink}>← Cancelar e voltar</Link>
      </div>
    </main>
  );
}