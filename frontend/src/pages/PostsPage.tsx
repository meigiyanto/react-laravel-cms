import { useCallback, useEffect, useState, lazy, Suspense, type FormEvent } from 'react';
import axios from 'axios';
import api from '../api/client';
import AdminLayout from '../components/AdminLayout';
import { type ActiveModule } from '../components/Sidebar';
// import { dummyArticles } from '../data/posts';
import PostDetailPage from './PostDetailPage';
import { sanitizeArticleHtml } from '../utils/sanitizeHtml';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faPaperPlane } from '@fortawesome/free-solid-svg-icons';

const RichTextEditor = lazy(() => import('../components/RichTextEditor'));
const Pagination = lazy(() => import('../components/Pagination'));

type Status = 'draft' | 'published' | 'archived';

type Category = {
    id: number;
    name: string;
    slug: string;
};

type Tag = {
    id: number;
    name: string;
    slug: string;
};

type Post = {
    id: number;
    title: string;
    slug: string;
    excerpt: string | null;
    body: string;
    status: Status;
    created_at: string;
    published_at?: string | null;
    categories: Category[];
    tags: Tag[];
    is_featured: boolean;
    allow_comments: boolean;
    user?: {
        id: number;
        name: string;
        role?: {
            id: number;
            name: string;
            slug: string;
        } | null;
    } | null;
    featured_image_id: number | null;
    featured_image: MediaAsset | null;
    meta_title: string | null;
    meta_description: string | null;
};

export type PostForm = {
    title: string;
    slug: string;
    excerpt: string;
    body: string;
    status: Status;
    category_ids: number[];
    tag_ids: number[];
    is_featured: boolean;
    allow_comments: boolean;
    featured_image_id: string;
    meta_title: string;
    meta_description: string;
};

const emptyForm: PostForm = {
    title: '',
    slug: '',
    excerpt: '',
    body: '',
    status: 'draft',
    category_ids: [],
    tag_ids: [],
    is_featured: false,
    allow_comments: true,
    featured_image_id: '',
    meta_title: '',
    meta_description: '',
};

type PostsPaginationResponse = {
    current_page: number;
    last_page: number;
    total: number;
    data: Post[];
};

type MediaAsset = {
    id: number;
    url: string;
    path?: string;
    original_name: string;
    alt_text: string | null;
};

