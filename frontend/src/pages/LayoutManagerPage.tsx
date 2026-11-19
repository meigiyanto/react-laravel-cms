import { useCallback, useEffect, useState, type FormEvent } from 'react';
import axios from 'axios';
import api from '../api/client';
import AdminLayout from '../components/AdminLayout';
import type { ActiveModule } from '../components/Sidebar';

type LayoutRecord = { id: number; name: string; slug: string; description: string | null; status: string; definition: LayoutDefinition; revisions_count?: number; updated_at: string };
type LayoutDefinition = { version: 1; sections: Array<{ id: string; type: string; settings: Record<string, string>; blocks: Array<{ id: string; type: string; content: string; settings: Record<string, string> }> }> };
type Props = { onNavigate: (module: ActiveModule) => void; onLogout: () => void };
const emptyDefinition: LayoutDefinition = { version: 1, sections: [{ id: 'main-section', type: 'container', settings: { width: 'default', spacing: 'medium', background: 'default' }, blocks: [{ id: 'main-heading', type: 'heading', content: 'Judul halaman', settings: { align: 'left', size: 'large' } }] }] };
const starter = JSON.stringify(emptyDefinition, null, 2);
function errorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
        const errors = error.response?.data?.errors;
        if (errors && typeof errors === 'object') return Object.values(errors).flat().join(' ');
        return error.response?.data?.message || 'Gagal menghubungi API.';
    }
    return 'Terjadi kesalahan yang tidak diketahui.';
}
export default function LayoutManagerPage({ onNavigate, onLogout }: Props) {
    const [layouts, setLayouts] = useState<LayoutRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState<LayoutRecord | null>(null);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [definitionText, setDefinitionText] = useState(starter);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [revisions, setRevisions] = useState<Array<{ id: number; revision_number: number; created_at: string; user?: { name: string } }>>([]);
    const loadLayouts = useCallback(async () => {
        try {
            const response = await api.get('/admin/layouts');
            setLayouts(response.data.data.data || []);
        } catch (err) { setError(errorMessage(err)); }
        finally { setLoading(false); }
    }, []);
    useEffect(() => { void loadLayouts(); }, [loadLayouts]);
    function startCreate() {
        setEditing(null); setName(''); setDescription(''); setDefinitionText(starter); setRevisions([]); setError(''); setNotice('');
    }
    async function startEdit(layout: LayoutRecord) {
        setEditing(layout); setName(layout.name); setDescription(layout.description || '');
        setDefinitionText(JSON.stringify(layout.definition, null, 2)); setRevisions([]); setError(''); setNotice('');
        try {
            const response = await api.get('/admin/layouts/' + layout.id + '/revisions');
            setRevisions(response.data.data.data || []);
        } catch (err) { setError(errorMessage(err)); }
    }
    async function save(event: FormEvent<HTMLFormElement>) {
        event.preventDefault(); setError(''); setNotice('');
        let definition: LayoutDefinition;
        try { definition = JSON.parse(definitionText) as LayoutDefinition; }
        catch { setError('Definisi layout bukan JSON yang valid.'); return; }
        setSaving(true);
        try {
            const payload = { name: name.trim(), description: description.trim() || null, definition };
            if (editing) await api.put('/admin/layouts/' + editing.id, payload);
            else await api.post('/admin/layouts', payload);
            setNotice(editing ? 'Layout berhasil diperbarui.' : 'Layout berhasil dibuat.');
            setEditing(null); setName(''); setDescription(''); setDefinitionText(starter); setRevisions([]);
            await loadLayouts();
        } catch (err) { setError(errorMessage(err)); }
        finally { setSaving(false); }
    }
    async function remove(layout: LayoutRecord) {
        if (!window.confirm('Hapus layout "' + layout.name + '"? Riwayat revisinya juga akan dihapus.')) return;
        try { await api.delete('/admin/layouts/' + layout.id); setNotice('Layout berhasil dihapus.'); await loadLayouts(); }
        catch (err) { setError(errorMessage(err)); }
    }
    return <AdminLayout active="layouts" onNavigate={onNavigate} onLogout={onLogout} title="Layout Manager" breadcrumb="Workspace / Design / Layout Manager" actions={<button type="button" className="btn btn-primary" onClick={startCreate}>Layout Baru</button>}>
        <div className="container-fluid py-4">
            <section className="welcome-panel"><div><span className="eyebrow">LAYOUT MANAGEMENT</span><h2>Bangun struktur halaman.</h2><p>Kelola section dan block berbasis schema. Layout menyimpan struktur, sedangkan warna dan tipografi tetap dikelola Theme Manager.</p></div></section>
            {error && <div className="alert alert-danger mt-3" role="alert">{error}</div>}
            {notice && <div className="alert alert-success mt-3" role="status">{notice}</div>}
            <section className="content-panel mt-4">
                <div className="panel-heading"><div><h3>Daftar Layout</h3><p>Layout tersimpan tidak langsung mengubah halaman publik.</p></div><span className="total-badge">{layouts.length} layout</span></div>
                <div className="table-responsive"><table className="table cms-table align-middle"><thead><tr><th>Nama</th><th>Status</th><th>Revisi</th><th>Diperbarui</th><th className="text-end">Aksi</th></tr></thead><tbody>
                    {loading ? <tr><td colSpan={5} className="empty-state">Memuat layout...</td></tr> : layouts.length === 0 ? <tr><td colSpan={5} className="empty-state">Belum ada layout. Buat layout pertama untuk memulai.</td></tr> : layouts.map((layout) => <tr key={layout.id}><td><strong>{layout.name}</strong><div className="post-slug">{layout.slug}</div></td><td><span className={'status-badge ' + layout.status}>{layout.status}</span></td><td>{layout.revisions_count ?? 0}</td><td>{new Date(layout.updated_at).toLocaleDateString('id-ID')}</td><td><div className="d-flex justify-content-end gap-2"><button className="btn btn-sm btn-outline-primary" type="button" onClick={() => void startEdit(layout)}>Edit</button><button className="btn btn-sm btn-outline-danger" type="button" onClick={() => void remove(layout)}>Hapus</button></div></td></tr>)}
                </tbody></table></div>
            </section>
            {(name || editing) && <section className="content-panel mt-4"><div className="modal-heading"><div><h3>{editing ? 'Edit Layout' : 'Layout Baru'}</h3><p>Gunakan komponen dan pengaturan yang sudah diizinkan schema.</p></div><button type="button" className="btn-close" aria-label="Tutup editor" onClick={startCreate} /></div>
                <form className="p-4" onSubmit={save}>
                    <div className="mb-3"><label className="form-label" htmlFor="layout-name">Nama layout</label><input id="layout-name" className="form-control" required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} /></div>
                    <div className="mb-3"><label className="form-label" htmlFor="layout-description">Deskripsi</label><textarea id="layout-description" className="form-control" rows={2} maxLength={2000} value={description} onChange={(event) => setDescription(event.target.value)} /></div>
                    <div className="mb-3"><label className="form-label" htmlFor="layout-definition">Layout definition (JSON)</label><textarea id="layout-definition" className="form-control font-monospace" rows={18} spellCheck={false} value={definitionText} onChange={(event) => setDefinitionText(event.target.value)} /><div className="form-text">Schema v1: sections dan blocks. HTML, CSS, JavaScript, dan komponen bebas tidak diperbolehkan.</div></div>
                    <div className="d-flex justify-content-end gap-2"><button type="button" className="btn btn-light" onClick={() => { setEditing(null); setName(''); }}>Batal</button><button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan Layout'}</button></div>
                </form>
                {editing && <div className="px-4 pb-4"><h4 className="h6">Riwayat revisi</h4>{revisions.length === 0 ? <p className="text-secondary">Belum ada revisi.</p> : <ul className="list-group">{revisions.map((revision) => <li className="list-group-item d-flex justify-content-between" key={revision.id}><span>Revisi #{revision.revision_number} · {revision.user?.name || 'Pengguna tidak tersedia'}</span><small>{new Date(revision.created_at).toLocaleString('id-ID')}</small></li>)}</ul>}</div>}
            </section>}
        </div>
    </AdminLayout>;
}
