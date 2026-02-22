import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Zap, Eye, EyeOff, ArrowRight, Mail, Lock, User } from 'lucide-react'
import { AuthAPI } from '../utils/api'
import useAuthStore from '../store/authStore'
import useThemeStore from '../store/themeStore'
import toast from 'react-hot-toast'

export default function RegisterPage() {
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPw, setShowPw] = useState(false)
    const [loading, setLoading] = useState(false)
    const { setAuth } = useAuthStore()
    const { initTheme } = useThemeStore()
    const navigate = useNavigate()

    useEffect(() => { initTheme() }, [])

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (password.length < 8) { toast.error('Password must be at least 8 characters'); return }
        setLoading(true)
        try {
            const { data } = await AuthAPI.register({ name: name.trim(), email: email.trim(), password })
            setAuth(data.user, data.access_token)
            toast.success('Account created! Welcome to your vault.')
            navigate('/dashboard')
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Registration failed')
        } finally { setLoading(false) }
    }

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div className="animate-in" style={{ width: '100%', maxWidth: 400 }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: 36 }}>
                    <div style={{
                        width: 52, height: 52, borderRadius: 16,
                        background: 'linear-gradient(135deg, #6ee7f7, #a78bfa)',
                        boxShadow: '0 0 40px var(--glow)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 14px',
                    }}>
                        <Zap size={24} color="#080c14" strokeWidth={2.5} />
                    </div>
                    <h1 style={{ fontSize: 26, fontFamily: 'var(--font-display)', fontWeight: 800, marginBottom: 6 }}>
                        Create Your Vault
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Start organising your knowledge with AI</p>
                </div>

                {/* Card */}
                <div className="glass" style={{ padding: '28px 24px' }}>
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                        {/* Name */}
                        <div>
                            <label className="field-label">Full Name</label>
                            <div className="input-wrapper">
                                <span className="input-icon"><User size={15} /></span>
                                <input className="input" type="text" placeholder="Jane Doe"
                                    value={name} onChange={e => setName(e.target.value)}
                                    autoComplete="name" required />
                            </div>
                        </div>

                        {/* Email */}
                        <div>
                            <label className="field-label">Email Address</label>
                            <div className="input-wrapper">
                                <span className="input-icon"><Mail size={15} /></span>
                                <input className="input" type="email" placeholder="you@example.com"
                                    value={email} onChange={e => setEmail(e.target.value)}
                                    autoComplete="email" required />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="field-label">Password</label>
                            <div className="input-wrapper">
                                <span className="input-icon"><Lock size={15} /></span>
                                <input className="input"
                                    type={showPw ? 'text' : 'password'}
                                    placeholder="Min 8 characters"
                                    value={password} onChange={e => setPassword(e.target.value)}
                                    autoComplete="new-password" minLength={8}
                                    style={{ paddingRight: 44 }} required />
                                <button type="button" className="input-icon-right"
                                    onClick={() => setShowPw(v => !v)} tabIndex={-1}>
                                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <button type="submit" className="btn btn-primary" disabled={loading}
                            style={{ justifyContent: 'center', height: 46, fontSize: 14, marginTop: 4 }}>
                            {loading
                                ? <span className="spinner" style={{ width: 18, height: 18 }} />
                                : <><span>Create Account</span><ArrowRight size={16} /></>}
                        </button>
                    </form>

                    <div style={{ height: 1, background: 'var(--border)', margin: '20px 0' }} />

                    <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--text-secondary)' }}>
                        Already have an account?{' '}
                        <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
                    </p>
                </div>
            </div>
        </div>
    )
}