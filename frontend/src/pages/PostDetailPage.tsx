import { useEffect, useState } from 'react';
import axios from 'axios';
import api from '../api/client';
import AdminLayout from '../components/AdminLayout';
import type { ActiveModule } from '../components/Sidebar';

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

type MediaAsset = {
    id: number;
    path: string;
    url?: string | null;
    original_name: string;
    alt_text: string | null;
};

type PostDetail = {
    id: number;
    title: string;
    slug: string;
    excerpt: string | null;
    body: string;
    status: Status;
    created_at: string;
    updated_at?: string;
    published_at: string | null;
    user: {
        id: number;
        name: string;
    } | null;
    categories: Category[];
    tags: Tag[];
    featured_image_id: number | null;
    featured_image: MediaAsset | null;
    meta_title: string | null;
    meta_description: string | null;
};

type Props = {
    postId: number;
    onNavigate: (module: ActiveModule) => void;
    onLogout: () => void;
    onBack: () => void;
    onEdit: (postId: number) => void;
};

function getErrorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
        return error.response?.data?.message
            || 'Gagal memuat detail artikel dari server.';
    }

    return 'Terjadi kesalahan yang tidak diketahui.';
}

function formatDate(value: string | null | undefined): string {
    if (!value) return '—';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return '—';

    return new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'long',
        timeStyle: 'short',
    }).format(date);
}

function getMediaUrl(media: MediaAsset): string {
    const url = media.url
        || `/storage/${media.path.replace(/^\/+/, '')}`;

    if (/^https?:\/\//i.test(url)) {
        return url;
    }

    const base = (api.defaults.baseURL || window.location.origin)
        .replace(/\/api\/?$/, '')
        .replace(/\/+$/, '');

    return new URL(url, `${base}/`).toString();
}

function StatusBadge({ status }: { status: Status }) {
    const labels: Record<Status, string> = {
        draft: 'Draf',
        published: 'Dipublikasikan',
        archived: 'Diarsipkan',
    };

    return (
        <span className={`status-badge ${status}`}>
            {labels[status]}
        </span>
    );
}

