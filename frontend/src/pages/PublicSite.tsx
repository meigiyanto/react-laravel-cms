import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import '../public-site.css';
import axios from 'axios';
import DOMPurify from 'dompurify';

type Category = {
    id: number; 
    name: string; 
    slug: string
};
type Author = {
    id: number; 
    name: string
} | null;
type Media = {
    url?: string; 
    path?: string; 
    original_name?: string; 
    alt_text?: string | null
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
    approved_comments_count?: number;
    meta_title?: string | null; 
    meta_description?: string | null;
};
type CommentItem = {
    id: number; name: 
    string; 
    body: string; 
    created_at: string
};
type Page < T > = {
    data: T[]; 
    current_page: number; 
    last_page: number; 
    total: number
};

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
const publicApi = axios.create({
    baseURL: API_BASE, headers: {
        Accept: 'application/json'
    }, timeout: 12000
});

function imageUrl(media: Media): string {
    if (!media) return '';
    const raw = media.url || (media.path ? `/storage/${media.path.replace(/^\/+/, '')}`: '');
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw)) return raw;
    const apiOrigin = API_BASE.replace(/\/api\/?$/, '');
    return new URL(raw, `${apiOrigin || window.location.origin}/`).toString();
}
function dateLabel(value: string | null | undefined): string {
    if (!value) return 'Tanggal tidak tersedia';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Tanggal tidak tersedia': date.toLocaleDateString('id-ID', {
        day: 'numeric', month: 'long', year: 'numeric'
    });
}
function errorText(error: unknown): string {
    if (axios.isAxiosError(error)) {
        const errors = error.response?.data?.errors as Record < string,
        string[] > | undefined;
        if (errors) return Object.values(errors).flat().join(' ');
        return error.response?.data?.message || 'Tidak dapat menghubungi server. Coba lagi.';
    }
    return 'Terjadi kesalahan. Coba lagi.';
}
function excerpt(post: Post): string {
    if (post.excerpt?.trim()) return post.excerpt;
    const text = new DOMParser().parseFromString(post.body || '', 'text/html').body.textContent || '';
    return text.trim().slice(0, 180) + (text.trim().length > 180 ? '…': '');
}

