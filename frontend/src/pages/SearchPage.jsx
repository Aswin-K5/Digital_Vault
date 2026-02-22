import { useState } from 'react'
import { Search, BookOpen, FileText, Sparkles, Clock, Zap, Brain } from 'lucide-react'
import { SearchAPI } from '../utils/api'
import toast from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'

function safeTimeAgo(dateStr) {
    try {
        if (!dateStr) return ''
        const d = new Date(dateStr.endsWith('Z') ? dateStr : dateStr + 'Z')
        if (isNaN(d.getTime())) return ''
        return formatDistanceToNow(d, { addSuffix: true })
    } catch { return '' }
}

const EXAMPLES = ['Machine learning', 'React', 'Python', 'Investment']

function SimilarityBar({ score }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <div style={{ width: 60, height: 4, borderRadius: 4, background: 'var(--border)', overflow: 'hidden' }}>
                <div style={{
                    height: '100%', borderRadius: 4,
                    width: `${Math.round(score * 100)}%`,
                    background: 'linear-gradient(90deg, #a78bfa, #6ee7f7)',
                }} />
            </div>
            <span style={{ fontSize: 11, color: 'var(--text-dim)', minWidth: 28 }}>
                {Math.round(score * 100)}%
            </span>
        </div>
    )
}

export default function SearchPage() {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState(null)
    const [loading, setLoading] = useState(false)
    const [aiBoost, setAiBoost] = useState(false)

    const handleSearch = async (q = query) => {
        if (!q.trim()) return
        setLoading(true)
        try {
            const { data } = await SearchAPI.search(q.trim(), true, true, aiBoost)
            setResults(data)
        } catch {
            toast.error('Search failed')
        } finally { setLoading(false) }
    }

    return (
        <div className="animate-in" style={{ maxWidth: '100%', overflow: 'hidden' }}>
            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <Zap size={14} color="var(--accent)" />
                    <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent)' }}>
                        Smart Search
                    </span>
                </div>
                <h1>Smart Search</h1>
                <p>Search across all your notes and documents instantly</p>
            </div>

            {/* Search box */}
            <div style={{
                borderRadius: 16, padding: '20px 22px', marginBottom: 28,
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
            }}>
                <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 0 }}>
                        <Search size={16} style={{
                            position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                            color: 'var(--text-dim)', pointerEvents: 'none',
                        }} />
                        <input
                            className="input"
                            placeholder="Search your vault…"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSearch()}
                            style={{ paddingLeft: 44, height: 48, fontSize: 14, background: 'var(--bg-card)' }}
                        />
                    </div>
                    <button
                        className="btn btn-primary"
                        onClick={() => handleSearch()}
                        disabled={loading || !query.trim()}
                        style={{ height: 48, padding: '0 24px', fontSize: 14, flexShrink: 0 }}
                    >
                        {loading
                            ? <span className="spinner" style={{ width: 16, height: 16, borderTopColor: '#080c14' }} />
                            : <><Search size={14} /><span>Search</span></>}
                    </button>
                </div>

                {/* AI Boost toggle + example chips */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                        <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>Try:</span>
                        {EXAMPLES.map(ex => (
                            <button
                                key={ex}
                                onClick={() => { setQuery(ex); handleSearch(ex) }}
                                style={{
                                    fontSize: 11, padding: '3px 10px', borderRadius: 100,
                                    background: 'var(--bg-card)', border: '1px solid var(--border)',
                                    color: 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.15s',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
                            >
                                {ex}
                            </button>
                        ))}
                    </div>

                    {/* AI Boost toggle */}
                    <button
                        onClick={() => setAiBoost(v => !v)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '5px 12px', borderRadius: 100, cursor: 'pointer',
                            fontSize: 12, fontWeight: 600, transition: 'all 0.2s',
                            background: aiBoost ? 'rgba(167,139,250,0.15)' : 'var(--bg-card)',
                            border: `1px solid ${aiBoost ? 'rgba(167,139,250,0.4)' : 'var(--border)'}`,
                            color: aiBoost ? '#a78bfa' : 'var(--text-dim)',
                        }}
                    >
                        <Brain size={12} />
                        AI Boost {aiBoost ? 'ON' : 'OFF'}
                    </button>
                </div>
            </div>

            {/* Loading */}
            {loading && (
                <div style={{ textAlign: 'center', padding: '48px 0' }}>
                    <span className="spinner" style={{ width: 28, height: 28, display: 'block', margin: '0 auto 12px' }} />
                    <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                        {aiBoost ? 'Expanding query with AI…' : 'Searching…'}
                    </p>
                </div>
            )}

            {/* Results */}
            {results && !loading && (
                <div>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
                        padding: '10px 14px', borderRadius: 10, marginBottom: 20,
                        background: 'var(--glow)', border: '1px solid var(--border)',
                    }}>
                        <Sparkles size={13} color="var(--accent)" />
                        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                            Found <strong style={{ color: 'var(--text-primary)' }}>{results.total} {results.total === 1 ? 'result' : 'results'}</strong> for{' '}
                            <strong style={{ color: 'var(--accent)' }}>"{results.query}"</strong>
                        </span>
                        {results.expanded_terms?.length > 0 && (
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginLeft: 4 }}>
                                {results.expanded_terms.slice(0, 5).map(t => (
                                    <span key={t} style={{
                                        fontSize: 10, padding: '1px 7px', borderRadius: 100,
                                        background: 'var(--glow-purple)', color: 'var(--accent-2)',
                                        border: '1px solid var(--border)',
                                    }}>{t}</span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Notes */}
                    {results.notes?.length > 0 && (
                        <div style={{ marginBottom: 28 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                                <BookOpen size={14} color="var(--accent)" />
                                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700 }}>Notes</h3>
                                <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>({results.notes.length})</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {results.notes.map(n => (
                                    <div key={n.id} className="glass" style={{ padding: '14px 18px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 10 }}>
                                            <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, flex: 1, minWidth: 0 }}>{n.title}</h4>
                                            <SimilarityBar score={n.similarity} />
                                        </div>
                                        {n.tags?.length > 0 && (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 6 }}>
                                                {n.tags.map(t => <span key={t} className="tag" style={{ fontSize: 11 }}>{t}</span>)}
                                            </div>
                                        )}
                                        <span style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-dim)' }}>
                                            <Clock size={10} />
                                            {safeTimeAgo(n.updated_at)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Documents */}
                    {results.documents?.length > 0 && (
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                                <FileText size={14} color="var(--accent-2)" />
                                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700 }}>Documents</h3>
                                <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>({results.documents.length})</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {results.documents.map(d => (
                                    <div key={d.id} className="glass" style={{ padding: '14px 18px', overflow: 'hidden' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 10 }}>
                                            <h4 style={{
                                                fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13,
                                                flex: '1 1 0%', minWidth: 0, width: 0,
                                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                            }}>{d.name}</h4>
                                            <SimilarityBar score={d.similarity} />
                                        </div>
                                        {d.summary && (
                                            <p style={{
                                                fontSize: 12, lineHeight: 1.6, color: 'var(--text-secondary)',
                                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                            }}>{d.summary}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {results.total === 0 && (
                        <div className="empty-state">
                            <Search size={36} />
                            <h3>No results found</h3>
                            <p style={{ fontSize: 13 }}>
                                {aiBoost
                                    ? 'Even with AI expansion, no matches found. Try different keywords.'
                                    : 'Try different keywords, or enable AI Boost for smarter matching.'}
                            </p>
                        </div>
                    )}
                </div>
            )}

            {!results && !loading && (
                <div className="empty-state" style={{ paddingTop: 24 }}>
                    <Search size={40} style={{ opacity: 0.2 }} />
                    <h3 style={{ color: 'var(--text-dim)', fontSize: 16 }}>Your vault awaits</h3>
                    <p style={{ fontSize: 13 }}>Search across all notes and documents instantly</p>
                </div>
            )}
        </div>
    )
}