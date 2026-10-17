import { useCallback, useEffect, useState, type FormEvent } from 'react';
import axios from 'axios';
import api, { AUTH_EXPIRED_EVENT, TOKEN_KEY } from './api/client';
import LoginPage from './pages/LoginPage';
import CategoriesPage from './pages/CategoriesPage';

type Status = 'draft' | 'published' | 'archived';

type Post = {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  body: string;
  status: Status;
  published_at: string | null;
  created_at: string;
};

type Stats = {
  total: number;
  published: number;
  draft: number;
  archived: number;
};

type Pagination = {
  current_page: number;
  last_page: number;
  total: number;
  data: Post[];
};

type PostForm = {
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  status: Status;
};

const emptyForm: PostForm = {
  title: '',
  slug: '',
  excerpt: '',
  body: '',
  status: 'draft',
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

function Dashboard({ onLogout, onOpenCategories }: {  onLogout: () => void; onOpenCategories: () => void; }) {
  const [stats, setStats] = useState<Stats>({
    total: 0, published: 0, draft: 0, archived: 0,
  });
  const [posts, setPosts] = useState<Post[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState<Post | null>(null);
  const [form, setForm] = useState<PostForm>(emptyForm);
  const [showForm, setShowForm] = useState(false);

  const loadStats = useCallback(async () => {
    const response = await api.get('/dashboard/stats');
    setStats(response.data.data);
  }, []);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await api.get('/posts', {
        params: {
          page,
          search: search || undefined,
          status: statusFilter || undefined,
        },
      });

      const result: Pagination = response.data.data;
      setPosts(result.data);
      setLastPage(result.last_page);
      setTotal(result.total);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    loadStats().catch((err) => setError(errorMessage(err)));
  }, [loadStats]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadPosts();
    }, 250);

    return () => window.clearTimeout(timer);
  }, [loadPosts]);

  function openCreateForm() {
    setEditing(null);
    setForm(emptyForm);
    setError('');
    setShowForm(true);
  }

  async function openEditForm(post: Post) {
    setError('');

    try {
      const response = await api.get(`/posts/${post.id}`);
      const item: Post = response.data.data;

      setEditing(item);
      setForm({
        title: item.title,
        slug: item.slug,
        excerpt: item.excerpt || '',
        body: item.body,
        status: item.status,
      });
      setShowForm(true);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function savePost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');

    try {
      const payload = {
        ...form,
        slug: form.slug.trim() || null,
        excerpt: form.excerpt || null,
      };

      if (editing) {
        await api.put(`/posts/${editing.id}`, payload);
        setNotice('Artikel berhasil diperbarui.');
      } else {
        await api.post('/posts', payload);
        setNotice('Artikel berhasil dibuat.');
      }

      setShowForm(false);
      setEditing(null);
      setPage(1);
      await Promise.all([loadStats(), loadPosts()]);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function deletePost(post: Post) {
    const confirmed = window.confirm(
      `Hapus artikel "${post.title}"? Tindakan ini tidak dapat dibatalkan.`,
    );

    if (!confirmed) return;

    setError('');
    setNotice('');

    try {
      await api.delete(`/posts/${post.id}`);
      setNotice('Artikel berhasil dihapus.');
      await Promise.all([loadStats(), loadPosts()]);
    } catch (err) {
      setError(errorMessage(err));
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
            <button className="nav-item active" type="button">
                <span>▦</span> Dashboard
            </button>
            <button className="nav-item" type="button" onClick={()=> {
                setSearch('');
                setStatusFilter('');
                setPage(1);
            }}
            >
                <span>▤</span> Artikel
            </button>
            <button className="nav-item" type="button" onClick={onOpenCategories}>
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
                        Workspace / Overview
                    </div>
                    <h1>Dashboard</h1>
                </div>
    
                <div className="d-flex align-items-center gap-2">
                    <button
                        className="btn btn-outline-secondary"
                        type="button"
                        onClick={onLogout}
                        >
                        Keluar
                    </button>
    
                    <button
                        className="btn btn-primary"
                        type="button"
                        onClick={openCreateForm}
                        >
                        + Artikel Baru
                    </button>
                </div>
            </header>
    
            <section className="welcome-panel">
                <div>
                    <span className="eyebrow">CONTENT MANAGEMENT</span>
                    <h2>Kelola kontenmu dengan mudah.</h2>
                    <p>
                        Pantau artikel dan kelola publikasi dari satu tempat.
                    </p>
                </div>
                <div className="welcome-icon">
                    ✎
                </div>
            </section>
    
            {error && (
                <div className="alert alert-danger mt-3" role="alert">
                    {error}
                    <button className="btn-close float-end" onClick={()=> setError('')} aria-label="Tutup" />
                </div>
            )}
    
            {notice && (
                <div className="alert alert-success mt-3" role="status">
                {notice}
                <button className="btn-close float-end" onClick={()=> setNotice('')} aria-label="Tutup" />
                </div>
            )}

            <section className="stats-grid">
                <StatCard label="Total Artikel" value={stats.total} icon="▤" tone="blue" />
                <StatCard label="Dipublikasikan" value={stats.published} icon="↗" tone="green" />
                <StatCard label="Draf" value={stats.draft} icon="✎" tone="amber" />
                <StatCard label="Diarsipkan" value={stats.archived} icon="▣" tone="gray" />
            </section>

            <section className="content-panel">
                <div className="panel-heading">
                    <div>
                        <h3>Artikel Terbaru</h3>
                        <p>
                            Kelola dan pantau semua artikel CMS.
                        </p>
                    </div>
                    <span className="total-badge">{total} artikel</span>
                </div>

                <div className="toolbar">
                    <div className="search-box">
                        <span>⌕</span>
                        <input
                        className="form-control"
                        type="search"
                        placeholder="Cari judul artikel..."
                        value={search}
                        onChange={(event)=> {
                        setSearch(event.target.value);
                        setPage(1);
                        }}
                        aria-label="Cari artikel"
                        />
                    </div>
                    <select
                        className="form-select status-filter"
                        value={statusFilter}
                        onChange={(event)=> {
                        setStatusFilter(event.target.value);
                        setPage(1);
                        }}
                        aria-label="Filter status artikel"
                        >
                        <option value="">Semua status</option>
                        <option value="published">Dipublikasikan</option>
                        <option value="draft">Draf</option>
                        <option value="archived">Diarsipkan</option>
                    </select>
                </div>

                <div className="table-responsive">
                    <table className="table cms-table align-middle">
                        <thead>
                            <tr>
                                <th>JUDUL ARTIKEL</th>
                                <th>STATUS</th>
                                <th>TANGGAL</th>
                                <th className="text-end">AKSI</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                            <tr><td colSpan={4} className="empty-state">Memuat artikel...</td></tr>
                            ) : posts.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="empty-state">
                                    <div className="empty-icon">
                                        ▤
                                    </div>
                                    <strong>Belum ada artikel</strong>
                                    <p>
                                        Buat artikel pertama atau ubah filter pencarian.
                                    </p>
                                    <button className="btn btn-outline-primary btn-sm" onClick={openCreateForm}>
                                        Buat artikel
                                    </button>
                                </td>
                            </tr>
                            ) : posts.map((post) => (
                            <tr key={post.id}>
                                <td>
                                    <div className="post-title">
                                        {post.title}
                                    </div>
                                    <div className="post-slug">
                                        /{post.slug}
                                    </div>
                                </td>
                                <td><StatusBadge status={post.status} /></td>
                                <td className="date-cell">
                                    {new Date(post.created_at).toLocaleDateString('id-ID', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                    })}
                                </td>
                                <td>
                                    <div className="d-flex justify-content-end gap-2">
                                        <button className="btn btn-sm btn-light" onClick={()=> void openEditForm(post)}>
                                            Edit
                                        </button>
                                        <button className="btn btn-sm btn-outline-danger" onClick={()=> void deletePost(post)}>
                                            Hapus
                                        </button>
                                    </div>
                                </td>
                            </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="pagination-bar">
                    <span>Halaman {page} dari {lastPage}</span>
                    <div className="d-flex gap-2">
                        <button className="btn btn-sm btn-outline-secondary" disabled={page <=1 || loading} onClick={()=> setPage(page - 1)}>
                            Sebelumnya
                        </button>
                        <button className="btn btn-sm btn-outline-secondary" disabled={page>= lastPage || loading} onClick={() => setPage(page + 1)}>
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
            <div className="modal-backdrop-custom" role="presentation">
                <section className="editor-modal" role="dialog" aria-modal="true" aria-labelledby="editor-title">
                    <div className="modal-heading">
                        <div>
                            <h2 id="editor-title">{editing ? 'Edit Artikel' : 'Buat Artikel Baru'}</h2>
                            <p>
                                Lengkapi informasi artikel di bawah ini.
                            </p>
                        </div>
                        <button className="btn-close" aria-label="Tutup" onClick={()=> setShowForm(false)} />
                    </div>
    
                    <form onSubmit={savePost}>
                        <div className="mb-3">
                            <label className="form-label" htmlFor="post-title">Judul artikel *</label>
                            <input id="post-title" className="form-control" required maxLength={255} value={form.title} onChange={(e)=> setForm({ ...form, title: e.target.value })} />
                        </div>
    
                        <div className="mb-3">
                            <label className="form-label" htmlFor="post-slug">Slug (opsional)</label>
                            <input id="post-slug" className="form-control" maxLength={255} placeholder="Dibuat otomatis jika kosong" value={form.slug} onChange={(e)=> setForm({ ...form, slug: e.target.value })} />
                        </div>
    
                        <div className="mb-3">
                            <label className="form-label" htmlFor="post-excerpt">Ringkasan</label>
                            <textarea id="post-excerpt" className="form-control" rows={2} value={form.excerpt} onChange={(e)=> setForm({ ...form, excerpt: e.target.value })} />
                            </div>
    
                        <div className="mb-3">
                            <label className="form-label" htmlFor="post-body">Isi artikel *</label>
                            <textarea id="post-body" className="form-control editor-body" rows={7} required value={form.body} onChange={(e)=> setForm({ ...form, body: e.target.value })} />
                            </div>
    
                        <div className="mb-4">
                            <label className="form-label" htmlFor="post-status">Status *</label>
                            <select id="post-status" className="form-select" value={form.status} onChange={(e)=> setForm({ ...form, status: e.target.value as Status })}>
                                <option value="draft">Draf</option>
                                <option value="published">Dipublikasikan</option>
                                <option value="archived">Diarsipkan</option>
                            </select>
                        </div>
    
                        <div className="modal-actions">
                            <button type="button" className="btn btn-light" disabled={saving} onClick={()=> setShowForm(false)}>
                                Batal
                            </button>
                            <button type="submit" className="btn btn-primary" disabled={saving}>
                                {saving ? 'Menyimpan...' : editing ? 'Simpan Perubahan' : 'Buat Artikel'}
                            </button>
                        </div>
                    </form>
                </section>
            </div>
        )}
    </div>
  );
}

