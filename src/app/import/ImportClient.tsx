// ARQUIVO: src/app/import/ImportClient.tsx
"use client";

import { useState, useMemo, useEffect } from "react";
import {
  analyzeNubankCsvAction,
  saveImportedTransactionsAction,
} from "@/app/actions/import";
import styles from "./page.module.scss";
import { useRouter } from "next/navigation";

export function ImportClient({
  categories = [], 
  accounts = [],   
  recentTransactions = [], 
}: any) {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Iniciamos vazio e atualizamos via useEffect para garantir sincronia com os dados do servidor
  const [selectedAccount, setSelectedAccount] = useState("");

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const [relatingId, setRelatingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const router = useRouter();

  // Efeito para definir a conta padrão assim que a lista blindada chegar
  useEffect(() => {
    if (accounts.length > 0 && !selectedAccount) {
      setSelectedAccount(accounts[0].id);
    }
  }, [accounts, selectedAccount]);

  const usedCorrelatedIds = useMemo(() => {
    return new Set(
      transactions.map((t) => t.correlatedId).filter((id) => id !== null),
    );
  }, [transactions]);

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsUploading(true);
    try {
      const formData = new FormData(e.currentTarget);
      const data = await analyzeNubankCsvAction(formData);
      const dataWithIds = (data || []).map((t: any) => ({
        ...t,
        tempId: (typeof crypto !== 'undefined' && crypto.randomUUID) 
          ? crypto.randomUUID() 
          : Math.random().toString(36).substring(2, 15) + Date.now().toString(36),
      }));
      setTransactions(dataWithIds);
    } catch (error) {
      console.error("🚨 ERRO NO UPLOAD/FRONTEND:", error);
      alert("Erro ao ler o ficheiro. Veja o Console (F12).");
    } finally {
      setIsUploading(false);
    }
  }

  function handleCategorySelect(tempId: string, categoryId: string) {
    setTransactions((prev) =>
      prev.map((t) =>
        t.tempId === tempId
          ? { ...t, status: "READY", suggestedCategoryId: categoryId, learned: true }
          : t,
      ),
    );
  }

  function handleCorrelate(tempId: string, existingTransactionId: string) {
    if (!existingTransactionId) return setRelatingId(null);
    setTransactions((prev) =>
      prev.map((t) =>
        t.tempId === tempId
          ? {
              ...t,
              status: "READY",
              correlatedId: existingTransactionId,
              description: `[Mesclado] ${t.description || ""}`,
            }
          : t,
      ),
    );
    setRelatingId(null);
    setSearchTerm("");
  }

  function handleUndo(tempId: string) {
    setTransactions((prev) =>
      prev.map((t) =>
        t.tempId === tempId
          ? {
              ...t,
              status: "NEEDS_CATEGORY",
              correlatedId: null,
              suggestedCategoryId: null,
              learned: false,
              description: (t.description || "").replace("[Mesclado] ", ""),
            }
          : t,
      ),
    );
  }

  async function handleSaveToDatabase() {
    setIsSaving(true);
    const readyTransactions = transactions.filter((t) => t.status === "READY");
    try {
      const relatorio = await saveImportedTransactionsAction(readyTransactions, selectedAccount, selectedMonth);
      const mensagem = 
        `✅ Fatura importada com sucesso!\n\n` +
        `📊 Resumo do que foi salvo:\n` + 
        `🔗 Mescladas com o banco: ${relatorio.correlatedCount}\n` +
        `🛒 Novas compras (simples): ${relatorio.newSimpleCount}\n` +
        `💳 Novas compras parceladas: ${relatorio.newInstallmentsCount} série(s) gerada(s)`;
      alert(mensagem);
      router.push("/");
    } catch (error) {
      console.error("🚨 ERRO AO SALVAR:", error);
      alert("Erro ao salvar no banco de dados. Veja o Console (F12).");
    } finally {
      setIsSaving(false);
    }
  }

  const ready = transactions.filter((t) => t.status === "READY");
  const needsCat = transactions.filter((t) => t.status === "NEEDS_CATEGORY");
  const duplicates = transactions.filter((t) => t.status === "DUPLICATE");
  const ignored = transactions.filter((t) => t.status === "IGNORED");
  const totalToProcess = ready.length + needsCat.length;
  const progressPercentage =
    totalToProcess === 0
      ? 0
      : Math.round((ready.length / totalToProcess) * 100);
  
  const isFinished = needsCat.length === 0 && totalToProcess > 0;
  const progressStatusClass = isFinished ? styles.finished : styles.pending;

  const formatMoney = (val: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(Number(val) || 0);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Importação Inteligente</h1>
        <p>Organize sua fatura do Nubank de forma automatizada.</p>
      </div>

      {!transactions.length && (
        <div className={styles.uploadCard}>
          <h3>Selecione a sua Fatura</h3>
          <form onSubmit={handleUpload} className={styles.controls}>
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              required
            >
              <option value="" disabled>Selecione a Conta...</option>
              {accounts.map((acc: any) => (
                <option key={acc.id} value={acc.id}>{acc.name}</option>
              ))}
            </select>
            
            <input 
              type="month" 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(e.target.value)} 
              required 
              title="Mês de Referência da Fatura"
            />

            <input type="file" name="file" accept=".csv" required />
            
            <button type="submit" disabled={isUploading}>
              {isUploading ? "A analisar..." : "Importar e Analisar"}
            </button>
          </form>
        </div>
      )}

      {transactions.length > 0 && (
        <div className={styles.listsContainer}>
          {totalToProcess > 0 && (
            <div className={styles.progressCard}>
              <div className={styles.progressHeader}>
                <strong>Progresso de Revisão ({selectedMonth})</strong>
                <span className={`${styles.progressValue} ${progressStatusClass}`}>
                  {progressPercentage}%
                </span>
              </div>
              <div className={styles.progressBarTrack}>
                <div 
                  className={`${styles.progressBarFill} ${progressStatusClass}`} 
                  style={{ width: `${progressPercentage}%` }} 
                />
              </div>
            </div>
          )}

          {needsCat.length > 0 && (
            <div className={`${styles.listSection} ${styles.needsCategory}`}>
              <h3>⚠️ Acção Necessária ({needsCat.length})</h3>
              {needsCat.map((t) => (
                <div key={t.tempId} className={styles.transactionItem}>
                  <div className={styles.info}>
                    <span className={styles.title}>{t.description}</span>
                    <span className={styles.details}>
                      {t.originalDate}{" "}
                      {t.installment ? (
                        t.installment.current === 1 ? (
                          <span className={styles.badgeNew}>(Nova Compra Parcelada {t.installment.current}/{t.installment.total})</span>
                        ) : (
                          <span className={styles.badgeOngoing}>(Parcela em andamento: {t.installment.current}/{t.installment.total} - Relacione abaixo)</span>
                        )
                      ) : ""}
                    </span>
                  </div>

                  <div className={styles.actions}>
                    <span className={`${styles.amount} ${t.amount < 0 ? styles.out : styles.in}`}>
                      {formatMoney(t.amount)}
                    </span>

                    {relatingId === t.tempId ? (
                      <div className={styles.correlateBox}>
                        <div className={styles.searchRow}>
                          <input
                            type="text"
                            placeholder="Buscar parcela no banco..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            autoFocus
                          />
                          <button
                            onClick={() => { setRelatingId(null); setSearchTerm(""); }}
                            className={styles.cancelBtn}
                          >
                            ✕
                          </button>
                        </div>

                        <div className={styles.searchResults}>
                          {(() => {
                            const filtered = recentTransactions.filter(
                              (rt: any) => {
                                if (usedCorrelatedIds.has(rt.id)) return false;
                                const d = new Date(rt.date);
                                const rtYearMonth = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
                                
                                const prevDate = new Date(selectedMonth + "-01T12:00:00Z");
                                prevDate.setMonth(prevDate.getMonth() - 1);
                                const prevYearMonth = `${prevDate.getUTCFullYear()}-${String(prevDate.getUTCMonth() + 1).padStart(2, "0")}`;

                                const isCorrectPeriod = rtYearMonth === selectedMonth || rtYearMonth === prevYearMonth;
                                if (!isCorrectPeriod) return false;

                                const cat = categories.find((c: any) => c.id === rt.categoryId);
                                const isSpecial = !!rt.installmentId || cat?.isThirdParty === true || cat?.name === "Assinaturas";

                                if (!isSpecial) return false;
                                if (searchTerm && !(rt.description || "").toLowerCase().includes(searchTerm.toLowerCase())) return false;

                                return true;
                              },
                            );
                            if (filtered.length === 0)
                              return (
                                <div className={styles.emptySearch}>
                                  Nenhuma conta encontrada neste ciclo de fatura.
                                </div>
                              );
                            return filtered.map((rt: any) => (
                              <div
                                key={rt.id}
                                className={styles.searchItem}
                                onClick={() => handleCorrelate(t.tempId, rt.id)}
                              >
                                <span>{rt.description} <small>({new Date(rt.date).toLocaleDateString('pt-BR', {day:'2-digit', month:'short'})})</small></span>
                                <strong>{formatMoney(rt.amount)}</strong>
                              </div>
                            ));
                          })()}
                        </div>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => { setRelatingId(t.tempId); setSearchTerm(""); }}
                          className={styles.btnRelate}
                        >
                          🔗 Relacionar
                        </button>
                        <select
                          onChange={(e) => handleCategorySelect(t.tempId, e.target.value)}
                          defaultValue=""
                        >
                          <option value="" disabled>Categoria...</option>
                          {categories.map((c: any) => (
                            <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                          ))}
                        </select>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {ready.length > 0 && (
            <div className={`${styles.listSection} ${styles.ready}`}>
              <h3>✅ Prontas para Importar ({ready.length})</h3>
              {ready.map((t) => {
                const cat = categories.find((c: any) => c.id === t.suggestedCategoryId);
                return (
                  <div key={t.tempId} className={styles.transactionItem}>
                    <div className={styles.info}>
                      <span className={`${styles.title} ${t.correlatedId ? styles.mesclado : ''}`}>
                        {t.description}
                      </span>
                      <span className={styles.details}>
                        {t.originalDate} • {t.correlatedId ? "🔗 Mesclado com banco" : `${cat?.icon || "📄"} ${cat?.name || "Sem categoria"}`}
                      </span>
                    </div>
                    <div className={styles.actions}>
                      <span className={`${styles.amount} ${t.amount < 0 ? styles.out : styles.in}`}>
                        {formatMoney(t.amount)}
                      </span>
                      <button onClick={() => handleUndo(t.tempId)} className={styles.btnUndo}>
                        Desfazer
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {(duplicates.length > 0 || ignored.length > 0) && (
            <div className={`${styles.listSection} ${styles.ignored}`}>
              <h3>🗑️ Ignoradas Automaticamente ({duplicates.length + ignored.length})</h3>
              <p style={{ fontSize: "0.85rem", color: "gray", marginBottom: "1rem" }}>
                Duplicadas ou pagamentos de fatura detectados.
              </p>
              
              {duplicates.map((t) => (
                <div key={t.tempId} className={`${styles.transactionItem} ${styles.faded}`}>
                  <div className={styles.info}>
                    <span className={styles.title}>{t.description}</span>
                    <span className={styles.details}>{t.originalDate} (Duplicada)</span>
                  </div>
                  <div className={styles.actions}>
                    <span className={styles.amount}>{formatMoney(t.amount)}</span>
                  </div>
                </div>
              ))}

              {ignored.map((t) => (
                <div key={t.tempId} className={`${styles.transactionItem} ${styles.faded}`}>
                  <div className={styles.info}>
                    <span className={styles.title}>{t.description}</span>
                    <span className={styles.details}>{t.originalDate} (Ignorada)</span>
                  </div>
                  <div className={styles.actions}>
                    <span className={styles.amount}>{formatMoney(t.amount)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className={styles.finalAction}>
            <button
              onClick={handleSaveToDatabase}
              disabled={!isFinished || isSaving}
              className={styles.btnSave}
            >
              {isSaving
                ? "A guardar..."
                : isFinished
                  ? `Salvar Fatura de ${selectedMonth}`
                  : "Categorize ou Relacione tudo para salvar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}