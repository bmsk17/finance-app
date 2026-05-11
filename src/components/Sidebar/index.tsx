// ARQUIVO: src/components/Sidebar/index.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from 'next-themes' 
import { useEffect, useState } from 'react'
import { signOut } from 'next-auth/react' // <-- Importamos a função de Deslogar
import styles from './styles.module.scss'

// Avisamos a Sidebar que ela agora recebe o nome do usuário
interface SidebarProps {
  userName?: string;
}

export function Sidebar({ userName = 'Usuário' }: SidebarProps) {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const mainItems = [
    { name: 'Dashboard', path: '/', icon: '⊞' },
    { name: 'Minhas Contas', path: '/accounts', icon: '💳' },
  ]

  const manageItems = [
    { name: 'Nova Transação', path: '/transactions/new', icon: '⚡' },
    { name: 'Transferência', path: '/transfers/new', icon: '💸' },
    { name: 'Categorias', path: '/categories', icon: '🏷️' },
    { name: 'Despesas Fixas', path: '/recurring', icon: '🔄' },
    { name: 'Simulador', path: '/projections', icon: '🔮' },
    { name: 'Cobranças', path: '/receivables', icon: '👤' },
  ]

  const renderLink = (item: any) => {
    const isActive = pathname === item.path
    return (
      <Link key={item.path} href={item.path} className={`${styles.link} ${isActive ? styles.active : ''}`}>
        <span>{item.icon}</span>
        {item.name}
      </Link>
    )
  }

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  if (pathname === '/login') return null; 

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logoHeader}>
        <div className={styles.logoIcon}>F</div>
        <span>FinControl</span>
      </div>

      <div className={styles.workspaceCard}>
        <div style={{width: 32, height: 32, borderRadius: '50%', background: '#cbd5e1', display:'flex', alignItems:'center', justifyContent:'center'}}>👤</div>
        <div className={styles.info}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Bem-vindo(a) </span>
          {/* Aqui está a mágica: O nome agora é dinâmico! */}
          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>{userName}</span>
        </div>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
        {mainItems.map(item => renderLink(item))}
        
        <div className={styles.sectionTitle} style={{ marginTop: 20 }}>MENU</div>
        {manageItems.map(item => renderLink(item))}
      </nav>

      <div className={styles.footer}>
        {mounted && (
          <button onClick={toggleTheme} className={styles.themeToggle}>
            {theme === 'dark' ? '☀️ Modo Claro' : '🌙 Modo Escuro'}
          </button>
        )}

        <Link href="/settings" className={styles.link}>
          <span>⚙️</span> Configurações
        </Link>

        {/* Botão mágico de Logout */}
        <button 
          onClick={() => signOut({ callbackUrl: '/login' })} 
          className={styles.link} 
          style={{ background: 'transparent', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', marginTop: '8px' }}
        >
          <span>🚪</span> Sair
        </button>
      </div>
    </aside>
  )
}