function StatCard({ label, value, icon, tone }: {
  label: string;
  value: number;
  icon: string;
  tone: string; 
}) {
  return (
    <div className="stat-card">
        <div className={`stat-icon ${tone}`}>{icon}</div>
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value.toLocaleString('id-ID')}</div>
    </div>                    
  );
}

function StatusBadge({ status }: { status: Status }) {
  const labels: Record<Status, string> = {
    draft: 'Draf',
    published: 'Terbit',
    archived: 'Arsip',
  };

  return <span className={`status-badge ${status}`}>{labels[status]}</span>;
}

function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [activeModule, setActiveModule] = useState<'dashboard' | 'categories'>('dashboard');

  const handleLogout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Tetap keluarkan pengguna jika token sudah tidak valid
      // atau server tidak dapat dijangkau.
    } finally {
      localStorage.removeItem(TOKEN_KEY);
      setAuthenticated(false);
      setActiveModule('dashboard');
    }
  }, []);

  useEffect(() => {
    let active = true;

    const expireSession = () => {
      localStorage.removeItem(TOKEN_KEY);

      if (active) {
        setAuthenticated(false);
        setCheckingAuth(false);
      }
    };

    window.addEventListener(AUTH_EXPIRED_EVENT, expireSession);

    async function verifySession() {
      const token = localStorage.getItem(TOKEN_KEY);

      if (!token) {
        if (active) setCheckingAuth(false);
        return;
      }

      try {
        await api.get('/auth/me');

        if (active) {
          setAuthenticated(true);
        }
      } catch {
        localStorage.removeItem(TOKEN_KEY);

        if (active) {
          setAuthenticated(false);
        }
      } finally {
        if (active) setCheckingAuth(false);
      }
    }

    void verifySession();

    return () => {
      active = false;
      window.removeEventListener(AUTH_EXPIRED_EVENT, expireSession);
    };
  }, []);

  function handleLogin(token: string) {
    localStorage.setItem(TOKEN_KEY, token);
    setActiveModule('dashboard');
    setAuthenticated(true);
  }

  if (checkingAuth) {
    return (
      <main className="login-page">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Memeriksa autentikasi...</span>
          </div>
          <p className="mt-3 text-secondary">
            Memeriksa sesi login...
          </p>
        </div>
      </main>
    );
  }

  if (!authenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

    return activeModule === 'categories' ? (
          <CategoriesPage
            onBack={() => setActiveModule('dashboard')}
            onLogout={() => void handleLogout()}
          />
        ) : (
          <Dashboard
            onLogout={() => void handleLogout()}
            onOpenCategories={() => setActiveModule('categories')}
          />
        );
    }

export default App;
