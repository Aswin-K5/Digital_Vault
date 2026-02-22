import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, BookOpen, Lock, Pin, Trash2, X, Save, Clock, MoreVertical, Search, Type, Tag, FileText } from 'lucide-react'
import { NotesAPI } from '../utils/api'
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

/* ─── Note Modal ─────────────────────────────────── */
function NoteModal({ note, onClose, onSave }) {
    const [title, setTitle] = useState(note?.title || '')
    const [content, setContent] = useState(note?.content || '')
    const [tags, setTags] = useState(note?.tags?.join(', ') || '')
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (note?.id && !note?.content) {
            NotesAPI.getById(note.id).then(r => setContent(r.data.content || ''))
        }
    }, [note])

    const handleSave = async () => {
        if (!title.trim()) { toast.error('Title is required'); return }
        setLoading(true)
        const tagList = tags.split(',').map(t => t.trim()).filter(Boolean)
        await onSave({ title: title.trim(), content, tags: tagList })
        setLoading(false)
    }

    return createPortal(
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal-content" style={{ maxWidth: 600 }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700 }}>
                        {note?.id ? 'Edit Note' : 'New Note'}
                    </h2>
                    <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={16} /></button>
                </div>

                {/* Fields */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Title */}
                    <div>
                        <label className="field-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Type size={11} /> Title
                        </label>
                        <input
                            className="input"
                            placeholder="Note title…"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            style={{ fontSize: 16, fontFamily: 'var(--font-display)', fontWeight: 600 }}
                        />
                    </div>

                    {/* Tags */}
                    <div>
                        <label className="field-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Tag size={11} /> Tags
                        </label>
                        <input
                            className="input"
                            placeholder="react, coding, ideas (comma separated)"
                            value={tags}
                            onChange={e => setTags(e.target.value)}
                        />
                    </div>

                    {/* Content */}
                    <div>
                        <label className="field-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <FileText size={11} /> Description
                        </label>
                        <textarea
                            className="input"
                            placeholder="Write your note here…"
                            value={content}
                            onChange={e => setContent(e.target.value)}
                            style={{ minHeight: 180, lineHeight: 1.7 }}
                        />
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
                        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
                            <Save size={14} /> {loading ? 'Saving…' : 'Save Note'}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    )
}

