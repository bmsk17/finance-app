// ARQUIVO: src/app/receivables/ReceivablesClient.tsx

"use client";

import { useState, useMemo, useEffect } from "react";
import { Modal } from "@/components/Modal";
import { ConfirmModal } from "@/components/ConfirmModal";
import { DebtChart } from "./DebtChart";
import { LiquidateButton } from "@/components/LiquidateButton";
import { MonthSelector } from "@/components/MonthSelector";
import { DeleteButton } from "@/components/DeleteButton"; 
import { 
  liquidatePartialDebt, 
  liquidateSpecificTransaction,
  // undoReimbursementAction <--- REMOVIDO (Não usamos mais)
} from "@/app/actions/receivables";
import styles from "./page.module.scss";

export function ReceivablesClient({ data, accounts, currentMonth, currentYear }: any) {
  const [selectedPerson, setSelectedPerson] = useState<any>(null);
  const [activeMonth, setActiveMonth] = useState<string | null>(null);

  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedAcc, setSelectedAcc] = useState(accounts[0]?.id || "");
  const [isPending, setIsPending] = useState(false);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: React.ReactNode;
    onConfirm: () => void;
  }>({ isOpen: false, title: "", description: null, onConfirm: () => {} });

  // --- ATUALIZAÇÃO EM TEMPO REAL ---
  useEffect(() => {
    if (selectedPerson) {
      const updatedPerson = data.find((p: any) => p.id === selectedPerson.id);
      if (updatedPerson) {
        setSelectedPerson(updatedPerson);
      }
    }
  }, [data]); 

  const formatMoney = (val: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val);

  const currentMonthName = new Date(currentYear, currentMonth).toLocaleDateString("pt-BR", {
    month: "long"
  });

  const monthDetails = useMemo(() => {
    if (!selectedPerson || !activeMonth) return null;

    const transactions = selectedPerson.allTransactions.filter((t: any) => {
      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      return key === activeMonth;
    });

    const incomes = transactions.filter((t: any) => t.amount > 0);
    const expenses = transactions.filter((t: any) => t.amount < 0);
    const balance = transactions.reduce((acc: number, t: any) => acc + t.amount, 0);

    const [year, month] = activeMonth.split("-");
    const dateLabel = new Date(Number(year), Number(month) - 1).toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric",
    });

    return { incomes, expenses, balance, dateLabel };
  }, [selectedPerson, activeMonth]);

  useEffect(() => {
    if (monthDetails && monthDetails.balance < 0) {
      const suggestedValue = Math.abs(monthDetails.balance).toFixed(2).replace(".", ",");
      setPayAmount(suggestedValue);
    } else if (selectedPerson && !activeMonth) {
      const totalValue = selectedPerson.totalAccumulated.toFixed(2).replace(".", ",");
      setPayAmount(totalValue);
    }
  }, [monthDetails, selectedPerson, activeMonth]);

  // --- FUNÇÕES DE AÇÃO ---

  // 1. MINI-POPUP DO RAIO
  function requestQuickPay(t: any) {
    setTransactionToPay(t);
    setQuickPayAccount(t.accountId || accounts[0]?.id || "");
    setQuickPayDate(new Date().toISOString().split('T')[0]);
  }

  const [transactionToPay, setTransactionToPay] = useState<any>(null);
  const [quickPayAccount, setQuickPayAccount] = useState("");
  const [quickPayDate, setQuickPayDate] = useState("");

  async function executeQuickPay() {
    if (!transactionToPay || !quickPayAccount) return;
    setIsPending(true);
    try {
      await liquidateSpecificTransaction(
        transactionToPay.id, 
        quickPayAccount, 
        Math.abs(transactionToPay.amount), 
        transactionToPay.description,
        quickPayDate 
      );
      setTransactionToPay(null);
    } catch (error) {
      alert("Erro ao processar o reembolso.");
    } finally {
      setIsPending(false);
    }
  }

  // OBS: REMOVEMOS AS FUNÇÕES requestUndo E executeUndo DAQUI

  // 2. PAGAMENTO PARCIAL / TOTAL
  function requestPayment() {
    if (!payAmount || !selectedAcc || !selectedPerson) {
      alert("Preencha o valor e selecione uma conta.");
      return;
    }

    const valueNum = parseFloat(payAmount.replace(",", "."));
    const accountName = accounts.find((a: any) => a.id === selectedAcc)?.name;

    setConfirmModal({
      isOpen: true,
      title: "Confirmar Pagamento",
      description: (
        <>
          Confirma o recebimento de <strong style={{color:'#10b981'}}>{formatMoney(valueNum)}</strong> na conta <strong>{accountName}</strong>?
          <br/><br/>
          Isso abaterá as dívidas mais antigas de {selectedPerson.name}.
        </>
      ),
      onConfirm: () => executePayment(valueNum)
    });
  }

  async function executePayment(amount: number) {
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
    setIsPending(true);
    try {
      await liquidatePartialDebt({
        categoryId: selectedPerson.id,
        accountId: selectedAcc,
        amount: amount,
        description: `Reembolso: ${selectedPerson.name}`,
      });
      setPayAmount("");
    } catch (error) {
      console.error(error);
      alert("Erro ao registrar pagamento.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <>
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'center' }}>
        <MonthSelector />
      </div>

      <div className={styles.grid}>
        {data.map((person: any) => (
          <div
            key={person.id}
            className={styles.card}
            style={{ borderColor: person.color ?? undefined }}
            onClick={() => setSelectedPerson(person)}
          >
            <div className={styles.cardHeader}>
              <span>{person.icon}</span>
              <h2>{person.name}</h2>
            </div>

            <div className={styles.currentMonthBox}>
              <span style={{ textTransform: 'capitalize' }}>Dívida de {currentMonthName}</span>
              <strong>{formatMoney(person.monthDebt)}</strong>
            </div>

            <div className={styles.totalAccumulated}>
              <span>Total Acumulado</span>
              <strong>{formatMoney(person.totalAccumulated)}</strong>
            </div>

            <div onClick={(e) => e.stopPropagation()}>
              <LiquidateButton
                categoryId={person.id}
                personName={person.name}
                balance={person.monthDebt}
                accounts={accounts}
              />
            </div>

            <div className={styles.history}>
              <h4 style={{ textTransform: 'capitalize' }}>Movimentações de {currentMonthName}</h4>
              
              {person.currentMonthTransactions.length === 0 ? (
                <p style={{fontSize:'0.8rem', color:'#888', fontStyle:'italic', marginTop:'5px'}}>Sem lançamentos.</p>
              ) : (
                person.currentMonthTransactions.map((t: any) => (
                  <div key={t.id} className={styles.historyItem}>
                    <span>{new Date(t.date).toLocaleDateString("pt-BR")}</span>
                    <span className={t.amount > 0 ? styles.in : styles.out}>
                      {formatMoney(Math.abs(t.amount))}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      {selectedPerson && (
        <Modal
          title={`Extrato: ${selectedPerson.name}`}
          onClose={() => {
            setSelectedPerson(null);
            setActiveMonth(null);
          }}
        >
          <div className={styles.modalContent}>
            <DebtChart
              data={selectedPerson.chartData}
              onMonthClick={(month: string) => setActiveMonth(month)}
            />

            {activeMonth && monthDetails && (
              <div className={styles.detailsContainer}>
                <div className={styles.detailsHeader}>
                  <h3>
                    Lançamentos de {monthDetails.dateLabel}
                    <button onClick={() => setActiveMonth(null)}>&times;</button>
                  </h3>
                </div>

                <div className={styles.detailsGrid}>
                  
                  <div className={styles.detailGroup}>
                    <h4>Reembolsos (Entradas)</h4>
                    {monthDetails.incomes.map((t: any) => (
                      <div key={t.id} className={styles.detailItem}>
                        <span>{t.description}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span className={styles.plus}>+ {formatMoney(t.amount)}</span>
                          <DeleteButton 
                            transactionId={t.id} 
                            installmentId={t.installmentId || null}
                            size="small" 
                          />
                        </div>
                      </div>
                    ))}
                    {monthDetails.incomes.length === 0 && <p className={styles.emptyMsg}>Nenhum pagamento.</p>}
                  </div>

                  <div className={styles.detailGroup}>
                    <h4>Gastos (Saídas)</h4>
                    {monthDetails.expenses.map((t: any) => (
                      <div key={t.id} className={styles.detailItem}>
                        <span className={styles.descWithAction}>
                          {t.description}
                          
                          {t.isReimbursed ? (
                            // MUDANÇA AQUI: CHECK AGORA É APENAS VISUAL, NÃO CLICÁVEL
                            <span 
                              className={styles.checkIcon} 
                              title="Reembolsado (Para desfazer, apague o pagamento na lista de Entradas)"
                              style={{ cursor: 'default', opacity: 0.8 }}
                            > ✅</span>
                          ) : (
                            <button
                              className={styles.quickPayBtn}
                              onClick={() => requestQuickPay(t)}
                              title="Registrar reembolso desta despesa"
                            >
                              ⚡
                            </button>
                          )}
                        </span>
                        <span className={styles.minus}>
                          - {formatMoney(Math.abs(t.amount))}
                        </span>
                      </div>
                    ))}
                    {monthDetails.expenses.length === 0 && <p className={styles.emptyMsg}>Nenhum gasto.</p>}
                  </div>
                </div>

                <div className={styles.summaryRow}>
                  <span>Saldo do Período</span>
                  <span className={monthDetails.balance >= 0 ? styles.plus : styles.minus}>
                    {formatMoney(monthDetails.balance)}
                  </span>
                </div>
              </div>
            )}

            {!activeMonth && (
              <p className={styles.helperText}>* Clique em um ponto do gráfico para ver o extrato do mês.</p>
            )}

            <div className={styles.paymentForm}>
              <h4>📥 Registrar Recebimento Avulso (Pagar Tudo)</h4>
              <div className={styles.formInputs}>
                <input
                  type="text"
                  placeholder="Valor R$"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                />
                <input 
                  type="date"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                />
                <select value={selectedAcc} onChange={(e) => setSelectedAcc(e.target.value)}>
                  {accounts.map((acc: any) => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
                </select>
                <button onClick={requestPayment} disabled={isPending}>
                  {isPending ? "..." : "Confirmar"}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      <ConfirmModal 
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        description={confirmModal.description}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />

      {transactionToPay && (
        <div 
          style={{
            position: 'fixed', top:0, left:0, right:0, bottom:0,
            background: 'rgba(0,0,0,0.6)', zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
          onClick={() => setTransactionToPay(null)}
        >
          <div 
            style={{
              background: 'var(--card-bg)', padding: '24px', borderRadius: '12px',
              width: '90%', maxWidth: '400px', border: '1px solid var(--border-color)',
              boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{marginTop:0, fontSize:'1.1rem'}}>Confirmar Reembolso</h3>
            <p style={{color:'var(--text-secondary)', marginBottom:'20px'}}>
              Item: <strong>{transactionToPay.description}</strong><br/>
              Valor: <strong style={{color:'#10b981'}}>{formatMoney(Math.abs(transactionToPay.amount))}</strong>
            </p>

            <div style={{marginBottom:'15px'}}>
              <label style={{display:'block', fontSize:'0.85rem', marginBottom:'5px', color:'gray'}}>Recebido em qual conta?</label>
              <select 
                value={quickPayAccount} 
                onChange={(e) => setQuickPayAccount(e.target.value)}
                style={{
                  width: '100%', padding: '10px', borderRadius: '8px', 
                  border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)'
                }}
              >
                {accounts.map((acc: any) => (
                  <option key={acc.id} value={acc.id}>{acc.name}</option>
                ))}
              </select>
            </div>

            <div style={{marginBottom:'20px'}}>
              <label style={{display:'block', fontSize:'0.85rem', marginBottom:'5px', color:'gray'}}>Data do Pagamento</label>
              <input 
                type="date" 
                value={quickPayDate} 
                onChange={(e) => setQuickPayDate(e.target.value)}
                style={{
                  width: '100%', padding: '10px', borderRadius: '8px', 
                  border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)'
                }}
              />
            </div>

            <div style={{display:'flex', gap:'10px'}}>
              <button 
                onClick={() => setTransactionToPay(null)}
                style={{
                  flex: 1, padding: '12px', border: '1px solid var(--border-color)', 
                  background: 'transparent', color: 'var(--text-secondary)', borderRadius: '8px', cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button 
                onClick={executeQuickPay}
                disabled={isPending}
                style={{
                  flex: 1, padding: '12px', border: 'none', 
                  background: '#10b981', color: 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold'
                }}
              >
                {isPending ? "..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}