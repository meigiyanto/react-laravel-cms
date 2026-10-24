import { useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import Header from '../../components/public/Header';
import Footer from '../../components/public/Footer';
import BackToTop from '../../components/public/BackToTop';
import '../../public-site.css';

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
    const raw = media.url || (media.path ? `/storage/${media.path.replace(/^\/+/, '')}` : '');

    if (!raw) return '';

    if (/^https?:\/\//i.test(raw)) {
        return raw;
    }

    const apiOrigin = API_BASE.replace(/\/api\/?$/, '');
    return new URL(raw,`${apiOrigin || window.location.origin}/`).toString();
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

function errorText(error: unknown): string {
    if (axios.isAxiosError(error)) {
        const errors = error.response?.data?.errors as
            | Record<string, string[]>
            | undefined;

        if (errors) {
            return Object.values(errors).flat().join(' ');
        }

        return (error.response?.data?.message || 'Unable to contact the server. Please try again.');
    }

    return 'An error occurred. Please try again.';
}

function getPageNumbers(currentPage: number,lastPage: number): number[] {
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(lastPage, currentPage + 2);

    return Array.from({ length: end - start + 1 },(_, index) => start + index,);
}

export default function AllArticles() {
    const [searchParams, setSearchParams] = useSearchParams();

    const query = (searchParams.get('q') || '').trim();
    const category = (searchParams.get('category') || '').trim();
    const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10) || 1);

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
                const response = await publicApi.get('/public/categories/posts',);

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
                const response = await publicApi.get<ApiResponse>('/public/posts',
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
        if ( !pagination || nextPage < 1 || nextPage > pagination.last_page
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
                <div className="page-title">
                    <div className="breadcrumbs">
                        <nav aria-label="breadcrumb">
                            <ol className="breadcrumb">
                                <li className="breadcrumb-item"><a href="#"><i className="bi bi-house"></i> Home</a></li>
                                
                                <li className="breadcrumb-item active current">All Articless</li>
                            </ol>
                        </nav>
                    </div>
                    
                    <div className="title-wrapper">
                        <h1>All Atrticles</h1>
                        <p>
                            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut elit tellus, luctus nec ullamcorper mattis, pulvinar dapibus leo.
                        </p>
                    </div>
                </div>
                
                <section className="section">
                    <div className="container">
                        
                        <div className="section-title">
                            <h2>All Article</h2>
                            <p>Explore the latest articles and find the information you need.</p>
                        </div>

                        <div className="row g-3 align-items-end mb-4">
                            <div className="col-lg-8">
                                <form onSubmit={handleSearch} role="search" aria-label="Cari artikel">
                                    <label htmlFor="article-search" className="form-label">Search article</label>
                                    <div className="input-group">
                                        <input id="article-search" type="search" className="form-control" placeholder="Input title or category..." value={searchInput} maxLength={120} onChange={(event) => setSearchInput(event.target.value)} />
                                        <button type="submit" className="btn btn-outline-primary">
                                            <i className="bi bi-search me-1" />
                                            Search
                                        </button>
                                    </div>
                                </form>
                            </div>

                            <div className="col-lg-4">
                                <label htmlFor="article-category" className="form-label">Filter category</label>
                                <select id="article-category" className="form-select" value={category} onChange={(event) => handleCategoryChange(event.target.value)}>
                                    <option value="">All Category</option>
                                    {categories.map((item) => (
                                        <option key={item.id} value={item.slug}>{item.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {!loading && !error && pagination && (
                            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
                                <p className="mb-0">
                                    {query && (
                                        <>Search result for{' '} <strong>{query}</strong>.{' '}</>
                                    )}

                                    {category && (
                                        <>Category:{' '} <strong>{categories.find((item) => item.slug === category) ?.name || category}</strong>.{' '}</>
                                    )}

                                    Showing{' '}<strong>{pagination.total === 0 ? 0 : pagination.from ?? 0} – {pagination.to ?? 0}</strong>{' '}of{' '}<strong>{pagination.total}</strong>{' '}article
                                </p>

                                {(query || category) && (
                                    <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => {setSearchInput('');setSearchParams({});}}><i className="bi bi-x-circle me-1" />Reset filter </button>
                                )}
                            </div>
                        )}

                        {loading ? (
                            <div className="public-loading py-5 text-center" role="status">
                                <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
                                Loading article...
                            </div>
                        ) : error ? (
                            <div className="alert alert-danger" role="alert">
                                <p className="mb-2">{error}</p>
                                <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => setSearchParams(new URLSearchParams(searchParams))}>Coba lagi</button>
                            </div>
                        ) : posts.length === 0 ? (
                            <div className="public-empty text-center py-5">
                                <i className="bi bi-journal-x fs-1" aria-hidden="true" />
                                <h3 className="mt-3">Article not found</h3>
                                <p>Please try another keyword or category</p>
                                {(query || category) && (
                                    <button type="button" className="btn btn-primary" onClick={() => {setSearchInput('');setSearchParams({}); }}>Show all article</button>
                                )}
                            </div>
                        ) : (
                            <>
                                <div className="row gy-4">
                                    {posts.map((post) => {
                                        const image = imageUrl(post.featured_image);

                                        return (
                                            <div key={post.id} className="col-md-6 col-lg-4 all-articles">
                                                <article>
                                                    <div className="post-img">
                                                        {image ? (
                                                            <Link to={`/artikel/${post.slug}`} aria-label={`Read ${post.title}`}>
                                                                <img src={image} alt={post.featured_image ?.alt_text || post.title } className="img-fluid" loading="lazy" />
                                                            </Link>
                                                        ) : (
                                                            <Link to={`/artikel/${post.slug}`} className="post-image-placeholder d-flex align-items-center justify-content-center" aria-label={`Read ${post.title}`}>
                                                                <span>JURNAL<br />IDE</span>
                                                            </Link>
                                                        )}
                                                    </div>

                                                    <div className="pt-3">
                                                        <p className="post-category">
                                                            {post.categories?.length ? (post.categories.map((item) => (
                                                                    <button key={ item.id } type="button" className="btn btn-link p-0 me-2" onClick={() => handleCategoryChange(item.slug) }>{item.name}</button>))
                                                            ) : (
                                                                <span>Tanpa kategori</span>
                                                            )}
                                                        </p>

                                                        <h2 className="title">
                                                            <Link to={`/artikel/${post.slug}`}>{post.title}</Link>
                                                        </h2>

                                                        {/* <p>{excerpt(post)}</p> */}

                                                        <div className="d-flex align-items-center">
                                                            <span className="author-avatar-fallback me-2" aria-hidden="true">
                                                                {( post.user ?.name || 'R').charAt(0).toUpperCase()}
                                                            </span>

                                                            <div className="post-meta">
                                                                <p className="post-author mb-0">{post.user ?.name || 'Redaksi'}</p>
                                                                <p className="post-date mb-0">
                                                                    <time dateTime={post.published_at ||post.created_at }>{dateLabel(post.published_at || post.created_at,)}</time>
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <Link to={`/artikel/${post.slug}`} className="read-more d-inline-block mt-3">
                                                            Read more
                                                            <i className="bi bi-arrow-right ms-1" />
                                                        </Link>
                                                    </div>
                                                </article>
                                            </div>
                                        );
                                    })}
                                </div>

                                {pagination && pagination.last_page > 1 && (
                                    <section id="pagination-3" className="pagination-3 section mt-3">
                                        <div className="container">
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
            <Footer />
            <BackToTop />
        </>
    );
}