/* ─── Note Card ──────────────────────────────────── */
function NoteCard({ note, onEdit, onDelete, onPin }) {
    const [showMenu, setShowMenu] = useState(false)

    return (
        <div
            className="glass"
            style={{
                padding: '16px 18px', cursor: 'pointer', transition: 'transform 0.2s',
                borderLeft: note.is_pinned ? '2px solid var(--accent)' : '2px solid transparent',
                position: 'relative',
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
            onClick={() => onEdit(note)}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, gap: 8 }}>
                <h3 style={{
                    fontSize: 14, fontFamily: 'var(--font-display)', fontWeight: 600,
                    flex: 1, lineHeight: 1.4, minWidth: 0,
                    overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                }}>{note.title}</h3>

                <div style={{ position: 'relative', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShowMenu(v => !v)}>
                        <MoreVertical size={14} />
                    </button>
                    {showMenu && (
                        <div style={{
                            position: 'absolute', right: 0, top: '100%', zIndex: 10,
                            borderRadius: 10, padding: 6, minWidth: 140,
                            background: 'var(--dropdown-bg)', border: '1px solid var(--border-bright)',
                            boxShadow: '0 8px 32px var(--shadow-color)',
                        }}>
                            <button
                                onClick={() => { onPin(note); setShowMenu(false) }}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                                    padding: '7px 10px', borderRadius: 6, fontSize: 13,
                                    background: 'transparent', border: 'none', cursor: 'pointer',
                                    color: 'var(--text-secondary)',
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                                <Pin size={12} /> {note.is_pinned ? 'Unpin' : 'Pin'}
                            </button>
                            <button
                                onClick={() => { onDelete(note.id); setShowMenu(false) }}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                                    padding: '7px 10px', borderRadius: 6, fontSize: 13,
                                    background: 'transparent', border: 'none', cursor: 'pointer', color: '#f87171',
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                                <Trash2 size={12} /> Delete
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {note.tags?.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                    {note.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="tag" style={{ fontSize: 11 }}>{tag}</span>
                    ))}
                    {note.tags.length > 3 && <span className="tag" style={{ fontSize: 11 }}>+{note.tags.length - 3}</span>}
                </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-dim)' }}>
                    <Clock size={10} /> {safeTimeAgo(note.updated_at)}
                </span>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', color: 'var(--text-dim)' }}>
                    {note.is_pinned && <Pin size={10} color="var(--accent)" />}
                    <Lock size={10} />
                </div>
            </div>
        </div>
    )
}

/* ─── Notes Page ─────────────────────────────────── */
export default function NotesPage() {
    const [modal, setModal] = useState(null)
    const [filter, setFilter] = useState('')
    const qc = useQueryClient()

    const { data: notes = [], isLoading } = useQuery({
        queryKey: ['notes'],
        queryFn: () => NotesAPI.getAll().then(r => r.data),
    })

    const createMutation = useMutation({
        mutationFn: data => NotesAPI.create(data),
        onSuccess: () => { qc.invalidateQueries(['notes']); qc.invalidateQueries(['dashboard-stats']); toast.success('Note created!'); setModal(null) },
    })
    const updateMutation = useMutation({
        mutationFn: ({ id, ...data }) => NotesAPI.update(id, data),
        onSuccess: () => { qc.invalidateQueries(['notes']); toast.success('Note saved!'); setModal(null) },
    })
    const deleteMutation = useMutation({
        mutationFn: id => NotesAPI.delete(id),
        onSuccess: () => { qc.invalidateQueries(['notes']); qc.invalidateQueries(['dashboard-stats']); toast.success('Note deleted') },
    })
    const pinMutation = useMutation({
        mutationFn: note => NotesAPI.update(note.id, { is_pinned: !note.is_pinned }),
        onSuccess: () => qc.invalidateQueries(['notes']),
    })

    const handleSave = async (data) => {
        if (modal?.id) await updateMutation.mutateAsync({ id: modal.id, ...data })
        else await createMutation.mutateAsync(data)
    }

    const filtered = notes.filter(n =>
        !filter || n.title.toLowerCase().includes(filter.toLowerCase()) ||
        n.tags?.some(t => t.toLowerCase().includes(filter.toLowerCase()))
    )

    return (
        <div className="animate-in" style={{ maxWidth: '100%', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, gap: 12, flexWrap: 'wrap' }}>
                <div className="page-header" style={{ marginBottom: 0 }}>
                    <h1>My Notes</h1>
                    <p>{notes.length} notes</p>
                </div>
                <button className="btn btn-primary" onClick={() => setModal('create')}>
                    <Plus size={15} /> New Note
                </button>
            </div>

            <div style={{ position: 'relative', maxWidth: 360, marginBottom: 20 }}>
                <Search size={15} style={{
                    position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                    color: 'var(--text-dim)', pointerEvents: 'none',
                }} />
                <input className="input" placeholder="Filter by title or tag…"
                    value={filter} onChange={e => setFilter(e.target.value)}
                    style={{ paddingLeft: 40 }} />
            </div>

            {isLoading ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
                    {[...Array(6)].map((_, i) => <div key={i} className="skeleton" style={{ height: 130 }} />)}
                </div>
            ) : filtered.length ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
                    {filtered.map(note => (
                        <NoteCard key={note.id} note={note} onEdit={setModal}
                            onDelete={id => deleteMutation.mutate(id)}
                            onPin={note => pinMutation.mutate(note)} />
                    ))}
                </div>
            ) : (
                <div className="empty-state">
                    <BookOpen size={48} />
                    <h3>{filter ? 'No notes match your filter' : 'No notes yet'}</h3>
                    <p style={{ fontSize: 13 }}>{filter ? 'Try a different term.' : 'Create your first encrypted note.'}</p>
                    {!filter && (
                        <button className="btn btn-primary" onClick={() => setModal('create')}>
                            <Plus size={15} /> Create First Note
                        </button>
                    )}
                </div>
            )}

            {modal && <NoteModal note={modal === 'create' ? null : modal} onClose={() => setModal(null)} onSave={handleSave} />}
        </div>
    )
}