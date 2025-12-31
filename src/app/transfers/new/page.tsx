// ARQUIVO: src/app/transfers/new/page.tsx

'use client'

import { useState, useEffect } from 'react';
import { createTransfer } from "@/app/actions/transactions"; 
import { getAccountsAction, getCategoriesAction } from "@/app/actions/transactions";
import Link from "next/link";
import styles from "@/app/transactions/new/page.module.scss"; // Reutilizando estilo

export default function NewTransferPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  
  useEffect(() => {
    async function loadData() {
      const accs = await getAccountsAction();
      const cats = await getCategoriesAction();
      setAccounts(accs);
      setCategories(cats);
    }
    loadData();
  }, []);

  return (
    <main className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title} style={{color: '#8b5cf6'}}>Nova Transferência</h1>
        <p style={{textAlign:'center', color:'gray', marginBottom:'20px', fontSize:'0.9rem'}}>
          Use para pagar faturas de cartão ou mover dinheiro entre contas.
        </p>

        <form action={createTransfer} className={styles.form}>
          
          <div className={styles.row}>
            {/* DE ONDE SAI */}
            <div className={styles.formGroup}>
              <label>Sai de (Origem)</label>
              <select name="fromAccountId" required defaultValue="">
                <option value="" disabled>Selecione...</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.name} (R$ {Number(acc.currentBalance).toFixed(2)})</option>
                ))}
              </select>
            </div>

            <div style={{display:'flex', alignItems:'center', paddingTop:'20px', fontSize:'1.5rem'}}>
              ➡️
            </div>

            {/* PARA ONDE VAI */}
            <div className={styles.formGroup}>
              <label>Vai para (Destino)</label>
              <select name="toAccountId" required defaultValue="">
                <option value="" disabled>Selecione...</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.formGroup}>
              <label>Valor (R$)</label>
              <input 
                type="text" 
                name="amount" 
                placeholder="0,00" 
                required 
                onInput={(e: any) => {
                  let value = e.target.value.replace(',', '.');
                  value = value.replace(/[^0-9.]/g, '');
                  const parts = value.split('.');
                  if (parts.length > 2) value = parts[0] + '.' + parts.slice(1).join('');
                  e.target.value = value;
                }}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Data</label>
              <input 
                type="date" 
                name="date" 
                defaultValue={new Date().toISOString().split('T')[0]} 
                required 
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Descrição (Opcional)</label>
            <input type="text" name="description" placeholder="Ex: Pagamento Fatura Nubank" />
          </div>

          <div className={styles.formGroup}>
             <label>Categoria (Opcional)</label>
             <select name="categoryId" defaultValue="">
                <option value="">Sem Categoria</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                ))}
             </select>
             <p className={styles.helperText} style={{marginLeft:0}}>Recomendado: Crie uma categoria "Transferências" ou "Pagamentos"</p>
          </div>

          <button type="submit" className={styles.btnSubmit} style={{backgroundColor: '#8b5cf6'}}>
            Confirmar Transferência
          </button>
        </form>

        <Link href="/" className={styles.backLink}>← Cancelar</Link>
      </div>
    </main>
  );
}