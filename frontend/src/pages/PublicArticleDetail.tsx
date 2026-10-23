import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import DOMPurify from 'dompurify';

import Header from '../components/public/Header';
import '../public-site.css';

type Category = {
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
    published_at: string | null;
    created_at: string;
    user?: { name: string } | null;
    categories?: Category[];
    featured_image?: {
        url?: string;
        path?: string;
        alt_text?: string | null;
    } | null;
    approved_comments_count?: number;
    allow_comments?: boolean;
};

type CommentItem = {
    id: number;
    name: string;
    body: string;
    created_at: string;
};

type Paginated<T> = {
    data: T[];
    current_page: number;
    last_page: number;
    total: number;
};

const API_BASE = (
    import.meta.env.VITE_API_BASE_URL || '/api'
).replace(/\/$/, '');

const publicApi = axios.create({
    baseURL: API_BASE,
    headers: { Accept: 'application/json' },
    timeout: 12000,
});

function getImageUrl(media: Post['featured_image']): string {
    if (!media) return '';

    const raw = media.url || (media.path ? `/storage/${media.path.replace(/^\/+/, '')}` : '');

    if (!raw) return '';
    if (/^https?:\/\//i.test(raw)) return raw;

    const origin = API_BASE.replace(/\/api\/?$/, '');
    return new URL(raw, `${origin || window.location.origin}/`).toString();
}

function formatDate(value: string | null | undefined): string {
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

function getErrorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
        const errors = error.response?.data?.errors as
            | Record<string, string[]>
            | undefined;

        if (errors) {
            return Object.values(errors).flat().join(' ');
        }

        if (error.response?.status === 404) {
            return 'Artikel tidak ditemukan atau tidak tersedia.';
        }

        return (
            error.response?.data?.message ||
            'Tidak dapat menghubungi server. Silakan coba lagi.'
        );
    }

    return 'Terjadi kesalahan. Silakan coba lagi.';
}

