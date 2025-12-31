'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from 'next-themes' // <--- Importante
import { useEffect, useState } from 'react'
import styles from './styles.module.scss'

export function Sidebar() {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Evita erro de hidratação (renderizar ícone errado no servidor)
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

  // Função para alternar o tema
  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logoHeader}>
        <div className={styles.logoIcon}>F</div>
        <span>FinControl</span>
      </div>

      <div className={styles.workspaceCard}>
        <div style={{width: 32, height: 32, borderRadius: '50%', background: '#cbd5e1', display:'flex', alignItems:'center', justifyContent:'center'}}>👤</div>
        <div className={styles.info}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}></span>
          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>Bernardo Kanekiyo</span>
        </div>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
        {mainItems.map(item => renderLink(item))}
        
        <div className={styles.sectionTitle} style={{ marginTop: 20 }}>MENU</div>
        {manageItems.map(item => renderLink(item))}
      </nav>

      <div className={styles.footer}>
        {/* BOTÃO DE TEMA */}
        {mounted && (
          <button onClick={toggleTheme} className={styles.themeToggle}>
            {theme === 'dark' ? '☀️ Modo Claro' : '🌙 Modo Escuro'}
          </button>
        )}

        <Link href="/settings" className={styles.link}>
          <span>⚙️</span> Configurações
        </Link>
      </div>
    </aside>
  )
}