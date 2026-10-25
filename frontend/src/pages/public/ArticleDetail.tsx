import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import DOMPurify from 'dompurify';
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

type Post = {
    id: number;
    title: string;
    slug: string;
    excerpt: string | null;
    body: string;
    published_at: string | null;
    created_at: string;
    user?: Author;
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

function authorImageUrl(author: Author|undefined): string {
    const path = author?.profile_photo_path?.trim();

    if (!path) return '';

    if (/^https?:\/\//i.test(path)) {
        return path;
    }

    return getImageUrl({
        path: path.replace(/^\/storage\//, ''),
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
            return 'blog tidak ditemukan atau tidak tersedia.';
        }

        return (
            error.response?.data?.message ||
            'Tidak dapat menghubungi server. Silakan coba lagi.'
        );
    }

    return 'Terjadi kesalahan. Silakan coba lagi.';
}

export default function ArticleDetail() {
    const { slug } = useParams<{ slug: string }>();
    const [post, setPost] = useState<Post | null>(null);
    const [latestPosts, setLatestPosts] = useState<Post[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    const [search, setSearch] = useState('');
    const [searchBusy, setSearchBusy] = useState(false);
    const [searchError, setSearchError] = useState('');
    const [searchResults, setSearchResults] = useState<Post[] | null>(null);
    
    async function handleSearch(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const query = search.trim();
        if (!query) {
            setSearchResults(null);
            setSearchError('Masukkan kata kunci pencarian.');
            return;
        }
    
        setSearchBusy(true);
        setSearchError('');
    
        try {
            const response = await publicApi.get('/public/posts', {
                params: { search: query, page: 1 },
            });
    
            setSearchResults(response.data.data.posts.data ?? []);
        } catch (err: unknown) {
            setSearchError(getErrorMessage(err))
            setSearchResults([]);
        } finally {
            setSearchBusy(false);
        }
    }
    
    const [comments, setComments] = useState<Paginated<CommentItem> | null>(null);

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [body, setBody] = useState('');
    const [website, setWebsite] = useState('');
    
    const [commentBusy, setCommentBusy] = useState(false);
    const [commentMessage, setCommentMessage] = useState('');
    const [commentError, setCommentError] = useState('');
    
    useEffect(() => {
        let active = true;
    
        async function loadData() {
            if (!slug) {
                setError('Alamat blog tidak valid.');
                setLoading(false);
                return;
            }
    
            setLoading(true);
            setError('');
            setPost(null);
            setComments(null);
    
            try {
                const [
                    postResponse,
                    commentsResponse,
                    sidebarResponse,
                    categoriesResponse,
                ] = await Promise.all([
                    publicApi.get(
                        `/public/posts/${encodeURIComponent(slug)}`
                    ),
                    publicApi.get(
                        `/public/posts/${encodeURIComponent(slug)}/comments`
                    ),
                    publicApi.get('/public/posts', {
                        params: { page: 1 },
                    }),
                    publicApi.get('/public/categories/posts'),
                ]);
    
                if (!active) return;
    
                setPost(postResponse.data.data);
                setComments(commentsResponse.data.data);
                setLatestPosts(
                    sidebarResponse.data.data.latestposts ?? []
                );
                setCategories(categoriesResponse.data.data ?? []);
            } catch (err: unknown) {
                if (!active) return;
    
                if (axios.isAxiosError(err)) {
                    setError(getErrorMessage(err));
                } else {
                    setError(getErrorMessage(err));
                }
            } finally {
                if (active) setLoading(false);
            }
        }
    
        void loadData();
    
        return () => {
            active = false;
        };
    }, [slug]);

    async function handleSubmitComment(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
    
        if (!slug || !post) return;
    
        setCommentBusy(true);
        setCommentError('');
        setCommentMessage('');
    
        try {
            const response = await publicApi.post(`/public/posts/${encodeURIComponent(slug)}/comments`,
                {
                    name: name.trim(),
                    email: email.trim(),
                    body: body.trim(),
                    website,
                }
            );
    
            setCommentMessage(response.data.message || 'Komentar diterima dan menunggu moderasi admin.');
    
            setName('');
            setEmail('');
            setBody('');
            setWebsite('');
        } catch (err: unknown) {
            if (axios.isAxiosError(err)) {
                const validationErrors = err.response?.data?.errors as
                    | Record<string, string[]>
                    | undefined;
    
                setCommentError(validationErrors ? Object.values(validationErrors).flat().join(' ') : err.response?.data?.message || 'Komentar gagal dikirim. Silakan coba lagi.')
            } else {
                setCommentError(getErrorMessage(err) || 'Terjadi kesalahan saat mengirim komentar.');
            }
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
                        Memuat blog...
                    </div>
                ) : error ? (
                    <section className="container py-5">
                        <h1>blog tidak tersedia</h1>
                        <p role="alert">{error}</p>
                        <Link to="/" className="btn btn-primary">
                            Kembali ke beranda
                        </Link>
                    </section>
                ) : post ? (
                    <>
                        <div className="page-title">
                            <div className="breadcrumbs">
                                <nav aria-label="breadcrumb">
                                    <ol className="breadcrumb">
                                        <li className="breadcrumb-item"><a href="#"><i className="bi bi-house"></i> Home</a></li>
                                        <li className="breadcrumb-item"><a href="#">Category</a></li>
                                        <li className="breadcrumb-item active current">Blog Details</li>
                                    </ol>
                                </nav>
                            </div>
                
                            <div className="title-wrapper">
                                <h1>Blog Details</h1>
                                <p>
                                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut elit tellus, luctus nec ullamcorper mattis, pulvinar dapibus leo.
                                </p>
                            </div>
                        </div>
                        
                        <div className="container">
                            <div className="row">
                                <div className="col-lg-8">
                                    
                                    <section className="blog-details section">
                                        <div className="container">
                                            <article className="article">
                                                
                                                {image && (
                                                    <div className="hero-img" data-aos="zoom-in">
                                                        <img src={image} alt={post.featured_image?.alt_text || post.title} className="img-fluid" />
                                                        <div className="meta-overlay">
                                                            <div className="meta-categories">
                                                                {post.categories?.map(
                                                                    (category) => (
                                                                        <Link to="#" key={category.id} className="category">{category.name}</Link>
                                                                    )
                                                                )}
                                                                
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
            
                                                <div className="article-content" data-aos="fade-up" data-aos-delay="100">
                                                    
                                                    <div className="content-header">
                                                        <h1 className="title">{post.title}</h1>
                
                                                        <div className="author-info">
                                                            <div className="author-details">
                                                                {authorImageUrl(post.user) ? (
                                                                    <img
                                                                        src={authorImageUrl(post.user)}
                                                                        alt={`Foto ${post.user?.name || 'penulis'}`}
                                                                        className="author-img"
                                                                        loading="lazy"
                                                                        onError={(event) => {
                                                                            event.currentTarget.style.display = 'none';
                                                                        }}
                                                                    />
                                                                ) : (
                                                                    <span className="author-avatar-fallback" aria-hidden="true">
                                                                        {(post.user?.name || 'P').charAt(0).toUpperCase()}
                                                                    </span>
                                                                )}
                                                            
                                                                <div className="info">
                                                                    <h4>{post.user?.name || 'Redaksi'}</h4>
                                                                </div>
                                                            </div>
                                                            <div className="post-meta">
                                                                <span className="date"><i className="bi bi-calendar3"></i> {formatDate(post.published_at ||post.created_at,)}</span>
                                                                <span className="divider">•</span>
                                                                <span className="comments"><i className="bi bi-chat-text"></i> {post.approved_comments_count ?? 0}{' '} Comment</span>
                                                            </div>
                                                        </div>
                                                    </div>
            
                                                    <div className="content" dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(post.body || '')}} />
                                                    
                                                    <div className="meta-bottom">
                                                        <div className="tags-section">
                                                            <h4>Related Topics</h4>
                                                            <div className="tags">
                                                                <a href="#" className="tag">Topic/Tag</a>
                                                            </div>
                                                        </div>
                
                                                        <div className="share-section">
                                                            <h4>Share Article</h4>
                                                            <div className="social-links">
                                                                <a href="#" className="twitter"><i className="bi bi-twitter-x"></i></a>
                                                                <a href="#" className="facebook"><i className="bi bi-facebook"></i></a>
                                                                <a href="#" className="linkedin"><i className="bi bi-linkedin"></i></a>
                                                                <a href="#" className="copy-link" title="Copy Link"><i className="bi bi-link-45deg"></i></a>
                                                            </div>
                                                        </div>
                                                    </div>

                                                </div>
                                            </article>
                                        </div>
                                    </section>
                                    
                                    <section id="blog-author" className="blog-author section">

                                        <div className="container" data-aos="fade-up">
                                            <div className="author-box">
                                                <div className="row align-items-center">
                                                    <div className="col-lg-3 col-md-4 text-center">
                                                        {authorImageUrl(post.user) ? (
                                                            <img
                                                                src={authorImageUrl(post.user)}
                                                                alt={`Foto ${post.user?.name || 'penulis'}`}
                                                                className="author-img rounded-circle"
                                                                loading="lazy"
                                                                onError={(event) => {
                                                                    event.currentTarget.style.display = 'none';
                                                                }}
                                                            />
                                                        ) : (
                                                            <span className="author-avatar-fallback" aria-hidden="true">
                                                                {(post.user?.name || 'P').charAt(0).toUpperCase()}
                                                            </span>
                                                        )}
                                                    </div>
                                                    
                                                    <div className="col-lg-9 col-md-8">
                                                        <div className="author-content">
                                                            <h3 className="author-name">{post.user?.name || 'Redaksi'}</h3>
                                                            {/*
                                                            <span className="author-title">Senior Tech Writer &amp; Developer Advocate</span>
                
                                                            <div className="author-bio mt-3">
                                                                Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium. Passionate about creating content that bridges the gap between developers and end-users.
                                                            </div>
                
                                                            <div className="author-website mt-3">
                                                                <a href="#" className="website-link">
                                                                    <i className="bi bi-globe"></i>
                                                                    <span>sarahanderson.dev</span>
                                                                </a>
                                                                <a href="#" className="more-posts">
                                                                    Read More from Sarah <i className="bi bi-arrow-right"></i>
                                                                </a>
                                                            </div>
                                                            */}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                
                                    </section>
    
                                    <section id="blog-comments" className="blog-comments section">
                                        <h2>
                                            Comments ({comments?.total ?? post.approved_comments_count ?? 0})
                                        </h2>
                                    
                                        {comments?.data.length ? (
                                            <div className="comments-list mb-5">
                                                {comments.data.map((comment) => (
                                                    <article className="comment-card mb-4" key={comment.id}>
                                                        <div className="comment-header">
                                                            <div className="user-info">
                                                                <span className="author-avatar-fallback" aria-hidden="true">
                                                                    {(comment?.name || 'A').charAt(0).toUpperCase()}
                                                                </span>
                                                                <div className="meta">
                                                                    <h4 className="name">{comment.name}</h4>
                                                                    <span className="date"><i className="bi bi-calendar3"></i> {formatDate(comment.created_at)}</span>
                                                                </div>
                                                            </div>
                                                            <div className="mt-3 comment-content">
                                                                <p>{comment.body}</p>
                                                            </div>
                                                            <div className="comment-actions">
                                                                <button className="action-btn reply-btn">
                                                                    <i className="bi bi-reply"></i>
                                                                    <span>Reply</span>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </article>
                                                ))}
                                            </div>
                                        ) : (
                                            <p>There are no approved comments for this article yet.</p>
                                        )}
                                    </section>
                                    
                                    <section id="blog-comment-form" className="blog-comment-form section">
                                        {post.allow_comments === false ? (
                                            <p>Comments for this article have been closed.</p>
                                        ) : (
                                            <form onSubmit={handleSubmitComment}>
                                                <h3>Write comment</h3>
                                                <p>Comments will be displayed after passing admin moderation.</p>
    
                                                <div className="row gy-3">
                                                    <div className="col-md-6">
                                                        <label htmlFor="comment-name">Name *</label>
                                                        <input
                                                            id="comment-name"
                                                            className="form-control"
                                                            value={name}
                                                            onChange={(event) => setName(event.target.value)}
                                                            minLength={2}
                                                            maxLength={80}
                                                            required
                                                        />
                                                    </div>
                                    
                                                    <div className="col-md-6">
                                                        <label htmlFor="comment-email">Email *</label>
                                                        <input
                                                            id="comment-email"
                                                            type="email"
                                                            className="form-control"
                                                            value={email}
                                                            onChange={(event) => setEmail(event.target.value)}
                                                            maxLength={254}
                                                            required
                                                        />
                                                    </div>
                                    
                                                    <div className="col-12">
                                                        <label htmlFor="comment-body">Comment *</label>
                                                        <textarea
                                                            id="comment-body"
                                                            className="form-control"
                                                            rows={5}
                                                            value={body}
                                                            onChange={(event) => setBody(event.target.value)}
                                                            minLength={3}
                                                            maxLength={3000}
                                                            required
                                                        />
                                                    </div>
                                    
                                                    {/* Honeypot anti-spam; jangan diisi pengunjung. */}
                                                    <div className="visually-hidden" aria-hidden="true">
                                                        <label htmlFor="comment-website">Website</label>
                                                        <input
                                                            id="comment-website"
                                                            tabIndex={-1}
                                                            autoComplete="off"
                                                            value={website}
                                                            onChange={(event) => setWebsite(event.target.value)}
                                                        />
                                                    </div>
                                    
                                                    {commentError && (
                                                        <div className="col-12 text-danger" role="alert">
                                                            {commentError}
                                                        </div>
                                                    )}
                                    
                                                    {commentMessage && (
                                                        <div className="col-12 text-success" role="status">
                                                            {commentMessage}
                                                        </div>
                                                    )}
                                    
                                                    <div className="col-12">
                                                        <button
                                                            type="submit"
                                                            className="btn-submit"
                                                            disabled={commentBusy}
                                                        >
                                                            {commentBusy ? 'Sending...' : 'Submit Comment'}
                                                        </button>
                                                    </div>
                                                </div>
                                            </form>
                                        )}
                                    </section>
    
                                </div>
                                
                                <div className="col-lg-4 sidebar">
                                    <div className="widgets-container" data-aos="fade-up" data-aos-delay="200">
                                        
                                        <div className="search-widget widget-item">
                                    
                                            <h3 className="widget-title">Search</h3>
                                            <form onSubmit={handleSearch} role="search">
                                                <div className="input-group">
                                                    <input
                                                        type="search"
                                                        className="form-control"
                                                        placeholder="Masukkan kata kunci..."
                                                        aria-label="Cari blog"
                                                        value={search}
                                                        onChange={(event) => setSearch(event.target.value)}
                                                    />
                                            
                                                    <button
                                                        type="submit"
                                                        className="btn btn-primary"
                                                        disabled={searchBusy}
                                                        aria-label="Cari blog"
                                                    >
                                                        <i className="bi bi-search" aria-hidden="true" />
                                                    </button>
                                                </div>
                                            </form>
                                            
                                            {searchError && (
                                                <p className="text-danger mt-2" role="alert">
                                                    {searchError}
                                                </p>
                                            )}
                                            
                                            {searchBusy && (
                                                <p role="status">Mencari blog...</p>
                                            )}
                                            
                                            {searchResults && !searchBusy && (
                                                <div className="mt-3">
                                                    <h4>Hasil pencarian ({searchResults.length})</h4>
                                            
                                                    {searchResults.length > 0 ? (
                                                        <ul className="list-unstyled">
                                                            {searchResults.map((result) => (
                                                                <li key={result.id} className="mb-2">
                                                                    <Link to={`/blog/${result.slug}`}>
                                                                        {result.title}
                                                                    </Link>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    ) : (
                                                        <p>Tidak ada blog yang cocok.</p>
                                                    )}
                                                </div>
                                            )}
                                    
                                        </div>
                                        
                                        {categories.length > 0 && (
                                            <div className="categories-widget widget-item">
                                                <h3 className="widget-title">Categories</h3>
                                                <ul className="mt-3">
                                                    {categories.map((category, index) => (
                                                        <li key={index}><a href="#">{category.name} <span>()</span></a></li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                        
                                        {latestPosts.length > 0 && (
                                            <div className="recent-posts-widget widget-item">
                                                <h3 className="widget-title">Recent Posts</h3>
                                                {latestPosts.slice(0, 6).map((post, index) => (
                                                    <div key={index} className="post-item">
                                                        <img
                                                            src={getImageUrl(post.featured_image)}
                                                            alt={post.featured_image?.alt_text || post.title}
                                                            className="flex-shrink-0"
                                                        />
                                                        <div>
                                                            <h4><Link to={`/blog/${post.slug}`}>{post.title}</Link></h4>
                                                            <time dateTime={post.published_at || post.created_at}>{formatDate(post.published_at)}</time>
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
                        </div>
                    </>
                ) : null}
            </main>
            <Footer />
            <BackToTop />
        </>
    );
}
