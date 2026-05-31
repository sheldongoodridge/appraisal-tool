import { useState, useEffect } from 'react';
import { getResponses, createResponse, updateResponse, deleteResponse, recordResponseUse } from '../services/api';

const CATEGORIES = [
  { value: 'scope',         label: 'Scope of Work' },
  { value: 'market',        label: 'Market Conditions' },
  { value: 'limiting',      label: 'Limiting Conditions' },
  { value: 'neighbourhood', label: 'Neighbourhood' },
  { value: 'other',         label: 'Other' },
];

const EMPTY_FORM = { category: 'scope', title: '', content: '', tags: '' };

export default function ResponseLibrary({ onClose }) {
  const [responses, setResponses]           = useState([]);
  const [filtered, setFiltered]             = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [search, setSearch]                 = useState('');
  const [showForm, setShowForm]             = useState(false);
  const [editing, setEditing]               = useState(null);
  const [form, setForm]                     = useState(EMPTY_FORM);
  const [saving, setSaving]                 = useState(false);
  const [copied, setCopied]                 = useState(null);

  useEffect(() => { load(); }, []);

  useEffect(() => {
    let list = responses;
    if (activeCategory !== 'all') list = list.filter(r => r.category === activeCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        r.title.toLowerCase().includes(q) ||
        r.content.toLowerCase().includes(q) ||
        (r.tags || []).some(t => t.toLowerCase().includes(q))
      );
    }
    setFiltered(list);
  }, [responses, activeCategory, search]);

  const load = async () => {
    try {
      const data = await getResponses();
      setResponses(data);
    } catch { /* silent */ }
  };

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (r) => {
    setEditing(r.id);
    setForm({ category: r.category, title: r.title, content: r.content, tags: (r.tags || []).join(', ') });
    setShowForm(true);
  };

  const saveForm = async () => {
    if (!form.title.trim() || !form.content.trim()) return;
    setSaving(true);
    const payload = {
      ...form,
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
    };
    try {
      if (editing) {
        const updated = await updateResponse(editing, payload);
        setResponses(prev => prev.map(r => r.id === editing ? updated : r));
      } else {
        const created = await createResponse(payload);
        setResponses(prev => [created, ...prev]);
      }
      setShowForm(false);
      setEditing(null);
    } catch { /* silent */ }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this response?')) return;
    try {
      await deleteResponse(id);
      setResponses(prev => prev.filter(r => r.id !== id));
    } catch { /* silent */ }
  };

  const handleInsert = async (r) => {
    try {
      await navigator.clipboard.writeText(r.content);
      setCopied(r.id);
      setTimeout(() => setCopied(null), 2000);
      recordResponseUse(r.id).then(() =>
        setResponses(prev => prev.map(x => x.id === r.id ? { ...x, use_count: (x.use_count || 0) + 1 } : x))
      );
    } catch { /* clipboard denied */ }
  };

  const categoryLabel = (val) => CATEGORIES.find(c => c.value === val)?.label || val;

  return (
    <div className="response-library">
      <div className="library-header">
        <h2>Response Library</h2>
        <div className="library-header-actions">
          <button className="btn btn-primary btn-small" onClick={openNew}>+ New Response</button>
          <button className="btn btn-small" onClick={onClose}>← Back to Inspections</button>
        </div>
      </div>

      <div className="library-toolbar">
        <div className="category-tabs">
          <button
            className={`cat-tab ${activeCategory === 'all' ? 'active' : ''}`}
            onClick={() => setActiveCategory('all')}
          >
            All
          </button>
          {CATEGORIES.map(c => (
            <button
              key={c.value}
              className={`cat-tab ${activeCategory === c.value ? 'active' : ''}`}
              onClick={() => setActiveCategory(c.value)}
            >
              {c.label}
            </button>
          ))}
        </div>
        <input
          className="library-search"
          type="text"
          placeholder="Search responses..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {showForm && (
        <div className="response-form-card">
          <h3>{editing ? 'Edit Response' : 'New Response'}</h3>
          <div className="form-row">
            <select
              value={form.category}
              onChange={e => setForm({ ...form, category: e.target.value })}
            >
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <input
              type="text"
              placeholder="Title"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <textarea
            placeholder="Response text..."
            value={form.content}
            onChange={e => setForm({ ...form, content: e.target.value })}
            rows={6}
          />
          <input
            type="text"
            placeholder="Tags (comma separated)"
            value={form.tags}
            onChange={e => setForm({ ...form, tags: e.target.value })}
          />
          <div className="form-actions">
            <button className="btn btn-primary btn-small" onClick={saveForm} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button className="btn btn-small" onClick={() => { setShowForm(false); setEditing(null); }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="response-list">
        {filtered.length === 0 && (
          <p className="empty-state">
            {search ? 'No responses match your search.' : 'No responses yet. Add your first one above.'}
          </p>
        )}
        {filtered.map(r => (
          <div key={r.id} className="response-card">
            <div className="response-card-header">
              <div className="response-card-title">
                <span className="response-category-badge">{categoryLabel(r.category)}</span>
                <strong className="response-title">{r.title}</strong>
              </div>
              <div className="response-card-actions">
                <span className="use-count">{r.use_count || 0} uses</span>
                <button className="btn btn-primary btn-small" onClick={() => handleInsert(r)}>
                  {copied === r.id ? '✓ Copied' : 'Insert'}
                </button>
                <button className="btn btn-small" onClick={() => openEdit(r)}>Edit</button>
                <button className="btn btn-small btn-danger" onClick={() => handleDelete(r.id)}>Delete</button>
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
    </div>
  );
}