export default function PublicSite() {
    const [pathname, setPathname] = useState(window.location.pathname);
    const [posts, setPosts] = useState < Page < Post > | null > (null);
    const [post, setPost] = useState < Post | null > (null);
    const [comments, setComments] = useState < Page < CommentItem > | null > (null);
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('');
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [commentForm, setCommentForm] = useState({ name: '', email: '', body: '', website: '' });
    const [commentBusy, setCommentBusy] = useState(false);
    const [commentMessage, setCommentMessage] = useState('');
    const [commentError, setCommentError] = useState('');

    useEffect(() => {
        const onPop = () => setPathname(window.location.pathname);
        window.addEventListener('popstate', onPop);
        return () => window.removeEventListener('popstate', onPop);
    }, []);

    const slug = useMemo(() => {
        const match = pathname.match(/^\/artikel\/([^/]+)\/?$/);
        return match ? decodeURIComponent(match[1]): null;
    }, [pathname]);

    function navigate(path: string) {
        window.history.pushState({}, '', path);
        setPathname(path);
        window.scrollTo({
            top: 0, behavior: 'smooth'
        });
    }

    useEffect(() => {
        const timer = window.setTimeout(() => setSearch(searchInput.trim()), 250);
        return () => window.clearTimeout(timer);
    }, [searchInput]);

    useEffect(() => {
        let active = true;
        setLoading(true);
        setError('');
        if (slug) {
            setPost(null); setComments(null); setCommentMessage(''); setCommentError('');
            Promise.all([
                publicApi.get(`/public/posts/${encodeURIComponent(slug)}`),
                publicApi.get(`/public/posts/${encodeURIComponent(slug)}/comments`),
            ]).then(([postResponse, commentsResponse]) => {
                if (!active) return;
                setPost(postResponse.data.data);
                setComments(commentsResponse.data.data);
            }).catch((err: unknown) => {
                if (active) setError(errorText(err));
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        } else {
            setPosts(null);
            publicApi.get('/public/posts', {
                params: {
                    page, search: search || undefined, category: category || undefined
                }
            })
            .then((response) => {
                if (active) setPosts(response.data.data);
            })
            .catch((err: unknown) => {
                if (active) setError(errorText(err));
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        }
        return () => {
            active = false;
        };
    }, [slug, page, search, category]);

    async function submitComment(event: FormEvent < HTMLFormElement >) {
        event.preventDefault();
        if (!slug) return;
        setCommentBusy(true); setCommentError(''); setCommentMessage('');
        try {
            const response = await publicApi.post(`/public/posts/${encodeURIComponent(slug)}/comments`, commentForm);
            setCommentMessage(response.data.message || 'Komentar dikirim untuk moderasi.');
            setCommentForm({
                name: '', email: '', body: '', website: ''
            });
        } catch (err) {
            setCommentError(errorText(err));
        }
        finally {
            setCommentBusy(false);
        }
    }

    const allCategories = useMemo(() => {
        const unique = new Map < string, Category > ();
        (posts?.data || []).forEach((item) => item.categories.forEach((cat) => unique.set(cat.slug, cat)));
        return [...unique.values()].sort((a, b) => a.name.localeCompare(b.name, 'id'));
    }, [posts]);

    return (
        <div className="public-site">
            <header className="public-header">
                <div className="public-header-inner">
                    <button className="public-brand" onClick={() => { setPage(1); setSearchInput(''); setSearch(''); setCategory(''); navigate('/'); }} aria-label="Kembali ke beranda">
                        <span className="public-brand-mark">K</span><span>Kabar<span className="brand-light">CMS</span><small>IDE, CERITA, WAWASAN</small></span>
                    </button>
                    <nav aria-label="Navigasi utama">
                        <button onClick={() => navigate('/')}>Beranda</button><a href="/login">Masuk Admin</a>
                    </nav>
                </div>
            </header>
            {!slug ? (
                <>
                    <section className="public-hero">
                        <div className="public-hero-copy">
                            <span className="public-kicker">RUANG UNTUK IDE DAN CERITA</span>
                            <h1>Cerita yang baik<br /> <em>layak dibagikan.</em></h1>
                             <p>Temukan artikel, wawasan, dan gagasan terbaru dari para penulis kami.</p>

                            <form className="public-search" onSubmit={(event) => { event.preventDefault(); setPage(1); setSearch(searchInput.trim()); }}>
                                <span aria-hidden="true">⌕</span>
                                <input aria-label="Cari artikel" placeholder="Cari topik atau artikel…" value={searchInput} onChange={(event) => { setSearchInput(event.target.value); setPage(1); }} />
                                <button type="submit">Cari artikel</button>
                            </form>
                        </div>
                        
                        <div className="public-hero-art" aria-hidden="true">
                            <div className="hero-orbit orbit-one" />
                            <div className="hero-orbit orbit-two" />
                            <div className="hero-paper">
                                <span>CATATAN HARI INI</span>
                                <strong>Temukan<br />perspektif<br /><i>baru.</i></strong>
                                <div className="paper-lines" />
                                <div className="paper-sun" />
                            </div>
                            <div className="hero-sticker">
                                BACA<br />DAN<br />BERTUMBUH ↗
                            </div>
                        </div>
                    </section>
                    <main className="public-main">
                        <div className="public-section-heading">
                            <div>
                                <span className="public-kicker">DARI RUANG REDAKSI</span><h2>{search ? `Hasil untuk “${search}”`: category ? 'Artikel pilihan kategori': 'Artikel terbaru'}</h2>
                            </div>
                            <span className="public-result-count">{posts ? `${posts.total} artikel`: 'Memuat artikel'}</span>
                        </div>
                        
                        {allCategories.length > 0 && (
                            <div className="public-categories">
                                <button className={!category ? 'selected': ''} onClick={() => { setCategory(''); setPage(1); }}>Semua topik</button>{allCategories.map((cat) => <button key={cat.id} className={category === cat.slug ? 'selected': ''} onClick={() => { setCategory(cat.slug); setPage(1); }}>{cat.name}</button>)}
                            </div>
                        )}
                        
                        {error && (
                            <div className="public-alert" role="alert">
                                {error} <button onClick={() => window.location.reload()}>Coba lagi</button>
                            </div>
                        )}
                    
                    {loading ? (
                        <div className="public-loading" role="status">Menyiapkan cerita untukmu…</div> 
                    ) : posts?.data.length ? (
                        <div className="public-post-grid">
                            {posts.data.map((item, index) => (
                                <article className={`public-post-card ${index === 0 && page === 1 && !search && !category ? 'featured-card': ''}`} key={item.id}>
                                    <button className="post-card-image" onClick={() => navigate(`/artikel/${encodeURIComponent(item.slug)}`)} aria-label={`Baca ${item.title}`}>
                                        {item.featured_image && imageUrl(item.featured_image) ? (
                                            <img src={imageUrl(item.featured_image)} alt={item.featured_image.alt_text || item.title} loading="lazy" /> 
                                        ) : (
                                            <span className={`post-image-placeholder placeholder-${index % 4}`}><span>JURNAL<br />IDE</span><b>✳</b></span>
                                        )}
                                    </button>
                                    
                                    <div className="post-card-copy">
                                        <div className="post-card-meta">
                                            <span>{item.categories[0]?.name || 'Artikel'}</span><time>{dateLabel(item.published_at || item.created_at)}</time>
                                        </div>
                                        <h3>
                                            <button onClick={() => navigate(`/artikel/${encodeURIComponent(item.slug)}`)}>{item.title}</button>
                                        </h3>
                                        <p>{excerpt(item)}</p>
                                        <div className="post-card-bottom">
                                            <span>Oleh {item.user?.name || 'Redaksi'}</span>
                                            <button onClick={() => navigate(`/artikel/${encodeURIComponent(item.slug)}`)} aria-label={`Baca artikel ${item.title}`}>Baca cerita ↗</button>
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    ) : !error ? (
                        <div className="public-empty">
                            <span>✳</span>
                            <h3>Belum ada artikel untuk ditampilkan</h3>
                            <p>Artikel yang telah dipublikasikan akan muncul di sini.</p>
                        </div>) : null
                    }
                    
                    {posts && posts.last_page > 1 && (
                        <div className="public-pagination">
                            <button disabled={page <= 1} onClick={() => { setPage((p) => p - 1); window.scrollTo({ top: 500, behavior: 'smooth' }); }}>← Sebelumnya</button><span>Halaman {posts.current_page} dari {posts.last_page}</span><button disabled={page >= posts.last_page} onClick={() => { setPage((p) => p + 1); window.scrollTo({ top: 500, behavior: 'smooth' }); }}>Berikutnya →</button>
                        </div>
                    )}
                    </main>
                </>
            ) : (
                <main className="public-article-wrap">
                    <button className="article-back" onClick={() => navigate('/')}>← Kembali ke artikel</button>
                    {loading ? (
                        <div className="public-loading">Memuat artikel…</div> 
                        ) : error ? (
                                <div className="public-alert" role="alert">
                                    {error}
                                    <button onClick={() => navigate('/')}>Kembali ke beranda</button>
                                </div>
                            )
                    : post && (
                        <>
                            <article className="public-article">
                                <div className="article-topline">
                                    {post.categories.map((cat) => (
                                            <span key={cat.id}>{cat.name}</span>)
                                        )
                                    }
                                    <time>{dateLabel(post.published_at || post.created_at)}</time>
                                </div>
                                
                                <h1>{post.title}</h1>
                                <p className="article-deck">{post.excerpt}</p>
                                
                                <div className="article-byline">
                                    <span className="author-avatar">{(post.user?.name || 'R').slice(0, 1).toUpperCase()}</span>
                                    <span>
                                        <strong>{post.user?.name || 'Redaksi'}</strong>
                                        <small>Dipublikasikan {dateLabel(post.published_at || post.created_at)}</small>
                                    </span>
                                </div>
                                
                                {post.featured_image && imageUrl(post.featured_image) && (
                                    <img className="article-featured-image" src={imageUrl(post.featured_image)} alt={post.featured_image.alt_text || post.title} />
                                )}
                                
                                <div className="article-body" dangerouslySetInnerHTML={ { __html: DOMPurify.sanitize(post.body || '') }} />
                            </article>
                            
                            <section className="public-comments">
                                <div className="comments-heading">
                                    <span className="public-kicker">RUANG DISKUSI</span>
                                    <h2>Bagikan pemikiranmu.</h2>
                                    <p>Diskusi yang baik dimulai dengan saling menghargai.</p>
                                </div>
                                
                                <div className="comments-layout">
                                    <div className="comment-list">
                                        <h3>Komentar {comments ? `(${comments.total})`: ''}</h3>
                                        
                                        {comments?.data.length ? comments.data.map((comment) =>
                                            (<article className="comment-item" key={comment.id}>
                                                <div className="comment-avatar">
                                                {comment.name.slice(0, 1).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="comment-author">
                                                        <strong>{comment.name}</strong><time>{dateLabel(comment.created_at)}</time>
                                                    </div>
                                                    <p>{comment.body}</p>
                                                </div>
                                            </article>)
                                        ) :
                                        (<p className="no-comments">Belum ada komentar yang ditampilkan. Jadilah yang pertama memulai diskusi.</p>)
                                    }
                                    </div>
                                    
                                    <form className="comment-form" onSubmit={submitComment}>
                                        <h3>Tulis komentar</h3>
                                        <p>Komentar akan tampil setelah disetujui moderator.</p>
                            
                                        {commentMessage && (
                                            <div className="comment-success" role="status">
                                                {commentMessage}
                                            </div>
                                        )}
                                        
                                        {commentError && (
                                            <div className="public-alert" role="alert">
                                                {commentError}
                                            </div>
                                        )}
                                        <div className="honeypot" aria-hidden="true">
                                            <label>Website<input tabIndex={-1} autoComplete="off" value={commentForm.website} onChange={(e) => setCommentForm({ ...commentForm, website: e.target.value })} /></label>
                                        </div>
                                        
                                        <label>Nama<input required minLength={2} maxLength={80} value={commentForm.name} onChange={(e) => setCommentForm({ ...commentForm, name: e.target.value })} placeholder="Nama yang ditampilkan" /></label>
                                        <label>Email<input required type="email" maxLength={254} value={commentForm.email} onChange={(e) => setCommentForm({ ...commentForm, email: e.target.value })} placeholder="email@contoh.com" /></label>
                                        <label>Komentar<textarea required minLength={3} maxLength={3000} rows={5} value={commentForm.body} onChange={(e) => setCommentForm({ ...commentForm, body: e.target.value })} placeholder="Tulis tanggapanmu dengan sopan…" /></label>
                                        <button disabled={commentBusy} type="submit">{commentBusy ? 'Mengirim…': 'Kirim komentar ↗'}</button>
                                    </form>
                                </div>
                            </section>
                        </>
                    )}
                </main>
            )}
            <footer className="public-footer">
                <div className="public-footer-inner">
                    <div className="public-brand footer-brand">
                        <span className="public-brand-mark">K</span><span>Kabar<span className="brand-light">CMS</span><small>IDE, CERITA, WAWASAN</small></span>
                    </div>
                    <p>Tempat gagasan bertemu cerita.</p>
                    <span>© {new Date().getFullYear()} KabarCMS</span>
                </div>
            </footer>
        </div>
    );
}