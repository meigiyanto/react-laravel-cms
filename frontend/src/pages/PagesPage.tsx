import { useCallback, useEffect, useState, lazy, type FormEvent } from 'react';
import axios from 'axios';
import api from '../api/client';
import AdminLayout from '../components/AdminLayout';
import { type ActiveModule } from '../components/Sidebar';
const Pagination = lazy(() => import('../components/Pagination'));
import { faBookOpen } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

type Status = 'draft' | 'published' | 'archived';

type MediaOption = {
    id: number;
    path: string;
    original_name: string;
    alt_text: string | null;
};

type CmsPage = {
    id: number;
    title: string;
    slug: string;
    body: string;
    status: Status;
    published_at: string | null;
    featured_image_id: number | null;
    featured_image?: MediaOption | null;
    meta_title: string | null;
    meta_description: string | null;
    created_at: string;
    updated_at: string;
};

type PageForm = {
    title: string;
    slug: string;
    body: string;
    status: Status;
    featured_image_id: string;
    meta_title: string;
    meta_description: string;
};

type Pagination < T > = {
    current_page: number;
    last_page: number;
    total: number;
    data: T[];
};

const emptyForm: PageForm = {
    title: '',
    slug: '',
    body: '',
    status: 'draft',
    featured_image_id: '',
    meta_title: '',
    meta_description: '',
};

function errorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
        const errors = error.response?.data?.errors;
        if (errors && typeof errors === 'object') {
            return Object.values(errors).flat().join(' ');
        }
        return error.response?.data?.message || 'Gagal menghubungi API.';
    }
    return 'Terjadi kesalahan yang tidak diketahui.';
}

type NavigationProps = {
    onNavigate: (module: ActiveModule) => void;
    onLogout: () => void;
};