function getMediaUrl(media: MediaAsset): string {
    const url = media.url ||
        (media.path ? `/storage/${media.path.replace(/^\/+/, '')}` : '');

    if (!url) return '';

    if (/^https?:\/\//i.test(url)) {
        return url;
    }

    const base = (api.defaults.baseURL || window.location.origin)
        .replace(/\/api\/?$/, '')
        .replace(/\/+$/, '');

    return new URL(url, `${base}/`).toString();
}

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
    const [posts, setPosts] = useState <Post[]> ([]);
    const [detailPostId, setDetailPostId] = useState<number | null>(null);
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [editing, setEditing] = useState <Post | null> (null);
    const [form, setForm] = useState <PostForm> (emptyForm);
    const [showForm, setShowForm] = useState(false);

    const [categories, setCategories] = useState<Category[]>([]);
    const [tags, setTags] = useState<Tag[]>([]);
    const [mediaItems, setMediaItems] = useState<MediaAsset[]>([]);
    const [loadingOptions, setLoadingOptions] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

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

            const result: PostsPaginationResponse = response.data.data;

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
        setFieldErrors({});
        setError('');
        setNotice('');
        setShowForm(true);
        void loadEditorOptions();
    }

    async function openEditForm(post: Pick<Post, 'id'>) {
        setError('');

        try {
            const response = await api.get(`/posts/${post.id}`);
            const item: Post = response.data.data;

            setEditing(item);
            setForm({
                title: item.title,
                slug: item.slug,
                excerpt: item.excerpt ?? '',
                body: item.body,
                status: item.status,
                category_ids: item.categories.map((category) => category.id),
                tag_ids: item.tags.map((tag) => tag.id),
                is_featured: item.is_featured ?? false,
                allow_comments: item.allow_comments ?? true,
                featured_image_id: item.featured_image_id ? String(item.featured_image_id) : '',
                meta_title: item.meta_title ?? '',
                meta_description: item.meta_description ?? '',
            });
            
            setFieldErrors({});
            setShowForm(true);
            void loadEditorOptions();
        } catch (err) {
            setError(errorMessage(err));
        }
    }

    async function savePost(event: FormEvent <HTMLFormElement>) {
        event.preventDefault();
        
        const parsedBody = new DOMParser().parseFromString(form.body, 'text/html');
        const hasText = Boolean(parsedBody.body.textContent?.trim());
        const hasImage = parsedBody.body.querySelector('img[src]') !== null;
    
        if (!hasText && !hasImage) {
            setFieldErrors((current) => ({
                ...current,
                body: 'Isi artikel wajib diisi.',
            }));
            return;
        }
    
        setSaving(true);
        setError('');
        setNotice('');
        setFieldErrors({});

        try {
            const payload = {
                title: form.title.trim(),
                slug: form.slug.trim() || null,
                excerpt: form.excerpt.trim() || null,
                body: sanitizeArticleHtml(form.body),
                status: form.status,
                category_ids: form.category_ids,
                tag_ids: form.tag_ids,
                is_featured: form.is_featured,
                allow_comments: form.allow_comments,
                featured_image_id: form.featured_image_id ? Number(form.featured_image_id) : null,
                meta_title: form.meta_title.trim() || null,
                meta_description: form.meta_description.trim() || null,
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
            if (axios.isAxiosError(err)) {
                const errors = err.response?.data?.errors;
        
                if (errors && typeof errors === 'object') {
                    setFieldErrors(
                        Object.fromEntries(
                            Object.entries(errors).map(([key, messages]) => [
                                key,
                                Array.isArray(messages)
                                    ? messages.join(' ')
                                    : String(messages),
                            ]),
                        ),
                    );
                } else {
                    setError(errorMessage(err));
                }
            } else {
                setError(errorMessage(err));
            }
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
    
    const loadEditorOptions = useCallback(async () => {
        setLoadingOptions(true);
    
        try {
            const [categoryItems, tagResponse, mediaItemsResult] =
                await Promise.all([
                    loadAllPages<Category>('/categories'),
                    api.get('/tags'),
                    loadAllPages<MediaAsset>('/media'),
                ]);
    
            setCategories(categoryItems);
            setTags(tagResponse.data.data);
            setMediaItems(mediaItemsResult);
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setLoadingOptions(false);
        }
    }, []);

    if (detailPostId !== null) {
        return (
            <PostDetailPage
                postId={detailPostId}
                onNavigate={onNavigate}
                onLogout={onLogout}
                onBack={() => setDetailPostId(null)}
                onEdit={(postId) => {
                    setDetailPostId(null);
                    void openEditForm({ id: postId });
                }}
            />
        );
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
                    <FontAwesomeIcon icon={faPlus} /> Artikel Baru
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

            <section className="welcome-panel">
                <div>
                    <span className="eyebrow">CONTENT MANAGEMENT</span>
                    <h2>Kelola konten artikel.</h2>
                    <p>Buat konten artikel yang menarik dan menginspirasi</p>
                </div>
                <div className="welcome-icon" aria-hidden="true">
                    <FontAwesomeIcon icon={faPaperPlane} />
                </div>
            </section>
            
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
                            ): posts.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="empty-state">
                                        <div className="empty-icon">
                                            <FontAwesomeIcon icon={faPaperPlane} />
                                        </div>
                                        <strong>Belum ada artikel</strong>
                                        <p>
                                            Buat artikel pertama atau ubah filter pencarian.
                                        </p>
                                        <button
                                            className="btn btn-outline-primary btn-sm"
                                            type="button"
                                            onClick={openCreateForm}
                                        >
                                            Buat artikel
                                        </button>
                                    </td>
                                </tr>
                            ): (
                                posts.map((post) => (
                                    <tr key={post.id}>
                                        <td>
                                            <div className="post-title">
                                                {post.title}
                                            </div>
                                            <div className="post-slug">
                                                /{post.slug}
                                            </div>
                                            
                                            <div className="small text-muted mt-1">
                                                Penulis: {post.user?.name ?? 'Pengguna tidak tersedia'}
                                                {' · '}
                                                Role: {post.user?.role?.name ?? 'Tanpa role'}
                                            </div>
                                            
                                            <div className="d-flex flex-wrap gap-1 mt-1">
                                                {post.is_featured && (
                                                    <span className="badge text-bg-warning">Unggulan</span>
                                                )}
                                                <span
                                                    className={`badge ${
                                                        post.allow_comments ? 'text-bg-success' : 'text-bg-secondary'
                                                    }`}
                                                >
                                                    {post.allow_comments ? 'Komentar aktif' : 'Komentar nonaktif'}
                                                </span>
                                            </div>
                                        </td>
                                        <td><StatusBadge status={post.status} /></td>
                                        <td className="date-cell">
                                            {new Date(post.created_at).toLocaleDateString('id-ID', {
                                                day: '2-digit',
                                                month: 'short',
                                                year: 'numeric'
                                            })}
                                        </td>
                                        <td>
                                            <div className="d-flex justify-content-end gap-2">
                                                <button
                                                    className="btn btn-sm btn-outline-primary"
                                                    type="button"
                                                    onClick={() => setDetailPostId(post.id)}
                                                >
                                                    Detail
                                                </button>
                                                <button
                                                    className="btn btn-sm btn-outline-warning"
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
                
                <Pagination
                    currentPage={page}
                    lastPage={lastPage}
                    total={total}
                    perPage={10}
                    loading={loading}
                    itemLabel="artikel"
                    onPageChange={setPage}
                />
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
                                    {editing ? 'Edit Artikel': 'Buat Artikel Baru'}
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
                            <div className="row">
                                <div className="col-md-8">
                                    <div className="mb-3">
                                        <label className="form-label" htmlFor="post-title">Judul artikel *</label>
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
                                        <label className="form-label" htmlFor="post-slug">Slug (opsional)</label>
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
                                        <label className="form-label" htmlFor="post-excerpt">Ringkasan</label>
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
                                        <label className="form-label" htmlFor="post-body">Isi artikel *</label>
                                        <Suspense
                                            fallback={
                                                <div className="form-control py-3" role="status">
                                                    Memuat editor artikel...
                                                </div>
                                            }
                                        >
                                            <RichTextEditor
                                                value={form.body}
                                                onChange={(html) => {
                                                    setForm((current) => ({
                                                        ...current,
                                                        body: html,
                                                    }));
                                        
                                                    setFieldErrors((current) => {
                                                        const remaining = { ...current };
                                                        delete remaining.body;
                                                        return remaining;
                                                    });
                                                }}
                                                mediaItems={mediaItems}
                                                disabled={saving}
                                            />
                                        </Suspense>
        
                                        <small className="text-muted d-block mt-2">
                                            Gunakan toolbar untuk heading, format teks, tautan, daftar,
                                            dan gambar. Unggah gambar terlebih dahulu melalui menu Media
                                            agar dapat dipilih dari Media Library.
                                        </small>
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label" htmlFor="post-featured-image">Gambar unggulan</label>
                                        <select
                                            id="post-featured-image"
                                            className="form-select"
                                            value={form.featured_image_id}
                                            disabled={loadingOptions}
                                            onChange={(event) => setForm({
                                                ...form,
                                                featured_image_id: event.target.value,
                                            })}
                                        >
                                            <option value="">Tanpa gambar unggulan</option>
                                            {mediaItems.map((media) => (
                                                <option key={media.id} value={media.id}>
                                                    {media.original_name}
                                                    {media.alt_text ? ` — ${media.alt_text}` : ''}
                                                </option>
                                            ))}
                                        </select>
                                    
                                        {form.featured_image_id && (
                                            <div className="mt-3">
                                                {(() => {
                                                    const selected = mediaItems.find((media) => String(media.id) === form.featured_image_id,);
                                    
                                                    return selected ? (
                                                        <img
                                                            src={getMediaUrl(selected)}
                                                            alt={selected.alt_text || selected.original_name}
                                                            className="img-thumbnail"
                                                            style={{
                                                                maxWidth: '240px',
                                                                maxHeight: '180px',
                                                                objectFit: 'contain',
                                                            }}
                                                            onError={(event) => {
                                                                event.currentTarget.style.display = 'none';
                                                            }}
                                                        />
                                                    ) : null;
                                                })()}
                                            </div>
                                        )}
                                    
                                        {fieldErrors.featured_image_id && (
                                            <div className="text-danger small">
                                                {fieldErrors.featured_image_id}
                                            </div>
                                        )}
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label" htmlFor="post-meta-title">Meta title</label>
                                        <input
                                            id="post-meta-title"
                                            className="form-control"
                                            maxLength={255}
                                            value={form.meta_title}
                                            onChange={(event) => setForm({
                                                ...form,
                                                meta_title: event.target.value,
                                            })}
                                        />
                                        <small className="text-muted">
                                            {form.meta_title.length}/255 karakter
                                        </small>
                                        {fieldErrors.meta_title && (
                                            <div className="text-danger small">
                                                {fieldErrors.meta_title}
                                            </div>
                                        )}
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label" htmlFor="post-meta-description">Meta description</label>
                                        <textarea
                                            id="post-meta-description"
                                            className="form-control"
                                            rows={3}
                                            maxLength={500}
                                            value={form.meta_description}
                                            onChange={(event) => setForm({
                                                ...form,
                                                meta_description: event.target.value,
                                            })}
                                        />
                                        <small className="text-muted">
                                            {form.meta_description.length}/500 karakter
                                        </small>
                                        {fieldErrors.meta_description && (
                                            <div className="text-danger small">
                                                {fieldErrors.meta_description}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="col-md-4">
                                    <div className="mb-4">
                                        <label className="form-label" htmlFor="post-status">Status *</label>
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
                                    <div className="mb-3">
                                        <label className="form-label" htmlFor="post-categories">Kategori</label>
                                        <select
                                            id="post-categories"
                                            className="form-select"
                                            multiple
                                            size={Math.min(Math.max(categories.length, 2), 6)}
                                            disabled={loadingOptions}
                                            value={form.category_ids.map(String)}
                                            onChange={(event) => {
                                                setForm({
                                                    ...form,
                                                    category_ids: Array.from(event.currentTarget.selectedOptions, (option) => Number(option.value))
                                                });
                                            }}
                                        >
                                            {categories.map((category) => (
                                                <option key={category.id} value={category.id}>
                                                    {category.name}
                                                </option>
                                            ))}
                                        </select>
                                        <small className="text-muted">
                                            Pilih satu atau beberapa kategori. Gunakan Ctrl atau Cmd
                                            untuk memilih beberapa opsi pada desktop.
                                        </small>
                                        {fieldErrors.category_ids && (
                                            <div className="text-danger small">
                                                {fieldErrors.category_ids}
                                            </div>
                                        )}
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label" htmlFor="post-tags">Tag</label>
                                        <select
                                            id="post-tags"
                                            className="form-select"
                                            multiple
                                            size={Math.min(Math.max(tags.length, 2), 6)}
                                            disabled={loadingOptions}
                                            value={form.tag_ids.map(String)}
                                            onChange={(event) => {
                                                setForm({
                                                    ...form,
                                                    tag_ids: Array.from(
                                                        event.currentTarget.selectedOptions,
                                                        (option) => Number(option.value),
                                                    ),
                                                });
                                            }}
                                        >
                                            {tags.map((tag) => (
                                                <option key={tag.id} value={tag.id}>
                                                    {tag.name}
                                                </option>
                                            ))}
                                        </select>
                                        {fieldErrors.tag_ids && (
                                            <div className="text-danger small">
                                                {fieldErrors.tag_ids}
                                            </div>
                                        )}
                                    </div>
                                    <div className="mb-3">
                                        <div className="form-check">
                                            <input
                                                id="post-is-featured"
                                                className="form-check-input"
                                                type="checkbox"
                                                checked={form.is_featured}
                                                disabled={saving}
                                                onChange={(event) =>
                                                    setForm((current) => ({
                                                        ...current,
                                                        is_featured: event.target.checked,
                                                    }))
                                                }
                                            />
                                            <label className="form-check-label" htmlFor="post-is-featured">
                                                Artikel unggulan
                                            </label>
                                        </div>
                                        <small className="text-muted">
                                            Tampilkan artikel ini di kelompok Featured Posts pada halaman publik.
                                        </small>
                                    </div>
                                    
                                    <div className="mb-3">
                                        <div className="form-check">
                                            <input
                                                id="post-allow-comments"
                                                className="form-check-input"
                                                type="checkbox"
                                                checked={form.allow_comments}
                                                disabled={saving}
                                                onChange={(event) =>
                                                    setForm((current) => ({
                                                        ...current,
                                                        allow_comments: event.target.checked,
                                                    }))
                                                }
                                            />
                                            <label className="form-check-label" htmlFor="post-allow-comments">
                                                Izinkan komentar publik
                                            </label>
                                        </div>
                                        <small className="text-muted">
                                            Jika dinonaktifkan, pengunjung tidak dapat mengirim komentar baru.
                                        </small>
                                    </div>
                                </div>
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
                                    ? 'Menyimpan...': editing
                                    ? 'Simpan Perubahan': 'Buat Artikel'}
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
    const labels: Record < Status, string > = {
        draft: 'Draf',
        published: 'Terbit',
        archived: 'Arsip',
    };
    
    return <span className={`status-badge ${status}`}>{labels[status]}</span>;
}

async function loadAllPages<T>(url: string): Promise<T[]> {
    const first = await api.get(url, {
        params: { page: 1 },
    });

    const paginator = first.data.data;
    const items: T[] = [...paginator.data];

    for (let page = 2; page <= paginator.last_page; page++) {
        const response = await api.get(url, {
            params: { page },
        });

        items.push(...response.data.data.data);
    }

    return items;
}