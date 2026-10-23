import { useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import Header from '../components/public/Header';
import '../public-site.css';

type Category = {
    id: number;
    name: string;
    slug: string;
};

type Author = {
    id: number;
    name: string;
    profile_photo_path?: string | null;
} | null;

type Media = {
    url?: string;
    path?: string;
    alt_text?: string | null;
} | null;

type Post = {
    id: number;
    title: string;
    slug: string;
    excerpt: string | null;
    body: string;
    published_at: string | null;
    created_at: string;
    user: Author;
    categories: Category[];
    featured_image: Media;
};

type PaginationData = {
    data: Post[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
};

type ApiResponse = {
    success: boolean;
    data: {
        posts: PaginationData;
    };
};

const API_BASE = (
    import.meta.env.VITE_API_BASE_URL || '/api'
).replace(/\/$/, '');

const publicApi = axios.create({
    baseURL: API_BASE,
    headers: {
        Accept: 'application/json',
    },
    timeout: 12000,
});

function imageUrl(media: Media): string {
    if (!media) return '';

    const raw =
        media.url ||
        (media.path
            ? `/storage/${media.path.replace(/^\/+/, '')}`
            : '');

    if (!raw) return '';

    if (/^https?:\/\//i.test(raw)) {
        return raw;
    }

    const apiOrigin = API_BASE.replace(/\/api\/?$/, '');

    return new URL(
        raw,
        `${apiOrigin || window.location.origin}/`,
    ).toString();
}

function dateLabel(value: string | null | undefined): string {
    if (!value) return 'Tanggal tidak tersedia';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return 'Tanggal tidak tersedia';
    }

    return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

function excerpt(post: Post): string {
    if (post.excerpt?.trim()) {
        return post.excerpt;
    }

    const text =
        new DOMParser()
            .parseFromString(post.body || '', 'text/html')
            .body.textContent?.trim() || '';

    return text.length > 180
        ? `${text.slice(0, 180)}…`
        : text;
}

function errorText(error: unknown): string {
    if (axios.isAxiosError(error)) {
        const errors = error.response?.data?.errors as
            | Record<string, string[]>
            | undefined;

        if (errors) {
            return Object.values(errors).flat().join(' ');
        }

        return (
            error.response?.data?.message ||
            'Tidak dapat menghubungi server. Silakan coba lagi.'
        );
    }

    return 'Terjadi kesalahan. Silakan coba lagi.';
}

function getPageNumbers(
    currentPage: number,
    lastPage: number,
): number[] {
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(lastPage, currentPage + 2);

    return Array.from(
        { length: end - start + 1 },
        (_, index) => start + index,
    );
}

export default function AllArticles() {
    const [searchParams, setSearchParams] = useSearchParams();

    const query = (searchParams.get('q') || '').trim();
    const category = (searchParams.get('category') || '').trim();
    const page = Math.max(
        1,
        Number.parseInt(searchParams.get('page') || '1', 10) || 1,
    );

    const [searchInput, setSearchInput] = useState(query);
    const [categories, setCategories] = useState<Category[]>([]);
    const [posts, setPosts] = useState<Post[]>([]);
    const [pagination, setPagination] = useState<PaginationData | null>(
        null,
    );
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        setSearchInput(query);
    }, [query]);

    useEffect(() => {
        let active = true;

        async function loadCategories() {
            try {
                const response = await publicApi.get(
                    '/public/categories/posts',
                );

                if (active) {
                    setCategories(response.data?.data ?? []);
                }
            } catch {
                // Kegagalan memuat kategori tidak menghalangi daftar artikel.
            }
        }

        void loadCategories();

        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        let active = true;

        async function loadArticles() {
            setLoading(true);
            setError('');

            try {
                const response = await publicApi.get<ApiResponse>(
                    '/public/posts',
                    {
                        params: {
                            page,
                            ...(query ? { search: query } : {}),
                            ...(category ? { category } : {}),
                        },
                    },
                );

                if (!active) return;

                const result = response.data?.data?.posts;

                setPosts(result?.data ?? []);
                setPagination(result ?? null);
            } catch (err: unknown) {
                if (!active) return;

                setPosts([]);
                setPagination(null);
                setError(errorText(err));
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        }

        void loadArticles();

        return () => {
            active = false;
        };
    }, [page, query, category]);

    function updateParams(
        updates: Record<string, string>,
        resetPage = true,
    ) {
        const next = new URLSearchParams(searchParams);

        Object.entries(updates).forEach(([key, value]) => {
            if (value) {
                next.set(key, value);
            } else {
                next.delete(key);
            }
        });

        if (resetPage) {
            next.delete('page');
        }

        setSearchParams(next);
    }

    function handleSearch(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        updateParams({
            q: searchInput.trim(),
        });
    }

    function handleCategoryChange(value: string) {
        updateParams({
            category: value,
        });
    }

    function goToPage(nextPage: number) {
        if (
            !pagination ||
            nextPage < 1 ||
            nextPage > pagination.last_page
        ) {
            return;
        }

        const next = new URLSearchParams(searchParams);

        if (nextPage === 1) {
            next.delete('page');
        } else {
            next.set('page', String(nextPage));
        }

        setSearchParams(next);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    return (
        <>
            <Header />

            <main className="main">
                <section className="section">
                    <div className="container">
                        <div className="section-title">
                            <h2>Semua Artikel</h2>
                            <p>
                                Jelajahi artikel terbaru dan temukan
                                informasi yang kamu butuhkan.
                            </p>
                        </div>

                        <div className="row g-3 align-items-end mb-4">
                            <div className="col-lg-8">
                                <form
                                    onSubmit={handleSearch}
                                    role="search"
                                    aria-label="Cari artikel"
                                >
                                    <label
                                        htmlFor="article-search"
                                        className="form-label"
                                    >
                                        Cari artikel
                                    </label>

                                    <div className="input-group">
                                        <input
                                            id="article-search"
                                            type="search"
                                            className="form-control"
                                            placeholder="Masukkan judul atau kata kunci..."
                                            value={searchInput}
                                            maxLength={120}
                                            onChange={(event) =>
                                                setSearchInput(
                                                    event.target.value,
                                                )
                                            }
                                        />

                                        <button
                                            type="submit"
                                            className="btn btn-primary"
                                        >
                                            <i className="bi bi-search me-1" />
                                            Cari
                                        </button>
                                    </div>
                                </form>
                            </div>

                            <div className="col-lg-4">
                                <label
                                    htmlFor="article-category"
                                    className="form-label"
                                >
                                    Filter kategori
                                </label>

                                <select
                                    id="article-category"
                                    className="form-select"
                                    value={category}
                                    onChange={(event) =>
                                        handleCategoryChange(
                                            event.target.value,
                                        )
                                    }
                                >
                                    <option value="">
                                        Semua kategori
                                    </option>

                                    {categories.map((item) => (
                                        <option
                                            key={item.id}
                                            value={item.slug}
                                        >
                                            {item.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {!loading && !error && pagination && (
                            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
                                <p className="mb-0">
                                    {query && (
                                        <>
                                            Hasil pencarian untuk{' '}
                                            <strong>{query}</strong>.{' '}
                                        </>
                                    )}

                                    {category && (
                                        <>
                                            Kategori:{' '}
                                            <strong>
                                                {categories.find(
                                                    (item) =>
                                                        item.slug ===
                                                        category,
                                                )?.name || category}
                                            </strong>.{' '}
                                        </>
                                    )}

                                    Menampilkan{' '}
                                    <strong>
                                        {pagination.total === 0
                                            ? 0
                                            : pagination.from ?? 0}
                                        –
                                        {pagination.to ?? 0}
                                    </strong>{' '}
                                    dari{' '}
                                    <strong>{pagination.total}</strong>{' '}
                                    artikel
                                </p>

                                {(query || category) && (
                                    <button
                                        type="button"
                                        className="btn btn-outline-secondary btn-sm"
                                        onClick={() => {
                                            setSearchInput('');
                                            setSearchParams({});
                                        }}
                                    >
                                        <i className="bi bi-x-circle me-1" />
                                        Hapus filter
                                    </button>
                                )}
                            </div>
                        )}

                        {loading ? (
                            <div
                                className="public-loading py-5 text-center"
                                role="status"
                            >
                                <span
                                    className="spinner-border spinner-border-sm me-2"
                                    aria-hidden="true"
                                />
                                Memuat artikel...
                            </div>
                        ) : error ? (
                            <div className="alert alert-danger" role="alert">
                                <p className="mb-2">{error}</p>

                                <button
                                    type="button"
                                    className="btn btn-outline-danger btn-sm"
                                    onClick={() =>
                                        setSearchParams(
                                            new URLSearchParams(
                                                searchParams,
                                            ),
                                        )
                                    }
                                >
                                    Coba lagi
                                </button>
                            </div>
                        ) : posts.length === 0 ? (
                            <div className="public-empty text-center py-5">
                                <i
                                    className="bi bi-journal-x fs-1"
                                    aria-hidden="true"
                                />

                                <h3 className="mt-3">
                                    Artikel tidak ditemukan
                                </h3>

                                <p>
                                    Coba kata kunci atau kategori lain.
                                </p>

                                {(query || category) && (
                                    <button
                                        type="button"
                                        className="btn btn-primary"
                                        onClick={() => {
                                            setSearchInput('');
                                            setSearchParams({});
                                        }}
                                    >
                                        Tampilkan semua artikel
                                    </button>
                                )}
                            </div>
                        ) : (
                            <>
                                <div className="row gy-4">
                                    {posts.map((post) => {
                                        const image = imageUrl(
                                            post.featured_image,
                                        );

                                        return (
                                            <div
                                                key={post.id}
                                                className="col-md-6 col-lg-4"
                                            >
                                                <article className="h-100">
                                                    <div className="post-img">
                                                        {image ? (
                                                            <Link
                                                                to={`/artikel/${post.slug}`}
                                                                aria-label={`Baca ${post.title}`}
                                                            >
                                                                <img
                                                                    src={image}
                                                                    alt={
                                                                        post.featured_image
                                                                            ?.alt_text ||
                                                                        post.title
                                                                    }
                                                                    className="img-fluid"
                                                                    loading="lazy"
                                                                />
                                                            </Link>
                                                        ) : (
                                                            <Link
                                                                to={`/artikel/${post.slug}`}
                                                                className="post-image-placeholder d-flex align-items-center justify-content-center"
                                                                aria-label={`Baca ${post.title}`}
                                                            >
                                                                <span>JURNAL<br />IDE</span>
                                                            </Link>
                                                        )}
                                                    </div>

                                                    <div className="pt-3">
                                                        <p className="post-category">
                                                            {post.categories
                                                                ?.length ? (
                                                                post.categories.map(
                                                                    (item) => (
                                                                        <button key={ item.id } type="button" className="btn btn-link p-0 me-2" onClick={() =>handleCategoryChange(item.slug) }>
                                                                            {item.name}
                                                                        </button>
                                                                    ),
                                                                )
                                                            ) : (
                                                                <span>Tanpa kategori</span>
                                                            )}
                                                        </p>

                                                        <h2 className="title">
                                                            <Link
                                                                to={`/artikel/${post.slug}`}
                                                            >
                                                                {post.title}
                                                            </Link>
                                                        </h2>

                                                        <p>{excerpt(post)}</p>

                                                        <div className="d-flex align-items-center">
                                                            <span className="author-avatar-fallback me-2" aria-hidden="true"
                                                            >
                                                                {( post.user ?.name || 'R').charAt(0).toUpperCase()}
                                                            </span>

                                                            <div className="post-meta">
                                                                <p className="post-author mb-0">
                                                                    {post.user ?.name || 'Redaksi'}
                                                                </p>

                                                                <p className="post-date mb-0">
                                                                    <time dateTime={post.published_at ||post.created_at }>
                                                                        {dateLabel(post.published_at || post.created_at,)}
                                                                    </time>
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <Link to={`/artikel/${post.slug}`} className="read-more d-inline-block mt-3">
                                                            Baca selengkapnya
                                                            <i className="bi bi-arrow-right ms-1" />
                                                        </Link>
                                                    </div>
                                                </article>
                                            </div>
                                        );
                                    })}
                                </div>

                                {pagination && pagination.last_page > 1 && (
                                    <section id="pagination-3" class="pagination-3 section mt-3">
                                        <div class="container">
                                            <ul className="pagination justify-content-center">
                                                <li className={`${page <= 1 ? 'disabled' : ''}`}>
                                                    <Link disabled={page <= 1} onClick={() => goToPage(page - 1)} aria-label="Halaman sebelumnya">
                                                        <i className="bi bi-chevron-left" />
                                                    </Link>
                                                </li>

                                                {getPageNumbers(page, pagination.last_page).map((pageNumber) => (
                                                    <li key={pageNumber} className={`${pageNumber === page ? 'active' : ''}`}>
                                                        <Link className="page-link" aria-current={pageNumber === page ? 'page' : undefined} onClick={() => goToPage(pageNumber)}>
                                                            {pageNumber}
                                                        </Link>
                                                    </li>
                                                ))}

                                                <li className={`${ page >= pagination.last_page ? 'disabled' : ''}`}>
                                                    <Link disabled={page >= pagination.last_page } onClick={() => goToPage(page + 1) } aria-label="Halaman berikutnya">
                                                        <i className="bi bi-chevron-right" />
                                                    </Link>
                                                </li>
                                            </ul>
                                        </div>

                                        <p className="mt-3 text-center text-muted small">
                                            Halaman {page} dari{' '}
                                            {pagination.last_page}
                                        </p>
                                    </section>
                                )}
                            </>
                        )}
                    </div>
                </section>
            </main>
        </>
    );
}
