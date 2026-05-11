// === ARQUIVO: src/app/login/page.tsx ===
"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    // O NextAuth tenta fazer o login por debaixo dos panos
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("E-mail ou senha incorretos.");
      setIsLoading(false);
    } else {
      router.push("/"); // Login deu certo, joga pro Dashboard!
      router.refresh();
    }
  }

  return (
    <div style={{ minHeight: "100vh", width: "100vw", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "var(--background)", position: "fixed", top: 0, left: 0, zIndex: 9999 }}>
      <div style={{ maxWidth: "400px", width: "90%", padding: "40px", backgroundColor: "var(--card-bg)", borderRadius: "12px", border: "1px solid var(--border-color)", boxShadow: "0 10px 25px rgba(0,0,0,0.2)" }}>
        <h1 style={{ textAlign: "center", marginBottom: "8px", color: "var(--text-primary)" }}>FinControl</h1>
        <p style={{ textAlign: "center", color: "var(--text-secondary)", marginBottom: "32px", fontSize: "0.9rem" }}>Acesse sua conta para continuar.</p>

        {error && <div style={{ backgroundColor: "#ef444420", color: "#ef4444", padding: "12px", borderRadius: "8px", marginBottom: "20px", textAlign: "center", fontSize: "0.9rem", fontWeight: "bold" }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label style={{ fontSize: "0.9rem", color: "var(--text-secondary)", fontWeight: "bold" }}>E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="bernardo@fincontrol.com"
              required
              style={{ padding: "12px", borderRadius: "8px", border: "1px solid var(--border-color)", backgroundColor: "var(--background)", color: "var(--text-primary)" }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label style={{ fontSize: "0.9rem", color: "var(--text-secondary)", fontWeight: "bold" }}>Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
              required
              style={{ padding: "12px", borderRadius: "8px", border: "1px solid var(--border-color)", backgroundColor: "var(--background)", color: "var(--text-primary)" }}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{ marginTop: "16px", padding: "14px", borderRadius: "8px", border: "none", backgroundColor: "#3b82f6", color: "white", fontWeight: "bold", cursor: "pointer", transition: "opacity 0.2s", opacity: isLoading ? 0.7 : 1 }}
          >
            {isLoading ? "Verificando..." : "Entrar no Sistema"}
          </button>
        </form>
      </div>
    </div>
  );
}