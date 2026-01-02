"use client";

import { useState, useMemo, useEffect } from "react";
import { Modal } from "@/components/Modal";
import { DebtChart } from "./DebtChart";
import { LiquidateButton } from "@/components/LiquidateButton";
import { 
  liquidatePartialDebt, 
  liquidateSpecificTransaction,
  undoReimbursementAction 
} from "@/app/actions/receivables";
import styles from "./page.module.scss";

export function ReceivablesClient({ data, accounts }: any) {
  const [selectedPerson, setSelectedPerson] = useState<any>(null);
  const [activeMonth, setActiveMonth] = useState<string | null>(null);

  // Estados para o Formulário de Recebimento
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]); // Data de HOJE como padrão
  const [selectedAcc, setSelectedAcc] = useState(accounts[0]?.id || "");
  const [isPending, setIsPending] = useState(false);

  const formatMoney = (val: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val);

  // LÓGICA DE FILTRAGEM (MEMOIZADA)
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

  // AUTO-SUGESTÃO DE VALOR
  useEffect(() => {
    if (monthDetails && monthDetails.balance < 0) {
      const suggestedValue = Math.abs(monthDetails.balance).toFixed(2).replace(".", ",");
      setPayAmount(suggestedValue);
    } else if (selectedPerson && !activeMonth) {
      const totalValue = selectedPerson.totalAccumulated.toFixed(2).replace(".", ",");
      setPayAmount(totalValue);
    }
  }, [monthDetails, selectedPerson, activeMonth]);

  // FUNÇÃO PARA O BOTÃO DE RAIO (⚡) - LIQUIDAÇÃO ESPECÍFICA
  async function handleQuickPay(t: any) {
    const confirmPay = confirm(
      `Deseja registrar o reembolso de ${formatMoney(Math.abs(t.amount))} referente a "${t.description}"?`
    );

    if (!confirmPay) return;

    setIsPending(true);
    try {
      await liquidateSpecificTransaction(
        t.id, 
        selectedAcc, 
        Math.abs(t.amount), 
        t.description,
        payDate // Agora envia a data selecionada no formulário
      );
      alert("Reembolso registrado!");
    } catch (error) {
      alert("Erro ao processar o reembolso.");
    } finally {
      setIsPending(false);
    }
  }

  // NOVA FUNÇÃO: PARA DESFAZER O REEMBOLSO CLICANDO NO ✅
  async function handleUndo(t: any) {
    if (!confirm(`Deseja marcar "${t.description}" como NÃO reembolsada?`)) return;

    setIsPending(true);
    try {
      await undoReimbursementAction(t.id);
    } catch (error) {
      alert("Erro ao desfazer status.");
    } finally {
      setIsPending(false);
    }
  }

  // FUNÇÃO PARA O FORMULÁRIO (PAGAMENTO PARCIAL / GERAL)
  async function handlePayment() {
    if (!payAmount || !selectedAcc || !selectedPerson) {
      alert("Preencha o valor e selecione uma conta.");
      return;
    }

    setIsPending(true);
    try {
      await liquidatePartialDebt({
        categoryId: selectedPerson.id,
        accountId: selectedAcc,
        amount: parseFloat(payAmount.replace(",", ".")),
        description: `Reembolso: ${selectedPerson.name}`,
        // Note: Se quiser passar a data aqui também, precisará ajustar a action liquidatePartialDebt
      });

      setPayAmount("");
      alert("Pagamento registrado com sucesso!");
    } catch (error) {
      console.error(error);
      alert("Erro ao registrar pagamento.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <>
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
              <span>Dívida de Dezembro</span>
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
              <h4>Movimentações de Dezembro</h4>
              {person.currentMonthTransactions.map((t: any) => (
                <div key={t.id} className={styles.historyItem}>
                  <span>{new Date(t.date).toLocaleDateString("pt-BR")}</span>
                  <span className={t.amount > 0 ? styles.in : styles.out}>
                    {formatMoney(Math.abs(t.amount))}
                  </span>
                </div>
              ))}
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
                        <span className={styles.plus}>+ {formatMoney(t.amount)}</span>
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
                            <span 
                              className={styles.checkIcon} 
                              title="Clique para desfazer reembolso"
                              onClick={() => handleUndo(t)}
                              style={{ cursor: 'pointer' }}
                            > ✅</span>
                          ) : (
                            <button
                              className={styles.quickPayBtn}
                              onClick={() => handleQuickPay(t)}
                              title="Registrar reembolso total desta despesa"
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
              <h4>📥 Registrar Recebimento</h4>
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
                <button onClick={handlePayment} disabled={isPending}>
                  {isPending ? "..." : "Confirmar Pix"}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}