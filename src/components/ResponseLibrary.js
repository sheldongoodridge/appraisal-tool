import { useState, useEffect } from 'react';
import { getResponses, createResponse, updateResponse, deleteResponse, recordResponseUse } from '../services/api';

const CATEGORIES = ['General', 'Exterior', 'Interior', 'Site', 'Neighbourhood', 'Market', 'Reconciliation', 'Other'];

export default function ResponseLibrary({ onClose, userRole }) {
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({ title: '', content: '', category: 'General', tags: '' });
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(null);
  const isReadOnly = userRole === 'assistant';

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [activeCategory]);

  const load = () => {
    setLoading(true);
    getResponses(activeCategory || undefined)
      .then(setResponses)
      .finally(() => setLoading(false));
  };

  const handleSave = async () => {
    if (!draft.title.trim() || !draft.content.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        const updated = await updateResponse(editingId, draft);
        setResponses(prev => prev.map(r => r.id === editingId ? updated : r));
      } else {
        const created = await createResponse(draft);
        setResponses(prev => [created, ...prev]);
      }
      setDraft({ title: '', content: '', category: 'General', tags: '' });
      setShowForm(false); setEditingId(null);
    } catch (err) { alert(err.response?.data?.error || 'Failed to save response'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this response?')) return;
    try {
      await deleteResponse(id);
      setResponses(prev => prev.filter(r => r.id !== id));
    } catch { alert('Failed to delete response'); }
  };

  const handleCopy = async (r) => {
    await navigator.clipboard.writeText(r.content);
    setCopied(r.id);
    setTimeout(() => setCopied(null), 1800);
    try { await recordResponseUse(r.id); } catch { /* silent */ }
  };

  const startEdit = (r) => {
    setDraft({ title: r.title, content: r.content, category: r.category, tags: (r.tags || []).join(', ') });
    setEditingId(r.id); setShowForm(true);
  };

  const filtered = responses.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return r.title?.toLowerCase().includes(q) || r.content?.toLowerCase().includes(q) || (r.tags || []).some(t => t.toLowerCase().includes(q));
  });

  return (
    <div className="response-library">
      <div className="library-header">
        <h2>Response Library</h2>
        <div className="library-header-actions">
          {!isReadOnly && <button className="btn btn-primary btn-small" onClick={() => { setShowForm(s => !s); setEditingId(null); setDraft({ title: '', content: '', category: 'General', tags: '' }); }}>+ Add Response</button>}
          <button className="btn btn-small" onClick={onClose}>✕ Close</button>
        </div>
      </div>

      {showForm && (
        <div className="response-form-card">
          <h3>{editingId ? 'Edit Response' : 'New Response'}</h3>
          <select value={draft.category} onChange={e => setDraft(p => ({ ...p, category: e.target.value }))}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input type="text" placeholder="Title" value={draft.title} onChange={e => setDraft(p => ({ ...p, title: e.target.value }))} />
          <textarea rows={5} placeholder="Response text…" value={draft.content} onChange={e => setDraft(p => ({ ...p, content: e.target.value }))} />
          <input type="text" placeholder="Tags (comma-separated)" value={draft.tags} onChange={e => setDraft(p => ({ ...p, tags: e.target.value }))} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-small" onClick={handleSave} disabled={saving || !draft.title || !draft.content}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button className="btn btn-small" onClick={() => { setShowForm(false); setEditingId(null); }}>Cancel</button>
          </div>
        </div>
      )}

      <div className="library-toolbar">
        <div className="category-tabs">
          <button className={`cat-tab ${activeCategory === '' ? 'active' : ''}`} onClick={() => setActiveCategory('')}>All</button>
          {CATEGORIES.map(c => (
            <button key={c} className={`cat-tab ${activeCategory === c ? 'active' : ''}`} onClick={() => setActiveCategory(c)}>{c}</button>
          ))}
        </div>
        <input className="library-search" placeholder="Search responses…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <p style={{ color: '#6b7280', padding: '16px 0' }}>Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="empty-state">No responses found. {!isReadOnly && 'Add your first one above.'}</p>
      ) : (
        <div className="response-list">
          {filtered.map(r => (
            <div key={r.id} className="response-card">
              <div className="response-card-header">
                <div className="response-card-title">
                  <span className="response-category-badge">{r.category}</span>
                  <span className="response-title">{r.title}</span>
                </div>
                <div className="response-card-actions">
                  {r.use_count > 0 && <span className="use-count">Used {r.use_count}×</span>}
                  <button className="btn btn-small btn-xs" onClick={() => handleCopy(r)}>
                    {copied === r.id ? '✓ Copied!' : 'Copy'}
                  </button>
                  {!isReadOnly && <>
                    <button className="btn btn-small btn-xs" onClick={() => startEdit(r)}>Edit</button>
                    <button className="btn btn-small btn-xs btn-danger" onClick={() => handleDelete(r.id)}>Delete</button>
                  </>}
                </div>
              </div>
              <p className="response-content">{r.content}</p>
              {r.tags?.length > 0 && (
                <div className="response-tags">
                  {r.tags.map(t => <span key={t} className="tag">{t}</span>)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