export default function PagesPage({ onNavigate, onLogout } : NavigationProps) {
    const [pages, setPages] = useState <CmsPage[]> ([]);
    const [media, setMedia] = useState <MediaOption[]> ([]);
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState < number | null > (null);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [editing, setEditing] = useState < CmsPage | null > (null);
    const [form, setForm] = useState < PageForm > (emptyForm);
    const [showForm, setShowForm] = useState(false);

    const loadPages = useCallback(async () => {
        setLoading(true);
        setError('');

        try {
            const response = await api.get('/pages', {
                params: {
                    page,
                    search: search.trim() || undefined,
                    status: statusFilter || undefined,
                },
            });

            const result: Pagination < CmsPage > = response.data.data;
            setPages(result.data);
            setLastPage(result.last_page);
            setTotal(result.total);
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setLoading(false);
        }
    }, [page, search, statusFilter]);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            void loadPages();
        }, 250);

        return () => window.clearTimeout(timer);
    }, [loadPages]);

    const loadMediaOptions = useCallback(async () => {
        try {
            const response = await api.get('/media', {
                params: {
                    page: 1
                }
            });
            const result: Pagination < MediaOption > = response.data.data;
            setMedia(result.data);
        } catch (err) {
            setError(errorMessage(err));
        }
    }, []);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            void loadMediaOptions();
        }, 0);

        return () => window.clearTimeout(timer);
    }, [loadMediaOptions]);

    function openCreateForm() {
        setEditing(null);
        setForm(emptyForm);
        setError('');
        setNotice('');
        setShowForm(true);
    }

    async function openEditForm(item: CmsPage) {
        setError('');

        try {
            const response = await api.get(`/pages/${item.id}`);
            const current: CmsPage = response.data.data;

            setEditing(current);
            setForm({
                title: current.title,
                slug: current.slug,
                body: current.body,
                status: current.status,
                featured_image_id: current.featured_image_id
                ? String(current.featured_image_id): '',
                meta_title: current.meta_title || '',
                meta_description: current.meta_description || '',
            });
            setShowForm(true);
        } catch (err) {
            setError(errorMessage(err));
        }
    }

    async function savePage(event: FormEvent < HTMLFormElement >) {
        event.preventDefault();

        setSaving(true);
        setError('');
        setNotice('');

        const payload: Record < string,
        string | number | null > = {
            title: form.title.trim(),
            body: form.body,
            status: form.status,
            featured_image_id: form.featured_image_id
            ? Number(form.featured_image_id): null,
            meta_title: form.meta_title.trim() || null,
            meta_description: form.meta_description.trim() || null,
        };

        const slug = form.slug.trim();

        // Slug kosong tidak dikirim saat edit, sehingga backend dapat membentuknya
        // berdasarkan judul; saat membuat, null meminta backend membuat slug otomatis.
        if (slug) {
            payload.slug = slug;
        } else if (!editing) {
            payload.slug = null;
        }

        try {
            if (editing) {
                await api.put(`/pages/${editing.id}`, payload);
                setNotice('Halaman berhasil diperbarui.');
            } else {
                await api.post('/pages', payload);
                setNotice('Halaman berhasil dibuat.');
            }

            setShowForm(false);
            setEditing(null);
            setForm(emptyForm);
            setPage(1);
            await loadPages();
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setSaving(false);
        }
    }

    async function deletePage(item: CmsPage) {
        if (!window.confirm(
            `Hapus halaman "${item.title}"? Tindakan ini tidak dapat dibatalkan.`
        )) return;

        setDeletingId(item.id);
        setError('');
        setNotice('');

        try {
            await api.delete(`/pages/${item.id}`);
            setNotice('Halaman berhasil dihapus.');

            if (pages.length === 1 && page > 1) {
                setPage((current) => current - 1);
            } else {
                await loadPages();
            }
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setDeletingId(null);
        }
    }

    return (
        <AdminLayout
            active="pages"
            onNavigate={onNavigate}
            onLogout={onLogout}
            title="Halaman"
            breadcrumb="Workspace / Konten / Halaman"
            actions={
                <button
                    className="btn btn-primary"
                    type="button"
                    onClick={openCreateForm}
                    >
                    + Halaman Baru
                </button>
            }
        >
            <section className="welcome-panel">
                <div>
                    <span className="eyebrow">PAGE MANAGEMENT</span>
                    <h2>Kelola halaman situs.</h2>
                    <p>Atur isi halaman, publikasi, gambar unggulan, dan metadata SEO.</p>
                </div>
                <div className="welcome-icon" aria-hidden="true"><FontAwesomeIcon icon={faBookOpen} /></div>
            </section>

            {error && (
                <div className="alert alert-danger mt-3" role="alert">
                    {error}
                    <button className="btn-close float-end" type="button" onClick={() => setError('')} aria-label="Tutup" />
                </div>
            )}
            
            {notice && (
                <div className="alert alert-success mt-3" role="status">
                    {notice}
                    <button className="btn-close float-end" type="button" onClick={() => setNotice('')} aria-label="Tutup" />
                </div>
            )}

            <section className="content-panel mt-4">
                    <div className="panel-heading">
                        <div>
                            <h3>Daftar Halaman</h3>
                            <p>Kelola halaman statis dan status publikasinya.</p>
                        </div>
                        <span className="total-badge">{total} halaman</span>
                    </div>

                    <div className="toolbar">
                        <div className="search-box">
                            <span aria-hidden="true">⌕</span>
                            <input className="form-control" type="search" placeholder="Cari judul atau slug..." aria-label="Cari halaman" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }}/>
                        </div>
                        <select className="form-select status-filter" value={statusFilter} aria-label="Filter status halaman" onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}>
                            <option value="">Semua status</option>
                            <option value="draft">Draf</option>
                            <option value="published">Dipublikasikan</option>
                            <option value="archived">Diarsipkan</option>
                        </select>
                    </div>

                    <div className="table-responsive">
                        <table className="table cms-table align-middle">
                            <thead>
                                <tr>
                                    <th>JUDUL HALAMAN</th>
                                    <th>STATUS</th>
                                    <th>DIPERBARUI</th>
                                    <th className="text-end">AKSI</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={4} className="empty-state">Memuat halaman...</td></tr>
                                ): pages.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="empty-state">
                                            <div className="empty-icon">
                                                ▱
                                            </div>
                                            <strong>Belum ada halaman</strong>
                                            <p>
                                                Buat halaman pertama atau ubah filter pencarian.
                                            </p>
                                            <button className="btn btn-outline-primary btn-sm"
                                                type="button" onClick={openCreateForm}>
                                                Buat halaman
                                            </button>
                                        </td>
                                    </tr>
                                ): pages.map((item) => (
                                        <tr key={item.id}>
                                            <td>
                                                <div className="post-title">
                                                    {item.title}
                                                </div>
                                                <div className="post-slug">
                                                    /{item.slug}
                                                </div>
                                                {item.featured_image && (
                                                    <div className="post-slug">
                                                        Gambar: {item.featured_image.original_name}
                                                    </div>
                                                )}
                                            </td>
                                            <td><StatusBadge status={item.status} /></td>
                                            <td className="date-cell">
                                                {new Date(item.updated_at).toLocaleDateString('id-ID', {
                                                    day: '2-digit',
                                                    month: 'short',
                                                    year: 'numeric',
                                                })}
                                            </td>
                                            <td>
                                                <div className="d-flex justify-content-end gap-2">
                                                    <button className="btn btn-sm btn-light" type="button"
                                                        disabled={deletingId !== null}
                                                        onClick={() => void openEditForm(item)}>
                                                        Edit
                                                    </button>
                                                    <button className="btn btn-sm btn-outline-danger" type="button"
                                                        disabled={deletingId !== null}
                                                        onClick={() => void deletePage(item)}>
                                                        {deletingId === item.id ? 'Menghapus...': 'Hapus'}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
    
                    <Pagination
                        currentPage={page}
                        lastPage={lastPage}
                        total={total}
                        perPage={10}
                        loading={loading}
                        itemLabel="halaman"
                        onPageChange={setPage}
                    />
                </section>

            {showForm && (
                <div className="modal-backdrop-custom" role="presentation">
                    <section className="editor-modal page-editor-modal" role="dialog" aria-modal="true" aria-labelledby="page-editor-title">
                        <div className="modal-heading">
                            <div>
                                <h2 id="page-editor-title">
                                    {editing ? 'Edit Halaman': 'Buat Halaman Baru'}
                                </h2>
                                <p>
                                    Isi konten halaman dan pengaturan publikasi.
                                </p>
                            </div>
                            <button className="btn-close" type="button" aria-label="Tutup"
                                disabled={saving} onClick={() => setShowForm(false)} />
                        </div>
    
                        <form onSubmit={savePage}>
                            <div className="mb-3">
                                <label className="form-label" htmlFor="page-title">Judul *</label>
                                <input id="page-title" className="form-control" required maxLength={255} value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
                            </div>        
                            
                            <div className="mb-3">
                                <label className="form-label" htmlFor="page-slug">Slug (opsional)</label>
                                <input id="page-slug" className="form-control" maxLength={255} placeholder="Dibuat otomatis jika kosong" value={form.slug} onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))} />
                            </div>
    
                            <div className="mb-3">
                                <label className="form-label" htmlFor="page-body">Isi halaman *</label>
                                <textarea id="page-body" className="form-control editor-body" rows={8} required value={form.body} onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))} />
                                <div className="form-text">Saat ini isi halaman disimpan sebagai teks. Editor rich-text belum ditambahkan.</div>
                            </div>
    
                            <div className="mb-3">
                                <label className="form-label" htmlFor="page-status">Status *</label>
                                <select id="page-status" className="form-select" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as Status }))}>
                                    <option value="draft">Draf</option>
                                    <option value="published">Dipublikasikan</option>
                                    <option value="archived">Diarsipkan</option>
                                </select>
                            </div>
    
                            <div className="mb-3">
                                <label className="form-label" htmlFor="page-featured-image">Gambar unggulan</label>
                                <select id="page-featured-image" className="form-select" value={form.featured_image_id} onChange={(event) => setForm((current) => ({ ...current, featured_image_id: event.target.value }))}>
                                    <option value="">Tanpa gambar unggulan</option>
                                    {media.map((item) => (
                                        <option key={item.id} value={item.id}>
                                            {item.original_name}
                                        </option>
                                    ))}
                                </select>
                                <div className="form-text">
                                    Pilihan menampilkan hingga 20 media terbaru. Unggah gambar baru melalui menu Media.
                                </div>
                            </div>
            
                            <hr />
            
                            <h3 className="h6 mb-3">Metadata SEO</h3>
                            
                            <div className="mb-3">
                                <label className="form-label" htmlFor="page-meta-title">Meta title</label>
                                <input id="page-meta-title" className="form-control" maxLength={255} value={form.meta_title} onChange={(event) => setForm((current) => ({ ...current, meta_title: event.target.value }))} />
                                <div className="form-text">{form.meta_title.length}/255 karakter</div>
                            </div>
                
                            <div className="mb-4">
                                <label className="form-label" htmlFor="page-meta-description">Meta description</label>
                                <textarea id="page-meta-description" className="form-control" rows={3} maxLength={500} value={form.meta_description} onChange={(event) => setForm((current) => ({ ...current, meta_description: event.target.value }))} />
                                <div className="form-text text-end">{form.meta_description.length}/500 karakter</div>
                            </div>
                
                            <div className="modal-actions">
                                <button type="button" className="btn btn-light" disabled={saving}
                                    onClick={() => setShowForm(false)}>
                                    Batal
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                    {saving ? 'Menyimpan...': editing ? 'Simpan Perubahan': 'Buat Halaman'}
                                </button>
                            </div>
                        </form>
                    </section>
                </div>
            )}
        </AdminLayout>
    );
}

function StatusBadge({ status }: { status: Status }) {
    const labels: Record <Status, string> = {
        draft: 'Draf',
        published: 'Terbit',
        archived: 'Arsip',
    };

    return <span className={`status-badge ${status}`}>{labels[status]}</span>;
}