import { useCallback, useEffect, useState, type FormEvent } from 'react';
import axios from 'axios';
import api from '../api/client';
import AdminLayout from '../components/AdminLayout';
import type { ActiveModule } from '../components/Sidebar';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTags, faSearch } from '@fortawesome/free-solid-svg-icons';
import { useAuthProfile } from '../auth/AuthProfileContext';
import { canExact } from '../utils/permissions';

type Tag = { id: number; name: string; slug: string; };
type TagForm = { name: string; slug: string; };
type NavigationProps = { onNavigate: (module: ActiveModule) => void; onLogout: () => void; };
const emptyForm: TagForm = { name: '', slug: '' };

function getErrorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
        const errors = error.response?.data?.errors;
        if (errors && typeof errors === 'object') return Object.values(errors).flat().join(' ');
        return error.response?.data?.message || 'Gagal menghubungi API.';
    }
    return 'Terjadi kesalahan yang tidak diketahui.';
}

export default function TagsPage({ onNavigate, onLogout }: NavigationProps) {
    const [tags, setTags] = useState<Tag[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [editing, setEditing] = useState<Tag | null>(null);
    const [form, setForm] = useState<TagForm>(emptyForm);
    const [showForm, setShowForm] = useState(false);
    const profile = useAuthProfile();
    const canCreateTag = canExact(profile, 'tags.create');
    const canEditTag = canExact(profile, 'tags.update');
    const canDeleteTag = canExact(profile, 'tags.delete');

    const loadTags = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const response = await api.get('/tags');
            setTags(response.data.data);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        let active = true;

        api.get('/tags')
            .then((response) => {
                if (active) setTags(response.data.data);
            })
            .catch((err: unknown) => {
                if (active) setError(getErrorMessage(err));
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, []);

    const filteredTags = tags.filter((tag) =>
        [tag.name, tag.slug].some((value) => value.toLowerCase().includes(search.trim().toLowerCase()))
    );

    function openCreateForm() {
        setEditing(null);
        setForm(emptyForm);
        setError('');
        setShowForm(true);
    }

    function openEditForm(tag: Tag) {
        setEditing(tag);
        setForm({ name: tag.name, slug: tag.slug });
        setError('');
        setShowForm(true);
    }

    async function saveTag(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSaving(true);
        setError('');
        setNotice('');
        const payload = { name: form.name.trim(), slug: form.slug.trim() || null };
        try {
            if (editing) {
                await api.put(`/tags/${editing.id}`, payload);
                setNotice('Tag berhasil diperbarui.');
            } else {
                await api.post('/tags', payload);
                setNotice('Tag berhasil dibuat dan sekarang tersedia pada form Post.');
            }
            setShowForm(false);
            setEditing(null);
            setForm(emptyForm);
            await loadTags();
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setSaving(false);
        }
    }

    async function deleteTag(tag: Tag) {
        if (!window.confirm(`Hapus tag "${tag.name}"? Tag yang masih digunakan artikel tidak dapat dihapus.`)) return;
        setDeletingId(tag.id);
        setError('');
        setNotice('');
        try {
            await api.delete(`/tags/${tag.id}`);
            setNotice('Tag berhasil dihapus.');
            await loadTags();
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setDeletingId(null);
        }
    }

    return (
        <AdminLayout active="tags" onNavigate={onNavigate} onLogout={onLogout} title="Tag" breadcrumb="Workspace / Konten / Tag"
            actions={canCreateTag ? <button className="btn btn-primary" type="button" onClick={openCreateForm}>+ Tag Baru</button> : null}>
            <section className="welcome-panel">
                <div><span className="eyebrow">TAG MANAGEMENT</span><h2>Kelola tag artikel.</h2><p>Buat tag terlebih dahulu, lalu pilih tag tersebut saat membuat atau mengedit Post.</p></div>
                <div className="welcome-icon" aria-hidden="true"><FontAwesomeIcon icon={faTags} /></div>
            </section>
            {error && <div className="alert alert-danger mt-3" role="alert">{error}<button className="btn-close float-end" type="button" onClick={() => setError('')} aria-label="Tutup" /></div>}
            {notice && <div className="alert alert-success mt-3" role="status">{notice}<button className="btn-close float-end" type="button" onClick={() => setNotice('')} aria-label="Tutup" /></div>}
            <section className="content-panel mt-4">
                <div className="panel-heading"><div><h3>Daftar Tag</h3><p>Tag yang tersedia dapat digunakan pada banyak artikel.</p></div><span className="total-badge">{tags.length} tag</span></div>
                <div className="toolbar">
                    <div className="search-box"><span aria-hidden="true"><FontAwesomeIcon icon={faSearch} size="2xs" /></span>
                        <input className="form-control" type="search" placeholder="Cari nama atau slug tag..." value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Cari tag" />
                    </div>
                </div>
                <div className="table-responsive">
                    <table className="table cms-table align-middle">
                        <thead><tr><th>NAMA TAG</th><th>SLUG</th><th className="text-end">AKSI</th></tr></thead>
                        <tbody>
                            {loading ? <tr><td colSpan={3} className="empty-state">Memuat tag...</td></tr> : filteredTags.length === 0 ? (
                                <tr><td colSpan={3} className="empty-state"><div className="empty-icon"><FontAwesomeIcon icon={faTags} /></div><strong>{search ? 'Tag tidak ditemukan' : 'Belum ada tag'}</strong><p>{search ? 'Coba kata kunci lain.' : 'Buat tag pertama agar dapat dipilih pada form Post.'}</p>{!search && canCreateTag && <button className="btn btn-outline-primary btn-sm" type="button" onClick={openCreateForm}>Buat tag</button>}</td></tr>
                            ) : filteredTags.map((tag) => (
                                <tr key={tag.id}><td><div className="post-title">{tag.name}</div></td><td><span className="post-slug">/{tag.slug}</span></td>
                                    <td><div className="d-flex justify-content-end gap-2">
                                        {canEditTag && <button className="btn btn-sm btn-outline-warning" type="button" onClick={() => openEditForm(tag)} disabled={deletingId !== null}>Edit</button>}
                                        {canDeleteTag && <button className="btn btn-sm btn-outline-danger" type="button" onClick={() => void deleteTag(tag)} disabled={deletingId !== null}>{deletingId === tag.id ? 'Menghapus...' : 'Hapus'}</button>}
                                    </div></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
            {showForm && (editing ? canEditTag : canCreateTag) && (
                <div className="modal-backdrop-custom" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setShowForm(false); }}>
                    <section className="editor-modal" role="dialog" aria-modal="true" aria-labelledby="tag-editor-title">
                        <div className="modal-heading"><div><h2 id="tag-editor-title">{editing ? 'Edit Tag' : 'Buat Tag Baru'}</h2><p>Nama tag wajib diisi. Slug dibuat otomatis jika dikosongkan.</p></div><button className="btn-close" type="button" aria-label="Tutup" disabled={saving} onClick={() => setShowForm(false)} /></div>
                        <form onSubmit={saveTag}>
                            <div className="mb-3"><label className="form-label" htmlFor="tag-name">Nama tag *</label><input id="tag-name" className="form-control" required maxLength={150} autoFocus value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></div>
                            <div className="mb-4"><label className="form-label" htmlFor="tag-slug">Slug (opsional)</label><input id="tag-slug" className="form-control" maxLength={180} placeholder="Dibuat otomatis jika kosong" value={form.slug} onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))} /></div>
                            <div className="modal-actions"><button type="button" className="btn btn-light" disabled={saving} onClick={() => setShowForm(false)}>Batal</button><button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Menyimpan...' : editing ? 'Simpan Perubahan' : 'Buat Tag'}</button></div>
                        </form>
                    </section>
                </div>
            )}
        </AdminLayout>
    );
}
