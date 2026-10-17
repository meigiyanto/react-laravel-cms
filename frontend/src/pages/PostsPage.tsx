import { useCallback, useEffect, useState, type FormEvent } from 'react';
import axios from 'axios';
import api from '../api/client';
import AdminLayout from '../components/AdminLayout';
import { type ActiveModule } from '../components/Sidebar';

type Status = 'draft' | 'published' | 'archived';

type Post = {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  body: string;
  status: Status;
  created_at: string;
};

type PostForm = {
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  status: Status;
};

type Pagination = {
  current_page: number;
  last_page: number;
  total: number;
  data: Post[];
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

type NavigationProps = {
  onNavigate: (module: ActiveModule) => void;
  onLogout: () => void;
};

export default function PostsPage({ onNavigate, onLogout }: NavigationProps) {
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

  const loadPosts = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await api.get('/posts', {
        params: {
          page,
          search: search.trim() || undefined,
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
    const timer = window.setTimeout(() => {
      void loadPosts();
    }, 250);

    return () => window.clearTimeout(timer);
  }, [loadPosts]);

  function openCreateForm() {
    setEditing(null);
    setForm(emptyForm);
    setError('');
    setNotice('');
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
        title: form.title.trim(),
        slug: form.slug.trim() || null,
        excerpt: form.excerpt.trim() || null,
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
      setForm(emptyForm);

      if (page !== 1) {
        setPage(1);
      } else {
        await loadPosts();
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function deletePost(post: Post) {
    if (!window.confirm(
      `Hapus artikel "${post.title}"? Tindakan ini tidak dapat dibatalkan.`,
    )) {
      return;
    }

    setError('');
    setNotice('');

    try {
      await api.delete(`/posts/${post.id}`);
      setNotice('Artikel berhasil dihapus.');

      if (posts.length === 1 && page > 1) {
        setPage((current) => current - 1);
      } else {
        await loadPosts();
      }
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <AdminLayout
      active="posts"
      onNavigate={onNavigate}
      onLogout={onLogout}
      title="Artikel"
      breadcrumb="Workspace / Konten / Artikel"
      actions={
        <button
          className="btn btn-primary"
          type="button"
          onClick={openCreateForm}
        >
          + Artikel Baru
        </button>
      }
    >
      {error && (
        <div className="alert alert-danger mt-3" role="alert">
          {error}
          <button
            className="btn-close float-end"
            type="button"
            aria-label="Tutup"
            onClick={() => setError('')}
          />
        </div>
      )}

      {notice && (
        <div className="alert alert-success mt-3" role="status">
          {notice}
          <button
            className="btn-close float-end"
            type="button"
            aria-label="Tutup"
            onClick={() => setNotice('')}
          />
        </div>
      )}

      <section className="content-panel mt-4">
        <div className="panel-heading">
          <div>
            <h3>Daftar Artikel</h3>
            <p>Buat, edit, cari, dan kelola status publikasi artikel.</p>
          </div>
          <span className="total-badge">{total} artikel</span>
        </div>

        <div className="toolbar">
          <div className="search-box">
            <span aria-hidden="true">⌕</span>
            <input
              className="form-control"
              type="search"
              placeholder="Cari judul atau slug artikel..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              aria-label="Cari artikel"
            />
          </div>

          <select
            className="form-select status-filter"
            value={statusFilter}
            onChange={(event) => {
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
                <tr>
                  <td colSpan={4} className="empty-state">
                    Memuat artikel...
                  </td>
                </tr>
              ) : posts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="empty-state">
                    <div className="empty-icon">▤</div>
                    <strong>Belum ada artikel</strong>
                    <p>Buat artikel pertama atau ubah filter pencarian.</p>
                    <button
                      className="btn btn-outline-primary btn-sm"
                      type="button"
                      onClick={openCreateForm}
                    >
                      Buat artikel
                    </button>
                  </td>
                </tr>
              ) : (
                posts.map((post) => (
                  <tr key={post.id}>
                    <td>
                      <div className="post-title">{post.title}</div>
                      <div className="post-slug">/{post.slug}</div>
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
                        <button
                          className="btn btn-sm btn-light"
                          type="button"
                          onClick={() => void openEditForm(post)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          type="button"
                          onClick={() => void deletePost(post)}
                        >
                          Hapus
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
          <span>Halaman {page} dari {lastPage}</span>
          <div className="d-flex gap-2">
            <button
              className="btn btn-sm btn-outline-secondary"
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((current) => current - 1)}
            >
              Sebelumnya
            </button>
            <button
              className="btn btn-sm btn-outline-secondary"
              type="button"
              disabled={page >= lastPage || loading}
              onClick={() => setPage((current) => current + 1)}
            >
              Berikutnya
            </button>
          </div>
        </div>
      </section>

      {showForm && (
        <div className="modal-backdrop-custom" role="presentation">
          <section
            className="editor-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="post-editor-title"
          >
            <div className="modal-heading">
              <div>
                <h2 id="post-editor-title">
                  {editing ? 'Edit Artikel' : 'Buat Artikel Baru'}
                </h2>
                <p>Lengkapi informasi artikel di bawah ini.</p>
              </div>
              <button
                className="btn-close"
                type="button"
                aria-label="Tutup"
                disabled={saving}
                onClick={() => setShowForm(false)}
              />
            </div>

            <form onSubmit={savePost}>
              <div className="mb-3">
                <label className="form-label" htmlFor="post-title">
                  Judul artikel *
                </label>
                <input
                  id="post-title"
                  className="form-control"
                  required
                  maxLength={255}
                  value={form.title}
                  onChange={(event) => setForm({
                    ...form, title: event.target.value,
                  })}
                />
              </div>

              <div className="mb-3">
                <label className="form-label" htmlFor="post-slug">
                  Slug (opsional)
                </label>
                <input
                  id="post-slug"
                  className="form-control"
                  maxLength={255}
                  placeholder="Dibuat otomatis jika kosong"
                  value={form.slug}
                  onChange={(event) => setForm({
                    ...form, slug: event.target.value,
                  })}
                />
              </div>

              <div className="mb-3">
                <label className="form-label" htmlFor="post-excerpt">
                  Ringkasan
                </label>
                <textarea
                  id="post-excerpt"
                  className="form-control"
                  rows={2}
                  value={form.excerpt}
                  onChange={(event) => setForm({
                    ...form, excerpt: event.target.value,
                  })}
                />
              </div>

              <div className="mb-3">
                <label className="form-label" htmlFor="post-body">
                  Isi artikel *
                </label>
                <textarea
                  id="post-body"
                  className="form-control editor-body"
                  rows={7}
                  required
                  value={form.body}
                  onChange={(event) => setForm({
                    ...form, body: event.target.value,
                  })}
                />
              </div>

              <div className="mb-4">
                <label className="form-label" htmlFor="post-status">
                  Status *
                </label>
                <select
                  id="post-status"
                  className="form-select"
                  value={form.status}
                  onChange={(event) => setForm({
                    ...form,
                    status: event.target.value as Status,
                  })}
                >
                  <option value="draft">Draf</option>
                  <option value="published">Dipublikasikan</option>
                  <option value="archived">Diarsipkan</option>
                </select>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-light"
                  disabled={saving}
                  onClick={() => setShowForm(false)}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving
                    ? 'Menyimpan...'
                    : editing
                      ? 'Simpan Perubahan'
                      : 'Buat Artikel'}
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
  const labels: Record<Status, string> = {
    draft: 'Draf',
    published: 'Terbit',
    archived: 'Arsip',
  };

  return <span className={`status-badge ${status}`}>{labels[status]}</span>;
}
