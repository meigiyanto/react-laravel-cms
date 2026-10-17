import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    type FormEvent
} from 'react';
import axios from 'axios';
import api from '../api/client';

type Category = {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    posts_count: number;
    created_at: string;
    updated_at: string;
};

type CategoryForm = {
    name: string;
    slug: string;
    description: string;
};

type CategoryPagination = {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    data: Category[];
};

const emptyForm: CategoryForm = {
    name: '',
    slug: '',
    description: '',
};

function getErrorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
        const errors = error.response?.data?.errors;

        if (errors && typeof errors === 'object') {
            return Object.values(errors).flat().join(' ');
        }

        return error.response?.data?.message || 'Gagal menghubungi API.';

    }

    return 'Terjadi kesalahan yang tidak diketahui.';
}

export default function CategoriesPage({
    onBack,
    onLogout,
}: {
    onBack: () => void;
    onLogout: () => void;
    onOpenMedia: () => void;
    onOpenPages: () => void;
}) {
    const [categories,
        setCategories] = useState < Category[] > ([]);
    const [page,
        setPage] = useState(1);
    const [lastPage,
        setLastPage] = useState(1);
    const [total,
        setTotal] = useState(0);
    const [search,
        setSearch] = useState('');
    const [loading,
        setLoading] = useState(true);
    const [saving,
        setSaving] = useState(false);
    const [deletingId,
        setDeletingId] = useState < number | null > (null);
    const [error,
        setError] = useState('');
    const [notice,
        setNotice] = useState('');
    const [editing,
        setEditing] = useState < Category | null > (null);
    const [form,
        setForm] = useState < CategoryForm > (emptyForm);
    const [showForm,
        setShowForm] = useState(false);

    const loadCategories = useCallback(async () => {
        setLoading(true);
        setError('');

        try {
            const response = await api.get('/categories', {
                params: {
                    page
                },
            });

            const result: CategoryPagination = response.data.data;

            setCategories(result.data);
            setLastPage(result.last_page);
            setTotal(result.total);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }

    }, [page]);

    useEffect(() => {
        void loadCategories();
    }, [loadCategories]);

    const visibleCategories = useMemo(() => {
        const keyword = search.trim().toLocaleLowerCase('id-ID');

        if (!keyword) return categories;

        return categories.filter((category) =>
            [category.name, category.slug, category.description || '']
            .some((value) => value.toLocaleLowerCase('id-ID').includes(keyword)),
        );

    },
        [categories,
            search]);

    function openCreateForm() {
        setEditing(null);
        setForm(emptyForm);
        setError('');
        setNotice('');
        setShowForm(true);
    }

    function openEditForm(category: Category) {
        setEditing(category);
        setForm({
            name: category.name,
            slug: category.slug,
            description: category.description || '',
        });
        setError('');
        setNotice('');
        setShowForm(true);
    }

    async function saveCategory(event: FormEvent < HTMLFormElement >) {
        event.preventDefault();

        setSaving(true);
        setError('');
        setNotice('');

        const name = form.name.trim();
        const slug = form.slug.trim();
        const description = form.description.trim();

        const payload: {
            name: string;
            slug?: string | null;
            description: string | null;
        } = {
            name,
            description: description || null,
        };

        // Saat membuat, slug boleh kosong agar backend membuatkannya.
        // Saat mengedit, slug kosong tidak dikirim sehingga backend dapat
        // membentuk slug berdasarkan nama terbaru.
        if (slug) {
            payload.slug = slug;
        } else if (!editing) {
            payload.slug = null;
        }

        try {
            if (editing) {
                await api.put(`/categories/${editing.id}`, payload);
                setNotice('Kategori berhasil diperbarui.');
            } else {
                await api.post('/categories', payload);
                setNotice('Kategori berhasil dibuat.');
            }

            setShowForm(false);
            setEditing(null);
            setForm(emptyForm);

            // Kembali ke halaman pertama agar kategori baru mudah ditemukan.
            if (!editing && page !== 1) {
                setPage(1);
            } else {
                await loadCategories();
            }
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setSaving(false);
        }

    }

    async function deleteCategory(category: Category) {
        const confirmed = window.confirm(
            `Hapus kategori "${category.name}"? Tindakan ini tidak dapat dibatalkan.`,
        );

        if (!confirmed) return;

        setError('');
        setNotice('');
        setDeletingId(category.id);

        try {
            await api.delete(`/categories/${category.id}`);
            setNotice('Kategori berhasil dihapus.');

            // Jika kategori terakhir di halaman dihapus, pindah ke halaman sebelumnya.
            if (categories.length === 1 && page > 1) {
                setPage((current) => current - 1);
            } else {
                await loadCategories();
            }
        } catch (err) {
            // Termasuk respons 422 ketika kategori masih digunakan artikel.
            setError(getErrorMessage(err));
        } finally {
            setDeletingId(null);
        }

    }
    
    return (
        <div className="cms-shell">
            <aside className="cms-sidebar">
                <div className="cms-brand">
                    <span className="brand-mark">C</span>
                    <div>
                        <strong>ContentHub</strong>
                        <small>CMS Dashboard</small>
                    </div>
                </div>

                <div className="sidebar-label">
                    WORKSPACE
                </div>

                <button className="nav-item" type="button" onClick={onBack}>
                    <span>▦</span> Dashboard
                </button>
                <button className="nav-item" type="button" onClick={onBack}>
                    <span>▤</span> Artikel
                </button>
                <button className="nav-item active" type="button" aria-current="page">
                    <span>▧</span> Kategori
                </button>
                <button className="nav-item" type="button" disabled>
                    <span>▣</span> Media
                    <small>Segera</small>
                </button>
                <button className="nav-item" type="button" disabled>
                    <span>▱</span> Halaman
                    <small>Segera</small>
                </button>

                <div className="sidebar-bottom">
                    <div className="sidebar-label">
                        STATUS SISTEM
                    </div>
                    <div className="system-status">
                        <span className="status-dot" /> API terhubung
                    </div>
                    <small>React · Laravel · MariaDB</small>
                </div>
            </aside>
            <main className="cms-main">
                <header className="topbar">
                    <div>
                        <div className="breadcrumb-text">
                            Workspace / Konten / Kategori
                        </div>
                        <h1>Kategori</h1>
                    </div>

                    <div className="d-flex align-items-center gap-2">
                        <button className="btn btn-outline-secondary" type="button" onClick={onLogout}>
                            Keluar
                        </button>
                        <button className="btn btn-primary" type="button" onClick={openCreateForm}>
                            + Kategori Baru
                        </button>
                    </div>
                </header>

                <section className="welcome-panel">
                    <div>
                        <span className="eyebrow">CONTENT MANAGEMENT</span>
                        <h2>Atur kategori konten.</h2>
                        <p>
                            Kelompokkan artikel agar konten lebih mudah dikelola.
                        </p>
                    </div>
                    <div className="welcome-icon" aria-hidden="true">
                        ▧
                    </div>
                </section>

                {error && (
                <div className="alert alert-danger mt-3" role="alert">
                    {error}
                    <button
                        className="btn-close float-end"
                        type="button"
                        onClick={()=> setError('')}
                        aria-label="Tutup"
                        />
                    </div>
                    )}

                    {notice && (
                    <div className="alert alert-success mt-3" role="status">
                        {notice}
                        <button
                            className="btn-close float-end"
                            type="button"
                            onClick={()=> setNotice('')}
                            aria-label="Tutup"
                            />
                        </div>
                        )}

                        <section className="content-panel mt-4">
                            <div className="panel-heading">
                                <div>
                                    <h3>Daftar Kategori</h3>
                                    <p>
                                        Buat, edit, dan kelola kategori artikel.
                                    </p>
                                </div>
                                <span className="total-badge">{total} kategori</span>
                            </div>

                            <div className="toolbar">
                                <div className="search-box">
                                    <span aria-hidden="true">⌕</span>
                                    <input
                                    className="form-control"
                                    type="search"
                                    placeholder="Cari nama, slug, atau deskripsi..."
                                    value={search}
                                    onChange={(event)=> setSearch(event.target.value)}
                                    aria-label="Cari kategori pada halaman ini"
                                    />
                                </div>
                            </div>

                            <div className="table-responsive">
                                <table className="table cms-table align-middle">
                                    <thead>
                                        <tr>
                                            <th>KATEGORI</th>
                                            <th>DESKRIPSI</th>
                                            <th>JUMLAH ARTIKEL</th>
                                            <th className="text-end">AKSI</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading ? (
                                        <tr>
                                            <td colSpan={4} className="empty-state">Memuat kategori...</td>
                                        </tr>
                                        ) : visibleCategories.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="empty-state">
                                                <div className="empty-icon">
                                                    ▧
                                                </div>
                                                <strong>
                                                    {search ? 'Kategori tidak ditemukan' : 'Belum ada kategori'}
                                                </strong>
                                                <p>
                                                    {search
                                                    ? 'Coba kata kunci lain.'
                                                    : 'Buat kategori pertama untuk mengelompokkan artikel.'}
                                                </p>
                                                {!search && (
                                                <button
                                                    className="btn btn-outline-primary btn-sm"
                                                    type="button"
                                                    onClick={openCreateForm}
                                                    >
                                                    Buat kategori
                                                </button>
                                                )}
                                            </td>
                                        </tr>
                                        ) : (
                                        visibleCategories.map((category) => (
                                        <tr key={category.id}>
                                            <td>
                                                <div className="post-title">
                                                    {category.name}
                                                </div>
                                                <div className="post-slug">
                                                    /{category.slug}
                                                </div>
                                            </td>
                                            <td className="category-description">
                                                {category.description || (
                                                <span className="text-secondary">Belum ada deskripsi</span>
                                                )}
                                            </td>
                                            <td>
                                                <span className="total-badge">
                                                    {category.posts_count} artikel
                                                </span>
                                            </td>
                                            <td>
                                                <div className="d-flex justify-content-end gap-2">
                                                    <button
                                                        className="btn btn-sm btn-light"
                                                        type="button"
                                                        onClick={()=> openEditForm(category)}
                                                        disabled={deletingId !== null}
                                                        >
                                                        Edit
                                                    </button>
                                                    <button
                                                        className="btn btn-sm btn-outline-danger"
                                                        type="button"
                                                        onClick={()=> void deleteCategory(category)}
                                                        disabled={deletingId !== null}
                                                        >
                                                        {deletingId === category.id ? 'Menghapus...' : 'Hapus'}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                        ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="pagination-bar">
                                <span>
                                    Halaman {page} dari {lastPage} · {total} kategori
                                </span>
                                <div className="d-flex gap-2">
                                    <button
                                        className="btn btn-sm btn-outline-secondary"
                                        type="button"
                                        disabled={page <=1 || loading}
                                        onClick={()=> setPage((current) => current - 1)}
                                        >
                                        Sebelumnya
                                    </button>
                                    <button
                                        className="btn btn-sm btn-outline-secondary"
                                        type="button"
                                        disabled={page>= lastPage || loading}
                                        onClick={() => setPage((current) => current + 1)}
                                        >
                                        Berikutnya
                                    </button>
                                </div>
                            </div>
                        </section>

                        <footer className="cms-footer">
                            ContentHub CMS · Backend Laravel API
                        </footer>
                    </main>
            {showForm && (
                <div
                    className="modal-backdrop-custom"
                    role="presentation"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget && !saving) {
                            setShowForm(false);
                        }
                    }}
                >
                    <section
                        className="editor-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="category-editor-title"
                    >
                        <div className="modal-heading">
                            <div>
                                <h2 id="category-editor-title">
                                    {editing ? 'Edit Kategori' : 'Buat Kategori Baru'}
                                </h2>
                                <p>
                                    Isi nama kategori dan informasi pendukungnya.
                                </p>
                            </div>
                            <button
                                className="btn-close"
                                type="button"
                                aria-label="Tutup"
                                disabled={saving}
                                onClick={()=> setShowForm(false)}
                                />
                            </div>

                            <form onSubmit={saveCategory}>
                                <div className="mb-3">
                                    <label className="form-label" htmlFor="category-name">
                                        Nama kategori *
                                    </label>
                                    <input
                                    id="category-name"
                                    className="form-control"
                                    required
                                    maxLength={150}
                                    autoFocus
                                    value={form.name}
                                    onChange={(event)=>
                                    setForm((current) => ({ ...current, name: event.target.value }))
                                    }
                                    />
                                </div>

                                <div className="mb-3">
                                    <label className="form-label" htmlFor="category-slug">
                                        Slug (opsional)
                                    </label>
                                    <input
                                    id="category-slug"
                                    className="form-control"
                                    maxLength={180}
                                    placeholder="Dibuat otomatis jika kosong"
                                    value={form.slug}
                                    onChange={(event)=>
                                    setForm((current) => ({ ...current, slug: event.target.value }))
                                    }
                                    />
                                    <div className="form-text">
                                        Gunakan slug yang unik. Kosongkan untuk membentuk slug dari nama.
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <label className="form-label" htmlFor="category-description">
                                        Deskripsi
                                    </label>
                                    <textarea
                                        id="category-description"
                                        className="form-control"
                                        rows={4}
                                        maxLength={2000}
                                        value={form.description}
                                        onChange={(event)=>
                                        setForm((current) => ({
                                        ...current,
                                        description: event.target.value,
                                        }))
                                        }
                                        />
                                        <div className="form-text text-end">
                                            {form.description.length}/2000 karakter
                                        </div>
                                    </div>

                                    <div className="modal-actions">
                                        <button
                                            type="button"
                                            className="btn btn-light"
                                            disabled={saving}
                                            onClick={()=> setShowForm(false)}
                                            >
                                            Batal
                                        </button>
                                        <button type="submit" className="btn btn-primary" disabled={saving}>
                                            {saving
                                            ? 'Menyimpan...'
                                            : editing
                                            ? 'Simpan Perubahan'
                                            : 'Buat Kategori'}
                                        </button>
                                    </div>
                                </form>
                    </section>
                </div>
            )}
        </div>
    );
}