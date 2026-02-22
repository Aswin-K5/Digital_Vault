import { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LayoutDashboard, BookOpen, FileText, Search, LogOut, Zap, Lock, Brain, Menu, X, Sun, Moon } from 'lucide-react'
import useAuthStore from '../../store/authStore'
import useThemeStore from '../../store/themeStore'
import toast from 'react-hot-toast'

const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/notes', icon: BookOpen, label: 'My Notes' },
    { to: '/documents', icon: FileText, label: 'Documents' },
    { to: '/search', icon: Search, label: 'Smart Search' },
]

function ThemeToggle() {
    const { theme, toggleTheme } = useThemeStore()
    const isDark = theme === 'dark'
    return (
        <button
            onClick={toggleTheme}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            style={{
                width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--bg-card)', color: 'var(--text-secondary)',
                transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-card-hover)'; e.currentTarget.style.color = 'var(--accent)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-card)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
        >
            {isDark ? <Sun size={15} /> : <Moon size={15} />}
        </button>
    )
}

function SidebarContent({ user, onLogout }) {
    return (
        <>
            {/* Logo + Theme Toggle */}
            <div style={{ padding: '28px 24px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                            background: 'linear-gradient(135deg, #6ee7f7, #a78bfa)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <Zap size={18} color="#080c14" strokeWidth={2.5} />
                        </div>
                        <div>
                            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, lineHeight: 1.2 }}>
                                Knowledge
                            </div>
                            <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>
                                Vault
                            </div>
                        </div>
                    </div>
                    <ThemeToggle />
                </div>
            </div>

            {/* AI badge */}
            <div style={{ padding: '12px 16px' }}>
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 12px', borderRadius: 10,
                    background: 'var(--glow)', border: '1px solid var(--border)',
                }}>
                    <Brain size={13} color="var(--accent)" />
                    <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--accent)' }}>AI-Powered Vault</span>
                </div>
            </div>

            {/* Nav */}
            <nav style={{ flex: 1, padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                {navItems.map(({ to, icon: Icon, label }) => (
                    <NavLink
                        key={to}
                        to={to}
                        style={({ isActive }) => ({
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: '10px 12px', borderRadius: 10,
                            textDecoration: 'none', fontSize: 14, fontWeight: isActive ? 600 : 400,
                            color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                            background: isActive ? 'var(--bg-card-hover)' : 'transparent',
                            borderLeft: `2px solid ${isActive ? 'var(--accent)' : 'transparent'}`,
                            transition: 'all 0.15s',
                        })}
                    >
                        <Icon size={17} />
                        {label}
                    </NavLink>
                ))}
            </nav>

            {/* User */}
            <div style={{ padding: 16, borderTop: '1px solid var(--border)' }}>
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 12px', borderRadius: 10, marginBottom: 8,
                    background: 'var(--bg-card)',
                }}>
                    <div style={{
                        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                        background: 'linear-gradient(135deg, #a78bfa, #6ee7f7)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 700, color: '#080c14',
                    }}>
                        {user?.name?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div style={{
                            fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-display)',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                            {user?.name}
                        </div>
                    </div>
                </div>

                <button
                    className="btn btn-ghost"
                    onClick={onLogout}
                    style={{ width: '100%', justifyContent: 'center', fontSize: 13 }}
                >
                    <LogOut size={14} /> Sign Out
                </button>
            </div>
        </>
    )
}

export default function Layout() {
    const { user, logout } = useAuthStore()
    const { initTheme } = useThemeStore()
    const navigate = useNavigate()
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    useEffect(() => { initTheme() }, [])

    const handleLogout = () => {
        logout()
        toast.success('Logged out')
        navigate('/login')
    }

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            {/* Desktop Sidebar */}
            <aside className="sidebar-desktop" style={{
                width: 256, position: 'fixed', top: 0, left: 0, bottom: 0,
                display: 'flex', flexDirection: 'column', zIndex: 50,
                background: 'var(--bg-secondary)',
                borderRight: '1px solid var(--border)',
                backdropFilter: 'blur(20px)',
                transition: 'background 0.3s',
            }}>
                <SidebarContent user={user} onLogout={handleLogout} />
            </aside>

            {/* Mobile Top Bar */}
            <div className="mobile-nav" style={{
                display: 'none',
                position: 'fixed', top: 0, left: 0, right: 0, zIndex: 60,
                height: 56, padding: '0 16px',
                alignItems: 'center', justifyContent: 'space-between',
                background: 'var(--bg-secondary)',
                borderBottom: '1px solid var(--border)',
                backdropFilter: 'blur(20px)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                        width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                        background: 'linear-gradient(135deg, #6ee7f7, #a78bfa)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <Zap size={14} color="#080c14" strokeWidth={2.5} />
                    </div>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14 }}>
                        Knowledge Vault
                    </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ThemeToggle />
                    <button
                        onClick={() => setMobileMenuOpen(v => !v)}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', padding: 4 }}
                    >
                        {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
                    </button>
                </div>
            </div>

            {/* Mobile Slide Menu */}
            {mobileMenuOpen && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.5)' }}
                    onClick={() => setMobileMenuOpen(false)}>
                    <div style={{
                        position: 'absolute', top: 0, left: 0, bottom: 0, width: 280,
                        background: 'var(--bg-secondary)', borderRight: '1px solid var(--border)',
                        display: 'flex', flexDirection: 'column', animation: 'slideIn 0.2s ease',
                    }} onClick={e => e.stopPropagation()}>
                        <SidebarContent user={user} onLogout={handleLogout} />
                    </div>
                </div>
            )}

            {/* Mobile Bottom Nav */}
            <nav className="mobile-nav" style={{
                display: 'none',
                position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 60,
                height: 60, alignItems: 'center', justifyContent: 'space-around',
                background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)',
                backdropFilter: 'blur(20px)',
            }}>
                {navItems.map(({ to, icon: Icon, label }) => (
                    <NavLink key={to} to={to}
                        style={({ isActive }) => ({
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                            textDecoration: 'none', fontSize: 10, fontWeight: isActive ? 600 : 400,
                            color: isActive ? 'var(--accent)' : 'var(--text-dim)', padding: '4px 0',
                        })}>
                        <Icon size={18} />
                        <span>{label.split(' ').pop()}</span>
                    </NavLink>
                ))}
            </nav>

            {/* Main content */}
            <main className="main-content" style={{
                marginLeft: 256, flex: 1, padding: '32px 36px', minHeight: '100vh', width: '100%',
            }}>
                <Outlet />
            </main>
        </div>
    )
}