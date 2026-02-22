import { useQuery } from '@tanstack/react-query'
import { BookOpen, FileText, Cpu, HardDrive, Tag, Clock, Zap, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { StatsAPI } from '../utils/api'
import useAuthStore from '../store/authStore'

function safeTimeAgo(dateStr) {
    try {
        if (!dateStr) return ''
        const d = new Date(dateStr.endsWith('Z') ? dateStr : dateStr + 'Z')
        if (isNaN(d.getTime())) return ''
        return formatDistanceToNow(d, { addSuffix: true })
    } catch { return '' }
}

const STAT_COLORS = {
    accent: { bg: 'var(--glow)', border: 'var(--border)', icon: 'var(--accent)' },
    purple: { bg: 'var(--glow-purple)', border: 'var(--border)', icon: 'var(--accent-2)' },
    green: { bg: 'rgba(4,120,87,0.1)', border: 'rgba(4,120,87,0.2)', icon: 'var(--accent-3)' },
    orange: { bg: 'rgba(194,65,12,0.1)', border: 'rgba(194,65,12,0.2)', icon: 'var(--accent-warm)' },
}

function StatCard({ icon: Icon, value, label, colorKey = 'accent', sublabel }) {
    const c = STAT_COLORS[colorKey] || STAT_COLORS.accent
    return (
        <div className="glass" style={{ padding: 20, transition: 'transform 0.2s', cursor: 'default' }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
            <div style={{
                width: 36, height: 36, borderRadius: 10, display: 'flex',
                alignItems: 'center', justifyContent: 'center', marginBottom: 14,
                background: c.bg, border: `1px solid ${c.border}`,
            }}>
                <Icon size={17} color={c.icon} />
            </div>
            <div style={{ fontSize: 28, fontFamily: 'var(--font-display)', fontWeight: 800, marginBottom: 2 }}>
                {value}
            </div>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>{label}</div>
            {sublabel && <div style={{ fontSize: 11, marginTop: 4, color: 'var(--text-dim)' }}>{sublabel}</div>}
        </div>
    )
}

/* ─── Custom Tooltip ──────────────────────────────── */
function ChartTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null
    return (
        <div style={{
            background: 'var(--modal-bg)', border: '1px solid var(--border-bright)',
            borderRadius: 10, padding: '10px 14px', fontSize: 12,
            boxShadow: '0 4px 16px var(--shadow-color)',
        }}>
            <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--text-primary)' }}>{label}</div>
            {payload.map(p => (
                <div key={p.dataKey} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: p.fill }} />
                    <span style={{ color: 'var(--text-secondary)' }}>
                        {p.dataKey === 'notes' ? 'Notes' : 'Documents'}: <strong style={{ color: 'var(--text-primary)' }}>{p.value}</strong>
                    </span>
                </div>
            ))}
        </div>
    )
}

/* ─── Activity Chart ──────────────────────────────── */
function ActivityChart({ data }) {
    const hasData = data?.some(d => d.notes > 0 || d.documents > 0)

    return (
        <div className="glass" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h3 style={{
                    fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700,
                    display: 'flex', alignItems: 'center', gap: 8,
                }}>
                    <TrendingUp size={14} color="var(--accent)" /> Weekly Activity
                </h3>
                <div style={{ display: 'flex', gap: 14, fontSize: 11, color: 'var(--text-dim)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 2, background: '#0e7490' }} /> Notes
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 2, background: '#7c3aed' }} /> Docs
                    </span>
                </div>
            </div>

            {hasData ? (
                <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={data} barGap={4}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                        <XAxis
                            dataKey="week" axisLine={false} tickLine={false}
                            tick={{ fontSize: 11, fill: 'var(--text-dim)' }}
                        />
                        <YAxis
                            axisLine={false} tickLine={false} allowDecimals={false}
                            tick={{ fontSize: 11, fill: 'var(--text-dim)' }}
                            width={24}
                        />
                        <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--bg-card)' }} />
                        <Bar dataKey="notes" fill="#0e7490" radius={[4, 4, 0, 0]} maxBarSize={28} />
                        <Bar dataKey="documents" fill="#7c3aed" radius={[4, 4, 0, 0]} maxBarSize={28} />
                    </BarChart>
                </ResponsiveContainer>
            ) : (
                <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-dim)', fontSize: 13 }}>
                    No activity yet. Create notes and upload documents to see your chart.
                </div>
            )}
        </div>
    )
}