export default function PublicArticleDetail() {
    const { slug } = useParams<{ slug: string }>();
    const [page, setPage] = useState(1);
    
    const [posts, setPosts] = useState<Post | null>(null);
    // const [post, setPost] = useState<Post | null>(null);
    
    const [latestPosts, setLatestPosts] = useState<Post[]>([]);

    const [categories, setCategories] = useState<Category[]>([]);
    const [category, setCategory] = useState('');
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [body, setBody] = useState('');
    const [website, setWebsite] = useState('');
    
    const [search, setSearch] = useState('');
    
    const [comments, setComments] = useState<Paginated<CommentItem> | null>(null);
    const [commentBusy, setCommentBusy] = useState(false);
    const [commentMessage, setCommentMessage] = useState('');
    const [commentError, setCommentError] = useState('');

    useEffect(() => {
        let active = true;
    
        async function loadData() {
            setLoading(true);
            setError('');
            setPost(null);
            
            try {
                const [response, featuredResponse, categoryResponse] =
                    await Promise.all([
                        publicApi.get('/public/posts', {
                            params: {
                                page,
                                search: search.trim() || undefined,
                                category: category || undefined,
                            },
                        }),
                        publicApi.get('/public/posts', {
                            params: {
                                featured: 1,
                                page: 1,
                            },
                        }),
                        publicApi.get('/public/categories/posts'),
                        publicApi.get('/public/categories'),
                    ]);
    
                if (!active) return;
    
                setPosts(response.data.data.posts.data);
                setFeaturedPosts(featuredResponse.data.data.posts.data);
                setLatestPosts(response.data.data.latestposts);
                setCategoryArticles(categoryResponse.data.data);
                setCategories(categoryResponse.data.data);
            } catch (err: unknown) {
                if (active) {
                    setError(errorText(err));
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        }
    
        void loadData();
    
        return () => {
            active = false;
        };
    }, [page, search, category, categories]);

    async function handleSubmitComment(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!slug || !post) return;

        setCommentBusy(true);
        setCommentError('');
        setCommentMessage('');

        try {
            const response = await publicApi.post(`/public/posts/${encodeURIComponent(slug)}/comments`, { name, email, body, website });

            setCommentMessage(response.data.message || 'Komentar berhasil dikirim dan menunggu moderasi.');

            setName('');
            setEmail('');
            setBody('');
            setWebsite('');
        } catch (err: unknown) {
            setCommentError(getErrorMessage(err));
        } finally {
            setCommentBusy(false);
        }
    }

    const image = getImageUrl(post?.featured_image);

    return (
        <>
            <Header />

            <main className="main">
                {loading ? (
                    <div className="container public-loading" role="status">
                        Memuat artikel...
                    </div>
                ) : error ? (
                    <section className="container py-5">
                        <h1>Artikel tidak tersedia</h1>
                        <p role="alert">{error}</p>
                        <Link to="/" className="btn btn-primary">
                            Kembali ke beranda
                        </Link>
                    </section>
                ) : post ? (
                    <>
                        <div className="page-title">
                            <div className="container">
                                <nav aria-label="breadcrumb">
                                    <ol className="breadcrumb">
                                        <li className="breadcrumb-item">
                                            <Link to="/">Beranda</Link>
                                        </li>
                                        <li className="breadcrumb-item">
                                            <Link to="/artikel">Artikel</Link>
                                        </li>
                                        <li className="breadcrumb-item active">
                                            {post.title}
                                        </li>
                                    </ol>
                                </nav>

                                <div className="title-wrapper">
                                    <h1>{post.title}</h1>
                                    {post.excerpt && <p>{post.excerpt}</p>}
                                </div>
                            </div>
                        </div>
                        <div className="row">
                            <div className="col-lg-8">
                                
                                <section className="blog-details section">
                                    <div className="container">
                                        <article className="article">
                                            {image && (
                                                <div className="hero-img">
                                                    <img
                                                        src={image}
                                                        alt={
                                                            post.featured_image?.alt_text ||
                                                            post.title
                                                        }
                                                        className="img-fluid"
                                                    />
                                                </div>
                                            )}
        
                                            <div className="article-content">
                                                <div className="content-header">
                                                    <div className="meta-categories">
                                                        {post.categories?.map(
                                                            (category) => (
                                                                <span
                                                                    className="category me-2"
                                                                    key={category.id}
                                                                >
                                                                    {category.name}
                                                                </span>
                                                            ),
                                                        )}
                                                    </div>
        
                                                    <h1 className="title">
                                                        {post.title}
                                                    </h1>
        
                                                    <div className="author-info">
                                                        <span>
                                                            Oleh{' '}
                                                            {post.user?.name || 'Redaksi'}
                                                        </span>
                                                        <span className="date ms-3">
                                                            {formatDate(
                                                                post.published_at ||
                                                                post.created_at,
                                                            )}
                                                        </span>
                                                        <span className="ms-3">
                                                            {post.approved_comments_count ?? 0}{' '}
                                                            komentar
                                                        </span>
                                                    </div>
                                                </div>
        
                                                <div
                                                    className="content"
                                                    dangerouslySetInnerHTML={{
                                                        __html: DOMPurify.sanitize(
                                                            post.body || '',
                                                        ),
                                                    }}
                                                />
                                            </div>
                                        </article>
                                    </div>
                                </section>

                                <section className="blog-comment-form section">
                            <div className="container">
                                <h2>Komentar</h2>

                                {comments?.data?.length ? (
                                    <div className="comments-list mb-5">
                                        {comments.data.map((comment) => (
                                            <article
                                                className="comment-card mb-4"
                                                key={comment.id}
                                            >
                                                <h4>{comment.name}</h4>
                                                <time>
                                                    {formatDate(comment.created_at)}
                                                </time>
                                                <p>{comment.body}</p>
                                            </article>
                                        ))}
                                    </div>
                                ) : (
                                    <p>Belum ada komentar yang ditampilkan.</p>
                                )}

                                {post.allow_comments === false ? (
                                    <p>Komentar untuk artikel ini ditutup.</p>
                                ) : (
                                    <form onSubmit={handleSubmitComment}>
                                        <h3>Tulis Komentar</h3>
                                        <p>
                                            Komentar akan ditampilkan setelah
                                            melewati moderasi.
                                        </p>

                                        <div className="row gy-3">
                                            <div className="col-md-6">
                                                <label htmlFor="comment-name">
                                                    Nama *
                                                </label>
                                                <input
                                                    id="comment-name"
                                                    className="form-control"
                                                    value={name}
                                                    onChange={(event) =>
                                                        setName(event.target.value)
                                                    }
                                                    required
                                                />
                                            </div>

                                            <div className="col-md-6">
                                                <label htmlFor="comment-email">
                                                    Email *
                                                </label>
                                                <input
                                                    id="comment-email"
                                                    type="email"
                                                    className="form-control"
                                                    value={email}
                                                    onChange={(event) =>
                                                        setEmail(event.target.value)
                                                    }
                                                    required
                                                />
                                            </div>

                                            <div className="col-12">
                                                <label htmlFor="comment-body">
                                                    Komentar *
                                                </label>
                                                <textarea
                                                    id="comment-body"
                                                    className="form-control"
                                                    rows={5}
                                                    value={body}
                                                    onChange={(event) =>
                                                        setBody(event.target.value)
                                                    }
                                                    required
                                                />
                                            </div>

                                            <div
                                                className="visually-hidden"
                                                aria-hidden="true"
                                            >
                                                <label htmlFor="comment-website">
                                                    Website
                                                </label>
                                                <input
                                                    id="comment-website"
                                                    tabIndex={-1}
                                                    autoComplete="off"
                                                    value={website}
                                                    onChange={(event) =>
                                                        setWebsite(event.target.value)
                                                    }
                                                />
                                            </div>

                                            {commentError && (
                                                <div
                                                    className="text-danger"
                                                    role="alert"
                                                >
                                                    {commentError}
                                                </div>
                                            )}

                                            {commentMessage && (
                                                <div
                                                    className="text-success"
                                                    role="status"
                                                >
                                                    {commentMessage}
                                                </div>
                                            )}

                                            <div className="col-12">
                                                <button
                                                    type="submit"
                                                    className="btn btn-primary"
                                                    disabled={commentBusy}
                                                >
                                                    {commentBusy
                                                        ? 'Mengirim...'
                                                        : 'Kirim Komentar'}
                                                </button>
                                            </div>
                                        </div>
                                    </form>
                                )}
                            </div>
                        </section>

                            </div>
                            <div className="col-lg-4 sidebar">
                                <div className="widgets-container" data-aos="fade-up" data-aos-delay="200">
                                    
                                    <div className="search-widget widget-item">
                                
                                        <h3 className="widget-title">Search</h3>
                                        <form action="">
                                            <input type="text" />
                                            <button type="submit" title="Search"><i className="bi bi-search"></i></button>
                                        </form>
                                
                                    </div>
                                    
                                    {categories.length > 0 && (
                                        <div className="categories-widget widget-item">
                                            <h3 className="widget-title">Categories</h3>
                                            <ul className="mt-3">
                                                {categories.map((category, index) => (
                                                    <li><a href="#">{category.name} <span>()</span></a></li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    
                                    {latestPosts.length > 0 && (
                                        <div className="recent-posts-widget widget-item">
                                            <h3 className="widget-title">Recent Posts</h3>
                                            {latestPosts.slice(0, 6).map((post, index) => (
                                                <div key={index} className="post-item">
                                                    <img src={getImageUrl(post.photo_url)} alt="" className="flex-shrink-0"/>
                                                    <div>
                                                        <h4><Link to={`/artikel/${post.slug}`}>{post.title}</Link></h4>
                                                        <time datetime={post.published_at || post.created_at}>{formatDate(post.published_at)}</time>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
            
                                    <div className="tags-widget widget-item">
                                        <h3 className="widget-title">Tags</h3>
                                        <ul>
                                            <li><a href="#">App</a></li>
                                        </ul>
                                    </div>
                                
                                </div>
                            </div>
                        </div>

                    </>
                ) : null}
            </main>

            <footer className="footer">
                <div className="container copyright text-center mt-4">
                    <p>© Blogy</p>
                </div>
            </footer>
        </>
    );
}