export default function PostDetailPage({ onNavigate, postId, onLogout, onBack, onEdit }: Props) {
    
    const [post, setPost] = useState<PostDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let active = true;

        async function loadPost() {
            setLoading(true);
            setError('');
            setPost(null);

            try {
                const response = await api.get(`/posts/${postId}`);

                if (active) {
                    setPost(response.data.data as PostDetail);
                }
            } catch (err) {
                if (active) {
                    setError(getErrorMessage(err));
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        }

        void loadPost();

        return () => {
            active = false;
        };
    }, [postId]);

    return (
        <AdminLayout
            active="posts"
            onNavigate={onNavigate}
            onLogout={onLogout}
            title="Detail Artikel"
            breadcrumb="Workspace / Konten / Artikel / Detail"
            actions={
                post ? (
                    <button
                        className="btn btn-primary"
                        type="button"
                        onClick={() => onEdit(post.id)}
                    >
                        Edit Artikel
                    </button>
                ) : undefined
            }
        >
            
            <div className="mt-3 mb-3">
                <button
                    className="btn btn-outline-secondary"
                    type="button"
                    onClick={onBack}
                >
                    ← Kembali ke Daftar Artikel
                </button>
            </div>

            {loading && (
                <div className="content-panel text-center py-5" role="status">
                    <div
                        className="spinner-border text-primary"
                        aria-hidden="true"
                    />
                    <p className="mt-3 mb-0">Memuat detail artikel...</p>
                </div>
            )}

            {!loading && error && (
                <div className="alert alert-danger" role="alert">
                    <p className="mb-2">{error}</p>
                    <button
                        className="btn btn-outline-danger btn-sm"
                        type="button"
                        onClick={() => {
                            setPost(null);
                            setError('');
                            setLoading(true);

                            void api.get(`/posts/${postId}`)
                                .then((response) => {
                                    setPost(response.data.data as PostDetail);
                                })
                                .catch((err: unknown) => {
                                    setError(getErrorMessage(err));
                                })
                                .finally(() => setLoading(false));
                        }}
                    >
                        Coba Lagi
                    </button>
                </div>
            )}

            {!loading && !error && post && (
                <div className="row g-4">
                    <div className="col-12 col-xl-8">
                        <article className="content-panel">
                            <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
                                <StatusBadge status={post.status} />
                                <span className="text-muted small">
                                    ID artikel: {post.id}
                                </span>
                            </div>

                            <h2 className="mb-3">{post.title}</h2>

                            <div className="text-muted small mb-4">
                                <div>Slug: <strong>{post.slug}</strong></div>
                                <div>
                                    Penulis: <strong>{post.user?.name || 'Tidak diketahui'}</strong>
                                </div>
                                <div>
                                    Dibuat: <strong>{formatDate(post.created_at)}</strong>
                                </div>
                                <div>
                                    Dipublikasikan: <strong>{formatDate(post.published_at)}</strong>
                                </div>
                                {post.updated_at && (
                                    <div>
                                        Terakhir diperbarui:{' '}
                                        <strong>{formatDate(post.updated_at)}</strong>
                                    </div>
                                )}
                            </div>

                            {post.featured_image && (
                                <figure className="mb-4">
                                    <img
                                        src={getMediaUrl(post.featured_image)}
                                        alt={
                                            post.featured_image.alt_text
                                            || post.title
                                        }
                                        className="img-fluid rounded border"
                                        style={{
                                            display: 'block',
                                            maxHeight: '440px',
                                            width: '100%',
                                            objectFit: 'contain',
                                        }}
                                    />
                                    <figcaption className="text-muted small mt-2">
                                        {post.featured_image.alt_text
                                            || post.featured_image.original_name}
                                    </figcaption>
                                </figure>
                            )}

                            {post.excerpt && (
                                <section className="mb-4">
                                    <h3 className="h5">Ringkasan</h3>
                                    <p className="text-muted mb-0">
                                        {post.excerpt}
                                    </p>
                                </section>
                            )}

                            <section>
                                <h3 className="h5 mb-3">Isi Artikel</h3>
                                <div
                                    className="post-detail-body"
                                    style={{
                                        whiteSpace: 'pre-wrap',
                                        overflowWrap: 'anywhere',
                                        lineHeight: 1.8,
                                    }}
                                >
                                    {post.body || 'Artikel belum memiliki isi.'}
                                </div>
                            </section>
                        </article>
                    </div>

                    <aside className="col-12 col-xl-4">
                        <section className="content-panel mb-4">
                            <h3 className="h5 mb-3">Klasifikasi</h3>

                            <div className="mb-3">
                                <strong className="d-block mb-2">
                                    Kategori
                                </strong>
                                {post.categories.length > 0 ? (
                                    <div className="d-flex flex-wrap gap-2">
                                        {post.categories.map((category) => (
                                            <span
                                                className="badge text-bg-light border"
                                                key={category.id}
                                            >
                                                {category.name}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-muted small mb-0">
                                        Belum ada kategori.
                                    </p>
                                )}
                            </div>

                            <div>
                                <strong className="d-block mb-2">Tags</strong>
                                {post.tags.length > 0 ? (
                                    <div className="d-flex flex-wrap gap-2">
                                        {post.tags.map((tag) => (
                                            <span
                                                className="badge text-bg-light border"
                                                key={tag.id}
                                            >
                                                {tag.name}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-muted small mb-0">
                                        Belum ada tag.
                                    </p>
                                )}
                            </div>
                        </section>

                        <section className="content-panel">
                            <h3 className="h5 mb-3">SEO</h3>

                            <div className="mb-3">
                                <strong className="d-block mb-1">
                                    Meta title
                                </strong>
                                <p className="mb-0 text-break">
                                    {post.meta_title || 'Belum diatur'}
                                </p>
                            </div>

                            <div>
                                <strong className="d-block mb-1">
                                    Meta description
                                </strong>
                                <p className="mb-0 text-break">
                                    {post.meta_description || 'Belum diatur'}
                                </p>
                            </div>
                        </section>
                    </aside>
                </div>
            )}
        </AdminLayout>
    );
}
