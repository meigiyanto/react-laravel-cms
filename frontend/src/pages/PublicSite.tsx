import { useEffect, useMemo, useState } from 'react';
import '../public-site.css';
import axios from 'axios';
import DOMPurify from 'dompurify';
import Header from '../components/public/Header';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';

import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

type CategoryWithPosts = Category & {
    description?: string | null;
    posts: Post[];
};

type Category = {
    id: number; 
    name: string; 
    slug: string
};

type Author = {
    id: number;
    name: string;
    profile_photo_path?: string | null;
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
    allow_comments?: boolean;
    meta_title?: string | null;
    meta_description?: string | null;
};

type CommentItem = {
    id: number;
    name: string;
    body: string;
    created_at: string;
};

type CommentForm = {
    name: string;
    email: string;
    body: string;
    website: string;
};

type Page <T> = {
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

function authorImageUrl(author: Author): string {
    if (!author?.profile_photo_path) return '';
    return imageUrl({
        path: author.profile_photo_path,
    });
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
        const errors = error.response?.data?.errors as Record <string, string[] > | undefined;
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
    const [posts, setPosts] = useState <Page <Post> | null> (null);
    const [latestPosts, setLatestPosts] = useState<Post[]>([]);
    const [featuredPosts, setFeaturedPosts] = useState<Post[]>([]);
    const [post, setPost] = useState <Post | null> (null);
    const [comments, setComments] = useState <Page <CommentItem> | null > (null);
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
    const [categoryArticles, setCategoryArticles] = useState<CategoryWithPosts[]>([]);
    
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
    
    /*
    useEffect(() => {
        const timer = window.setTimeout(() => setSearch(searchInput.trim()), 250);
        return () => window.clearTimeout(timer);
    }, [searchInput]);
    */
    
    useEffect(() => {
        let active = true;
    
        const loadData = async () => {
            setLoading(true);
            setError('');
    
            if (slug) {
                setPost(null);
                setComments(null);
                setCommentMessage('');
                setCommentError('');
    
                try {
                    const [postResponse,  commentsResponse] = await Promise.all([
                        publicApi.get(`/public/posts/${encodeURIComponent(slug)}`),
                        publicApi.get(`/public/posts/${encodeURIComponent(slug)}/comments`),
                    ]);
    
                    if (!active) return;
    
                    setPost(postResponse.data.data);
                    setComments(commentsResponse.data.data);
                } catch (err: unknown) {
                    if (active) setError(errorText(err));
                } finally {
                    if (active) setLoading(false);
                }
            } else {
                setPosts(null);
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
                                params: { featured: 1, page: 1 },
                            }),
                            publicApi.get('/public/categories/posts'),
                        ]);
                    
                    if (active) {
                        setPosts(response.data.data.posts.data);
                        setFeaturedPosts(featuredResponse.data.data.posts.data);
                        setLatestPosts(response.data.data.latestposts);
                        setCategoryArticles(categoryResponse.data.data);
                    }
                    
                } catch (err: unknown) {
                    if (active) setError(errorText(err));
                } finally {
                    if (active) setLoading(false);
                }
            }
        };
    
        queueMicrotask(() => {
            if (active) void loadData();
        });
    
        return () => {
            active = false;
        };
    }, [slug, page, /* search,*/ category]);
    
    async function submitComment(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
    
        if (!slug || !post) return;
    
        setCommentBusy(true);
        setCommentError('');
        setCommentMessage('');
    
        try {
            const response = await publicApi.post(
                `/public/posts/${encodeURIComponent(slug)}/comments`,
                commentForm,
            );
    
            setCommentMessage(
                response.data.message ||
                'Komentar berhasil dikirim dan menunggu moderasi.',
            );
    
            setCommentForm({
                name: '',
                email: '',
                body: '',
                website: '',
            });
        } catch (err: unknown) {
            setCommentError(errorText(err));
        } finally {
            setCommentBusy(false);
        }
    }
    
    /*
    const allCategories = useMemo(() => {
        const unique = new Map <string, Category> ();
        (posts?.data || []).forEach((item) => item.categories.forEach((cat) => unique.set(cat.slug, cat)));
        return [...unique.values()].sort((a, b) => a.name.localeCompare(b.name, 'id'));
    }, [posts]);
    */

    return (
        <>
            <Header />

            <main className="main">
                {!loading && posts.length === 0 && (
                    <div className="text-center py-5">
                        <i className="bi bi-search fs-1 text-muted" />
                
                        <h3 className="mt-3">
                          {search.trim() ? 'Artikel tidak ditemukan' : 'Belum ada artikel'}
                        </h3>
                    
                        <p className="text-muted">
                          {search.trim() ? `Tidak ada artikel yang cocok dengan "${search}". Coba kata kunci lain.` : 'Artikel akan ditampilkan di sini ketika tersedia.'}
                        </p>
                
                        {search.trim() && (
                            <button
                                type="button"
                                className="btn btn-outline-primary"
                                onClick={() => {
                                    setSearch('');
                                    setPage(1);
                                }}
                            >
                                Hapus pencarian
                            </button>
                       )}
                    </div>
                )}
                
                {!slug ? (
                    <>
                        {loading ? (
                            <div className="container public-loading" role="status">Menyiapkan cerita untukmu…</div> 
                        ) : posts.length ? (
                            <>
                                {/* Blog Hero Section */}
                                <section id="blog-hero" className="blog-hero section">
                        
                                    <div className="container" data-aos="fade-up" data-aos-delay="100">
                                        <div className="blog-grid">
                                            {posts[Math.floor(Math.random() * posts.length)] ? (
                                                <article className="blog-item featured" data-aos="fade-up">
                                                    {posts[Math.floor(Math.random() * posts.length)].featured_image && imageUrl(posts[Math.floor(Math.random() * posts.length)].featured_image) ? (
                                                        <img src={imageUrl(posts[Math.floor(Math.random() * posts.length)].featured_image)} alt={posts[Math.floor(Math.random() * posts.length)].featured_image.alt_text || posts[Math.floor(Math.random() * posts.length)].title} loading="lazy" />
                                                    ) : (
                                                        <div className="post-image-placeholder">
                                                            <span>JURNAL<br />IDE</span>
                                                        </div>
                                                    )}
                                                    <div className="blog-content">
                                                        <div className="post-meta">
                                                            <span className="date">{dateLabel(posts[Math.floor(Math.random() * posts.length)].created_at || posts[Math.floor(Math.random() * posts.length)].published_at)}</span>
                                                            <span className="category">{posts[Math.floor(Math.random() * posts.length)].categories[0].name}</span>
                                                        </div>
                                                        <h3 className="post-title">
                                                            <a href="blog-details" title={posts[Math.floor(Math.random() * posts.length)].title}>{posts[Math.floor(Math.random() * posts.length)].title}</a>
                                                        </h3>
                                                    </div>
                                                </article>
                                                ) : null
                                            }
                        
                                            {posts.slice(0, 4).map((post, index) => (
                                                <article key={index} className="blog-item" data-aos="fade-up" data-aos-delay="100">
                                                    {post.featured_image && imageUrl(post.featured_image) ? (
                                                        <img src={imageUrl(post.featured_image)} alt={post.featured_image.alt_text || post.title} loading="lazy" />
                                                    ) : (
                                                        <div className="post-image-placeholder">
                                                            <span>JURNAL<br />IDE</span>
                                                        </div>
                                                    )}
                                                    <div className="blog-content">
                                                        <div className="post-meta">
                                                            <span className="date">{dateLabel(post.created_at || post.published_at)}</span>
                                                            <span className="category">{post.categories[0].name}</span>
                                                        </div>
                                                        <h3 className="post-title">
                                                            <a href="blog-details" title={post.title}>{post.title}</a>
                                                        </h3>
                                                    </div>
                                                </article>
                                            ))}

                                        </div>
                        
                                    </div>
                        
                                </section>
                                
                                {/* Featured Posts Section */}
                                <section id="featured-posts" className="featured-posts section">
                        
                                    {/* Section Title */}
                                    <div className="container section-title" data-aos="fade-up">
                                        <h2>Featured Posts</h2>
                                        <div>
                                            <span>Check Our</span> <span className="description-title">Featured Posts</span>
                                        </div>
                                    </div>
                        
                                    <div className="container" data-aos="fade-up" data-aos-delay="100">
                                        <div className="blog-posts-slider">
                                            <div className="swiper-wrapper">
                                            
                                                <Swiper
                                                    modules={[Navigation, Pagination, Autoplay]}
                                                    spaceBetween={20}
                                                    slidesPerView={1}
                                                    navigation
                                                    pagination={ { clickable: true }}
                                                    autoplay={ {
                                                        delay: 4000,
                                                        disableOnInteraction: false,
                                                    }}
                                                    loop={featuredPosts.length > 1}
                                                    breakpoints={ {
                                                        640: {
                                                            slidesPerView: 2,
                                                        },
                                                        1024: {
                                                            slidesPerView: 3,
                                                        }
                                                    }}
                                                >
                                                
                                                {featuredPosts.slice(0, 6).map((item, index) => (
                                                    <div key={index} className="swiper-slide">
                                                        <SwiperSlide key={item.id}>
                                                            <div className="blog-post-item">
                                                                {item.featured_image && imageUrl(item.featured_image) ? (
                                                                    <img src={imageUrl(item.featured_image)} alt={item.featured_image.alt_text || item.title} loading="lazy" />
                                                                ) : (
                                                                    <div className="post-image-placeholder">
                                                                        <span>JURNAL<br />IDE</span>
                                                                    </div>
                                                                )}
                                                                <div className="blog-post-content">
                                                                    <div className="post-meta">
                                                                        <span><i className="bi bi-person"></i> {item.user?.name || 'Redaksi'}</span>
                                                                        <span><i className="bi bi-clock"></i> {dateLabel(item.created_at || item.published_at)}</span>
                                                                        <span><i className="bi bi-labels"></i> {item.categories[0].name}</span>
                                                                    </div>
                                                                    <h2><a href="#">{item.title}</a></h2>
                                                                    <p>{excerpt(item)}</p>
                                                                    <a href="#" className="read-more">Read More <i className="bi bi-arrow-right"></i></a>
                                                                </div>

                                                            </div>
                                                        </SwiperSlide>
                                                    </div> 
                                                ))}
                                                
                                                </Swiper>
                                            </div>
                                        </div>
                                    </div>
                        
                                </section>
                                
                                <section id="category-section" className="category-section section">
                                    <div className="container section-title" data-aos="fade-up">
                                        <h2>Category Section</h2>
                                        <div>
                                            <span className="description-title">Category Section</span>
                                        </div>
                                    </div>
                                    {categoryArticles.map((item, index) => (
                                        <div key={index}>
                                        {item.posts.length > 0 ? (
                                            <div className="container" data-aos="fade-up" data-aos-delay="100">
                                                <div className="row">
                                                    {item.posts.slice(0, 3).map((article) => (
                                                        <div key={article.id} className="col-md-6 col-lg-4">
                                                            <article className="featured-post">
                                                                <div className="post-img">
                                                                    {article.featured_image && imageUrl(article.featured_image) && (
                                                                        <img src={imageUrl(article.featured_image)} alt={ article.featured_image.alt_text || article.title } className="img-fluid" loading="lazy" />
                                                                    )}
                                                                </div>
                                                                <div className="post-content">
                                                                    <div className="category-meta">
                                                                        <span className="post-category">{article.categories[0].name}</span>
                                                                        <div className="author-meta">
                                                                            <span className="author-name"></span>
                                                                            <span className="author-date">{dateLabel(article.created_at || article.published_at)}</span>
                                                                        </div>
                                                                    </div>
                                                                    <h2 className="title">
                                                                        <button className="btn btn-link" onClick={() => navigate(`/artikel/${encodeURIComponent(article.slug)}`)}>
                                                                            {article.title}
                                                                        </button>
                                                                    </h2>
                                                                </div>
                                                            </article>
                                                        </div>
                                                    ))}
                                                </div>
                                                
                                                <div className="row">
                                                {item.posts.slice(0, 6).map((article, index) => (
                                                    <div key={index} className="col-xl-4 col-lg-6">
                                                        <article className="list-post">
                                                            <div className="post-img">
                                                                {article.featured_image && imageUrl(article.featured_image) && (
                                                                    <img src={imageUrl(article.featured_image)} alt={ article.featured_image.alt_text || article.title } className="img-fluid" loading="lazy" />
                                                                )}
                                                            </div>
                                                            <div className="post-content">
                                                                <div className="category-meta">
                                                                    <span className="post-category">{article.categories[0].name}</span>
                                                                </div>
                                                                <h3 className="title">
                                                                    <a href="#">{article.title}</a>
                                                                </h3>
                                                                <div className="post-meta">
                                                                    <span className="post-date">{dateLabel(article.created_at || article.published_at)}</span>
                                                                </div>
                                                            </div>
                                                        </article>
                                                    </div>
                                                ))}
                                                </div>
                                                
                                            </div>
                                        ) : (
                                            <p>Belum ada artikel dalam kategori ini.</p>
                                        )}
                                        </div>
                                    ))}
                                </section>

                                {/* Latest Posts */}
                                <section id="latest-posts" className="latest-posts section">
                        
                                    {/* Section Title */}
                                    <div className="container section-title" data-aos="fade-up">
                                        <h2>Latest Posts</h2>
                                        <div>
                                            <span>Check Our</span> <span className="description-title">Latest Posts</span>
                                        </div>
                                    </div>
                        
                                    <div className="container" data-aos="fade-up" data-aos-delay="100">
                                        <div className="row gy-4">
                                        {latestPosts.map((post, index) => (
                                            <div key={index} className="col-lg-4">
                                                <article>
                                                    <div className="post-img">
                                                        {post.featured_image && imageUrl(post.featured_image) ? (
                                                            <img src={imageUrl(post.featured_image)} alt={post.featured_image.alt_text || post.title} loading="lazy" className="img-fluid"/>
                                                        ) : (
                                                            <div className="post-image-placeholder">
                                                                <span>JURNAL<br />IDE</span>
                                                            </div>
                                                        )}
                                                    </div>
                        
                                                    <p className="post-category">{post.categories[0]?.name}</p>
                                                    <h2 className="title">
                                                        <a href="blog-details">{post.title}</a>
                                                    </h2>
                        
                                                    <div className="d-flex align-items-center">
                                                        {authorImageUrl(post.user) ? (
                                                            <img src={authorImageUrl(post.user)} alt={`Foto ${post.user?.name || 'penulis'}`} className="img-fluid post-author-img flex-shrink-0" loading="lazy" onError={(event) => { event.currentTarget.style.display = 'none'; }} />
                                                        ) : (
                                                            <span className="author-avatar-fallback" aria-hidden="true"> {(post.user?.name || 'T').charAt(0).toUpperCase()}</span>
                                                        )}
                                                        <div className="post-meta">
                                                            <p className="post-author">{post.user?.name}</p>
                                                            <p className="post-date">
                                                                <time dateTime="2022-01-01">{dateLabel(post.created_at || post.published_at)}</time>
                                                            </p>
                                                        </div>
                                                    </div>
                                                </article>
                                            </div>
                                        ))}
                                        </div>
                                    </div>
                        
                                </section>
                        
                                {/* Call To Action Section */}
                                <section id="call-to-action" className="call-to-action section">
                                    <div className="container" data-aos="fade-up" data-aos-delay="100">
                                        <div className="row gy-4 justify-content-between align-items-center">
                                            <div className="col-lg-6">
                                                <div className="cta-content" data-aos="fade-up" data-aos-delay="200">
                                                    <h2>Subscribe to our newsletter</h2>
                                                    <p>
                                                        Proin eget tortor risus. Mauris blandit aliquet elit, eget tincidunt nibh pulvinar a. Curabitur aliquet quam id dui posuere blandit.
                                                    </p>
                                                    <form action="forms/newsletter.php" method="post" className="php-email-form cta-form" data-aos="fade-up" data-aos-delay="300">
                                                        <div className="input-group mb-3">
                                                            <input type="email" className="form-control" placeholder="Email address..." aria-label="Email address" aria-describedby="button-subscribe" />
                                                            <button className="btn btn-primary" type="submit" id="button-subscribe">Subscribe</button>
                                                        </div>
                                                        <div className="loading">
                                                            Loading
                                                        </div>
                                                        <div className="error-message"></div>
                                                        <div className="sent-message">
                                                            Your subscription request has been sent. Thank you!
                                                        </div>
                                                    </form>
                                                </div>
                                            </div>
                                            <div className="col-lg-4">
                                                <div className="cta-image" data-aos="zoom-out" data-aos-delay="200">
                                                    <img src="assets/img/cta/cta-1.webp" alt="" className="img-fluid"/>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </section>

                            </>
                        ) : !error ? (
                            <div className="public-empty">
                                <span>✳</span>
                                <h3>Belum ada artikel untuk ditampilkan</h3>
                                <p>Artikel yang telah dipublikasikan akan muncul di sini.</p>
                            </div>
                            ) : null
                        }
                    </>
                ) : (
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
                                <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut elit tellus, luctus nec ullamcorper mattis, pulvinar dapibus leo.</p>
                            </div>
                        </div>
                        <div className="container">
                            <div className="row">
                                <div className="col-lg-8">
                
                                    {/* Blog Details Section */}
                                    <section id="blog-details" className="blog-details section">
                                        <div className="container" data-aos="fade-up">
                
                                            <article className="article">
                
                                                <div className="hero-img" data-aos="zoom-in">
                                                    <img src="assets/img/blog/blog-post-3.webp" alt="Featured blog image" className="img-fluid" loading="lazy"/>
                                                    <div className="meta-overlay">
                                                        <div className="meta-categories">
                                                            <a href="#" className="category">Web Development</a>
                                                            <span className="divider">•</span>
                                                            <span className="reading-time"><i className="bi bi-clock"></i> 6 min read</span>
                                                        </div>
                                                    </div>
                                                </div>
                
                                                <div className="article-content" data-aos="fade-up" data-aos-delay="100">
                                                    <div className="content-header">
                                                        <h1 className="title">Modern Web Development: Best Practices and Future Trends for 2025</h1>
                
                                                        <div className="author-info">
                                                            <div className="author-details">
                                                                <img src="assets/img/person/person-f-8.webp" alt="Author" className="author-img" />
                                                                <div className="info">
                                                                    <h4>Michael Chen</h4>
                                                                    <span className="role">Senior Web Developer</span>
                                                                </div>
                                                            </div>
                                                            <div className="post-meta">
                                                                <span className="date"><i className="bi bi-calendar3"></i> Mar 15, 2025</span>
                                                                <span className="divider">•</span>
                                                                <span className="comments"><i className="bi bi-chat-text"></i> 18 Comments</span>
                                                            </div>
                                                        </div>
                                                    </div>
                
                                                    <div className="content">
                                                        <p className="lead">
                                                            The landscape of web development continues to evolve at an unprecedented pace, bringing new technologies, frameworks, and methodologies that reshape how we build modern web applications.
                                                        </p>
                
                                                        <p>
                                                            As we delve into 2025, the web development ecosystem has transformed dramatically, introducing innovative approaches to building faster, more secure, and highly engaging web experiences. This comprehensive guide explores the latest trends and best practices that are defining the future of web development.
                                                        </p>
                
                                                        <div className="content-image right-aligned">
                                                            <img src="assets/img/blog/blog-hero-2.webp" className="img-fluid" alt="Modern web development tools" loading="lazy"/>
                                                            <figcaption>Modern development environments emphasize collaboration and efficiency</figcaption>
                                                        </div>
                
                                                        <h2>The Rise of Web Components</h2>
                                                        <p>
                                                            Web Components have become increasingly crucial in modern web development, offering a standardized way to create reusable custom elements. Key advantages include:
                                                        </p>
                                                        <ul>
                                                            <li>Enhanced code reusability across different frameworks</li>
                                                            <li>Better encapsulation of functionality</li>
                                                            <li>Improved maintenance and scalability</li>
                                                            <li>Framework-agnostic component development</li>
                                                        </ul>
                
                                                        <div className="highlight-box">
                                                            <h3>Key Trends in 2025</h3>
                                                            <ul className="trend-list">
                                                                <li>
                                                                    <i className="bi bi-lightning-charge"></i>
                                                                    <span>Edge Computing and Serverless Architecture</span>
                                                                </li>
                                                                <li>
                                                                    <i className="bi bi-shield-check"></i>
                                                                    <span>Enhanced Security Measures</span>
                                                                </li>
                                                                <li>
                                                                    <i className="bi bi-phone"></i>
                                                                    <span>Progressive Web Apps (PWAs)</span>
                                                                </li>
                                                            </ul>
                                                        </div>
                
                                                        <h2>Performance Optimization</h2>
                                                        <p>
                                                            Performance remains a critical factor in web development, with an increasing focus on Core Web Vitals and user experience metrics. Modern applications must be optimized for both speed and efficiency.
                                                        </p>
                
                                                        <blockquote>
                                                            <p>
                                                                "The future of web development lies not just in writing code, but in creating seamless, accessible, and performant experiences that work for everyone, everywhere."
                                                            </p>
                                                            <cite>Emily Thompson, Web Performance Architect</cite>
                                                        </blockquote>
                
                                                        <div className="content-grid">
                                                            <div className="row g-4">
                                                                <div className="col-md-6">
                                                                    <div className="info-card">
                                                                        <i className="bi bi-speedometer2"></i>
                                                                        <h4>Performance Metrics</h4>
                                                                        <p>
                                                                            Focus on Core Web Vitals and user-centric performance metrics for better search rankings and user experience.
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                <div className="col-md-6">
                                                                    <div className="info-card">
                                                                        <i className="bi bi-universal-access"></i>
                                                                        <h4>Accessibility</h4>
                                                                        <p>
                                                                            Implementing WCAG guidelines and ensuring web applications are accessible to all users across different devices.
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                
                                                        <h2>Looking Forward</h2>
                                                        <p>
                                                            As we continue through 2025, web development practices will further evolve, embracing new technologies while maintaining a strong foundation in performance, accessibility, and user experience. Staying updated with these trends and best practices is crucial for developers looking to build modern, scalable web applications.
                                                        </p>
                                                    </div>
                
                                                    <div className="meta-bottom">
                                                        <div className="tags-section">
                                                            <h4>Related Topics</h4>
                                                            <div className="tags">
                                                                <a href="#" className="tag">Web Development</a>
                                                                <a href="#" className="tag">Performance</a>
                                                                <a href="#" className="tag">Best Practices</a>
                                                                <a href="#" className="tag">Trends</a>
                                                                <a href="#" className="tag">2025</a>
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
                
                                    {/* Blog Author Section */}
                                    <section id="blog-author" className="blog-author section">
                
                                        <div className="container" data-aos="fade-up">
                                            <div className="author-box">
                                                <div className="row align-items-center">
                                                    <div className="col-lg-3 col-md-4 text-center">
                                                        <img src="assets/img/person/person-f-12.webp" className="author-img rounded-circle" alt="" loading="lazy"/>
                
                                                        <div className="author-social-links mt-3">
                                                            <a href="https://twitter.com/#" className="twitter"><i className="bi bi-twitter-x"></i></a>
                                                            <a href="https://linkedin.com/#" className="linkedin"><i className="bi bi-linkedin"></i></a>
                                                            <a href="https://github.com/#" className="github"><i className="bi bi-github"></i></a>
                                                            <a href="https://facebook.com/#" className="facebook"><i className="bi bi-facebook"></i></a>
                                                            <a href="https://instagram.com/#" className="instagram"><i className="bi bi-instagram"></i></a>
                                                        </div>
                                                    </div>
                
                                                    <div className="col-lg-9 col-md-8">
                                                        <div className="author-content">
                                                            <h3 className="author-name">Sarah Anderson</h3>
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
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                
                                    </section>
                                    
                                    {/* Blog Comments Section */}
                                    <section id="blog-comments" className="blog-comments section">
                
                                        <div className="container" data-aos="fade-up" data-aos-delay="100">
                
                                            <div className="blog-comments-3">
                                                <div className="section-header">
                                                    <h3>Discussion <span className="comment-count">(8)</span></h3>
                                                </div>
                
                                                <div className="comments-wrapper">
                                                    {/* Comment 1 */}
                                                    <article className="comment-card">
                                                        <div className="comment-header">
                                                            <div className="user-info">
                                                                <img src="assets/img/person/person-f-9.webp" alt="User avatar" loading="lazy"/>
                                                                <div className="meta">
                                                                    <h4 className="name">Sarah Williams</h4>
                                                                    <span className="date"><i className="bi bi-calendar3"></i> February 13, 2025</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="comment-content">
                                                            <p>
                                                                Proin iaculis purus consequat sem cure digni ssim donec porttitora entum suscipit rhoncus. Accusantium quam, ultricies eget id, aliquam eget nibh et. Maecen aliquam, risus at semper.
                                                            </p>
                                                        </div>
                                                        <div className="comment-actions">
                                                            <button className="action-btn like-btn">
                                                                <i className="bi bi-hand-thumbs-up"></i>
                                                                <span>12</span>
                                                            </button>
                                                            <button className="action-btn reply-btn">
                                                                <i className="bi bi-reply"></i>
                                                                <span>Reply</span>
                                                            </button>
                                                        </div>
                                                    </article>
                
                                                    {/* Comment 2 with replies */}
                                                    <article className="comment-card">
                                                        <div className="comment-header">
                                                            <div className="user-info">
                                                                <img src="assets/img/person/person-m-9.webp" alt="User avatar" loading="lazy"/>
                                                                <div className="meta">
                                                                    <h4 className="name">James Cooper</h4>
                                                                    <span className="date"><i className="bi bi-calendar3"></i> February 13, 2025</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="comment-content">
                                                            <p>
                                                                Quisque ut nisi. Donec mi odio, faucibus at, scelerisque quis, convallis in, nisi. Suspendisse non nisl sit amet velit hendrerit rutrum. Ut leo. Ut a nisl id ante tempus hendrerit.
                                                            </p>
                                                        </div>
                                                        <div className="comment-actions">
                                                            <button className="action-btn like-btn">
                                                                <i className="bi bi-hand-thumbs-up"></i>
                                                                <span>8</span>
                                                            </button>
                                                            <button className="action-btn reply-btn">
                                                                <i className="bi bi-reply"></i>
                                                                <span>Reply</span>
                                                            </button>
                                                        </div>
                
                                                        {/* Reply Thread */}
                                                        <div className="reply-thread">
                                                            {/* Reply 1 */}
                                                            <article className="comment-card reply">
                                                                <div className="comment-header">
                                                                    <div className="user-info">
                                                                        <img src="assets/img/person/person-f-9.webp" alt="User avatar" loading="lazy"/>
                                                                        <div className="meta">
                                                                            <h4 className="name">Emily Parker</h4>
                                                                            <span className="date"><i className="bi bi-calendar3"></i> February 13, 2025</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="comment-content">
                                                                    <p>
                                                                        Cras ultricies mi eu turpis hendrerit fringilla. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae.
                                                                    </p>
                                                                </div>
                                                                <div className="comment-actions">
                                                                    <button className="action-btn like-btn">
                                                                        <i className="bi bi-hand-thumbs-up"></i>
                                                                        <span>5</span>
                                                                    </button>
                                                                    <button className="action-btn reply-btn">
                                                                        <i className="bi bi-reply"></i>
                                                                        <span>Reply</span>
                                                                    </button>
                                                                </div>
                                                            </article>
                
                                                            {/* Reply 2 */}
                                                            <article className="comment-card reply">
                                                                <div className="comment-header">
                                                                    <div className="user-info">
                                                                        <img src="assets/img/person/person-f-7.webp" alt="User avatar" loading="lazy"/>
                                                                        <div className="meta">
                                                                            <h4 className="name">Daniel Brown</h4>
                                                                            <span className="date"><i className="bi bi-calendar3"></i> February 13, 2025</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="comment-content">
                                                                    <p>
                                                                        Nam commodo suscipit quam. Vestibulum ullamcorper mauris at ligula. Fusce fermentum odio nec arcu.
                                                                    </p>
                                                                </div>
                                                                <div className="comment-actions">
                                                                    <button className="action-btn like-btn">
                                                                        <i className="bi bi-hand-thumbs-up"></i>
                                                                        <span>3</span>
                                                                    </button>
                                                                    <button className="action-btn reply-btn">
                                                                        <i className="bi bi-reply"></i>
                                                                        <span>Reply</span>
                                                                    </button>
                                                                </div>
                                                            </article>
                                                        </div>
                                                    </article>
                
                                                    {/* Comment 3 */}
                                                    <article className="comment-card">
                                                        <div className="comment-header">
                                                            <div className="user-info">
                                                                <img src="assets/img/person/person-m-6.webp" alt="User avatar" loading="lazy"/>
                                                                <div className="meta">
                                                                    <h4 className="name">Rachel Adams</h4>
                                                                    <span className="date"><i className="bi bi-calendar3"></i> February 13, 2025</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="comment-content">
                                                            <p>
                                                                Vivamus elementum semper nisi. Aenean vulputate eleifend tellus. Aenean leo ligula, porttitor eu, consequat vitae, eleifend ac, enim.
                                                            </p>
                                                        </div>
                                                        <div className="comment-actions">
                                                            <button className="action-btn like-btn">
                                                                <i className="bi bi-hand-thumbs-up"></i>
                                                                <span>6</span>
                                                            </button>
                                                            <button className="action-btn reply-btn">
                                                                <i className="bi bi-reply"></i>
                                                                <span>Reply</span>
                                                            </button>
                                                        </div>
                                                    </article>
                                                </div>
                                            </div>
                
                                        </div>
                
                                    </section>
                                    
                                    {/* Blog Comment Form Section */}
                                    <section id="blog-comment-form" className="blog-comment-form section">
                
                                        <div className="container" data-aos="fade-up" data-aos-delay="100">
                
                                            <form method="post" role="form">
                
                                                <div className="section-header">
                                                    <h3>Share Your Thoughts</h3>
                                                    <p>
                                                        Your email address will not be published. Required fields are marked *
                                                    </p>
                                                </div>
                
                                                <div className="row gy-3">
                                                    <div className="col-md-6 form-group">
                                                        <label for="name">Full Name *</label>
                                                        <input type="text" name="name" className="form-control" id="name" placeholder="Enter your full name" required />
                                                    </div>
                
                                                    <div className="col-md-6 form-group">
                                                        <label for="email">Email Address *</label>
                                                        <input type="email" name="email" className="form-control" id="email" placeholder="Enter your email address" required />
                                                    </div>
                
                                                    <div className="col-12 form-group">
                                                        <label for="website">Website</label>
                                                        <input type="url" name="website" className="form-control" id="website" placeholder="Your website (optional)" />
                                                    </div>
                
                                                    <div className="col-12 form-group">
                                                        <label for="comment">Your Comment *</label>
                                                        <textarea className="form-control" name="comment" id="comment" rows="5" placeholder="Write your thoughts here..." required=""></textarea>
                                                    </div>
                
                                                    <div className="col-12 text-center">
                                                        <button type="submit" className="btn-submit">Post Comment</button>
                                                    </div>
                                                </div>
                
                                            </form>
                
                                        </div>
                
                                    </section>
                
                                </div>
                                <div className="col-lg-4 sidebar">
                                    <div className="widgets-container" data-aos="fade-up" data-aos-delay="200">
                
                                        {/* Search Widget */}
                                        <div className="search-widget widget-item">
                
                                            <h3 className="widget-title">Search</h3>
                                            <form
                                                className="public-search-form mb-4"
                                                role="search"
                                                onSubmit={(event)=>{
                                                    event.preventDefault();
                                                    setPage(1);
                                                }}
                                                >
                                                <label htmlFor="article-search" className="visually-hidden">
                                                    Cari artikel
                                                </label>
                                            
                                                <div className="input-group">
                                                    <input
                                                    id="article-search"
                                                    type="search"
                                                    className="form-control"
                                                    placeholder="Cari artikel berdasarkan judul..."
                                                    value={search}
                                                    onChange={(event)=> {
                                                        setSearch(event.target.value);
                                                        setPage(1);
                                                    }}
                                                />
                                            
                                                    <button className="btn btn-primary" type="submit">
                                                        <i className="bi bi-search me-1" />
                                                        Cari
                                                    </button>
                                                </div>
                                            </form>
                
                                        </div>
                                        {/*/Search Widget */}
                
                                        {/* Categories Widget */}
                                        <div className="categories-widget widget-item">
                
                                            <h3 className="widget-title">Categories</h3>
                                            <ul className="mt-3">
                                                <li><a href="#">General <span>(25)</span></a></li>
                                                <li><a href="#">Lifestyle <span>(12)</span></a></li>
                                                <li><a href="#">Travel <span>(5)</span></a></li>
                                                <li><a href="#">Design <span>(22)</span></a></li>
                                                <li><a href="#">Creative <span>(8)</span></a></li>
                                                <li><a href="#">Educaion <span>(14)</span></a></li>
                                            </ul>
                
                                        </div>
                
                                        {/* Categories Widget */}
                                        <div className="categories-widget widget-item">
                
                                            <h3 className="widget-title">Categories</h3>
                                            <ul className="mt-3">
                                                <li><a href="#">General <span>(25)</span></a></li>
                                                <li><a href="#">Lifestyle <span>(12)</span></a></li>
                                                <li><a href="#">Travel <span>(5)</span></a></li>
                                                <li><a href="#">Design <span>(22)</span></a></li>
                                                <li><a href="#">Creative <span>(8)</span></a></li>
                                                <li><a href="#">Educaion <span>(14)</span></a></li>
                                            </ul>
                
                                        </div>
                                        
                                        {/* 5 Recent Posts Widget */}
                                        <div className="recent-posts-widget widget-item">
                
                                            <h3 className="widget-title">Recent Posts</h3>
                
                                            <div className="post-item">
                                                <img src="assets/img/blog/blog-post-square-1.webp" alt="" className="flex-shrink-0"/>
                                                <div>
                                                    <h4><a href="blog-details">Nihil blanditiis at in nihil autem</a></h4>
                                                    <time datetime="2020-01-01">Jan 1, 2020</time>
                                                </div>
                                            </div>
                
                                        </div>
                
                                        {/* Tags Widget */}
                                        <div className="tags-widget widget-item">
                
                                            <h3 className="widget-title">Tags</h3>
                                            <ul>
                                                <li><a href="#">App</a></li>
                                                <li><a href="#">IT</a></li>
                                                <li><a href="#">Business</a></li>
                                                <li><a href="#">Mac</a></li>
                                                <li><a href="#">Design</a></li>
                                                <li><a href="#">Office</a></li>
                                                <li><a href="#">Creative</a></li>
                                                <li><a href="#">Studio</a></li>
                                                <li><a href="#">Smart</a></li>
                                                <li><a href="#">Tips</a></li>
                                                <li><a href="#">Marketing</a></li>
                                            </ul>
                
                                        </div>
                
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}
        
            </main>
        
            <footer id="footer" className="footer">
                <div className="container footer-top">
                    <div className="row gy-4">
                        <div className="col-lg-4 col-md-3 col-sm-6 footer-about">
                            <a href="index" className="logo d-flex align-items-center">
                                <span className="sitename">Blogy</span>
                            </a>
                            <div className="footer-contact pt-3">
                                <p>
                                    A108 Adam Street
                                </p>
                                <p>
                                    New York, NY 535022
                                </p>
                                <p className="mt-3">
                                    <strong>Phone:</strong> <span>+1 5589 55488 55</span>
                                </p>
                                <p>
                                    <strong>Email:</strong> <span>info@example.com</span>
                                </p>
                            </div>
                            <div className="social-links d-flex mt-4">
                                <a href=""><i className="bi bi-twitter-x"></i></a>
                                <a href=""><i className="bi bi-facebook"></i></a>
                                <a href=""><i className="bi bi-instagram"></i></a>
                                <a href=""><i className="bi bi-linkedin"></i></a>
                            </div>
                        </div>
        
                        <div className="col-lg-2 col-md-3 col-sm-6 footer-links">
                            <h4>Useful Links</h4>
                            <ul>
                                <li><a href="#">Home</a></li>
                                <li><a href="#">About us</a></li>
                                <li><a href="#">Services</a></li>
                                <li><a href="#">Terms of service</a></li>
                                <li><a href="#">Privacy policy</a></li>
                            </ul>
                        </div>
        
                        <div className="col-lg-2 col-md-3 col-sm-6 footer-links">
                            <h4>Our Services</h4>
                            <ul>
                                <li><a href="#">Web Design</a></li>
                                <li><a href="#">Web Development</a></li>
                                <li><a href="#">Product Management</a></li>
                                <li><a href="#">Marketing</a></li>
                                <li><a href="#">Graphic Design</a></li>
                            </ul>
                        </div>
        
                        <div className="col-lg-2 col-md-3 col-sm-6 footer-links">
                            <h4>Hic solutasetp</h4>
                            <ul>
                                <li><a href="#">Molestiae accusamus iure</a></li>
                                <li><a href="#">Excepturi dignissimos</a></li>
                                <li><a href="#">Suscipit distinctio</a></li>
                                <li><a href="#">Dilecta</a></li>
                                <li><a href="#">Sit quas consectetur</a></li>
                            </ul>
                        </div>
        
                        <div className="col-lg-2 col-md-3 col-sm-6 footer-links">
                            <h4>Nobis illum</h4>
                            <ul>
                                <li><a href="#">Ipsam</a></li>
                                <li><a href="#">Laudantium dolorum</a></li>
                                <li><a href="#">Dinera</a></li>
                                <li><a href="#">Trodelas</a></li>
                                <li><a href="#">Flexo</a></li>
                            </ul>
                        </div>
        
                    </div>
                </div>
                <div className="container copyright text-center mt-4">
                </div>
            </footer>
        
            {/* Scroll Top */}
            <a href="#" id="scroll-top" className="scroll-top d-flex align-items-center justify-content-center"><i className="bi bi-arrow-up-short"></i></a>
        </>
    );
}