export default function DashboardPage() {
    const { user } = useAuthStore()

    const { data: stats, isLoading } = useQuery({
        queryKey: ['dashboard-stats'],
        queryFn: () => StatsAPI.getStats().then(r => r.data),
    })

    const greeting = () => {
        const h = new Date().getHours()
        if (h < 12) return 'Good morning'
        if (h < 18) return 'Good afternoon'
        return 'Good evening'
    }

    return (
        <div className="animate-in" style={{ maxWidth: '100%', overflow: 'hidden' }}>

            {/* Header */}
            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <Zap size={14} color="var(--accent)" />
                    <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent)' }}>
                        Dashboard
                    </span>
                </div>
                <h1>{greeting()}, {user?.name?.split(' ')[0]} 👋</h1>
                <p>Your knowledge vault is secure and ready.</p>
            </div>

            {/* Stat Cards */}
            {isLoading ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16, marginBottom: 28 }}>
                    {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 130 }} />)}
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16, marginBottom: 28 }}>
                    <StatCard icon={BookOpen} value={stats?.total_notes ?? 0} label="Total Notes" colorKey="accent" />
                    <StatCard icon={FileText} value={stats?.total_documents ?? 0} label="Documents" colorKey="purple" />
                    <StatCard icon={Cpu} value={stats?.ai_summaries ?? 0} label="AI Summaries" colorKey="green" />
                    <StatCard icon={HardDrive} value={`${stats?.storage_mb ?? 0} MB`} label="Storage Used" colorKey="orange" sublabel="Documents only" />
                </div>
            )}

            {/* Activity Chart */}
            {isLoading ? (
                <div className="skeleton" style={{ height: 260, marginBottom: 28 }} />
            ) : (
                <div style={{ marginBottom: 28 }}>
                    <ActivityChart data={stats?.weekly_activity} />
                </div>
            )}

            {/* Bottom layout */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>

                {/* Recent Notes */}
                <div className="glass" style={{ padding: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700 }}>Recent Notes</h3>
                        <Link to="/notes" className="btn btn-ghost btn-sm">View all</Link>
                    </div>

                    {isLoading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 40 }} />)}
                        </div>
                    ) : stats?.recent_notes?.length ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {stats.recent_notes.map(note => (
                                <Link key={note.id} to="/notes" style={{
                                    display: 'flex', alignItems: 'center', gap: 12,
                                    padding: '8px 12px', borderRadius: 10,
                                    textDecoration: 'none', color: 'var(--text-primary)',
                                    transition: 'background 0.15s',
                                }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                    <BookOpen size={14} color="var(--accent)" style={{ flexShrink: 0 }} />
                                    <span style={{
                                        flex: 1, fontSize: 13, minWidth: 0,
                                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                    }}>
                                        {note.title}
                                    </span>
                                    <span style={{ fontSize: 11, flexShrink: 0, color: 'var(--text-dim)' }}>
                                        {safeTimeAgo(note.updated_at)}
                                    </span>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <p style={{ fontSize: 13, textAlign: 'center', padding: '20px 0', color: 'var(--text-dim)' }}>
                            No notes yet.{' '}
                            <Link to="/notes" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Create one</Link>
                        </p>
                    )}
                </div>

                {/* Right column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                    {/* Top Tags */}
                    <div className="glass" style={{ padding: 20 }}>
                        <h3 style={{
                            fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700,
                            marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8,
                        }}>
                            <Tag size={14} color="var(--accent)" /> Top Tags
                        </h3>
                        {stats?.top_tags?.length ? (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                {stats.top_tags.map(({ tag, count }) => (
                                    <span key={tag} className="tag" style={{ cursor: 'default' }}>
                                        {tag} <span style={{ opacity: 0.5 }}>({count})</span>
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>Add tags to your notes to see them here.</p>
                        )}
                    </div>

                    {/* Recent Documents */}
                    <div className="glass" style={{ padding: 20, flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700 }}>Recent Documents</h3>
                            <Link to="/documents" className="btn btn-ghost btn-sm">View all</Link>
                        </div>
                        {stats?.recent_documents?.length ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {stats.recent_documents.map(doc => (
                                    <div key={doc.id} style={{
                                        display: 'flex', alignItems: 'center', gap: 12,
                                        padding: '8px 12px', borderRadius: 10,
                                    }}>
                                        <FileText size={14} color="var(--accent-2)" style={{ flexShrink: 0 }} />
                                        <span style={{
                                            fontSize: 13, color: 'var(--text-secondary)',
                                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                            minWidth: 0, flex: 1,
                                        }}>{doc.original_name}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>
                                <Link to="/documents" style={{ color: 'var(--accent-2)', textDecoration: 'none' }}>
                                    Upload a document
                                </Link>
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}