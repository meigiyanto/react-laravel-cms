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
    
        const loadData = async () => {
            setLoading(true);
            setError('');
    
            if (slug) {
                setPost(null);
                setComments(null);
                setCommentMessage('');
                setCommentError('');
    
                try {
                    const [postResponse, commentsResponse] = await Promise.all([
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
                    const response = await publicApi.get('/public/posts', {
                        params: {
                            page,
                            search: search || undefined,
                            category: category || undefined,
                        },
                    });
    
                    if (active) setPosts(response.data.data);
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
        <>
            <header id="header" className="header d-flex align-items-center position-relative">
                <div className="container position-relative d-flex align-items-center justify-content-between">
        
                    <a href="index" className="logo d-flex align-items-center me-auto me-xl-0">
                        {/* Uncomment the line below if you also wish to use an image logo */}
                        {/* <img src="assets/img/logo.webp" alt="" /> */}
                        <h1 className="sitename">Story</h1>
                    </a>
        
                    <nav id="navmenu" className="navmenu">
                        <ul>
                            <li><a href="index" className="active">Home</a></li>
                            <li><a href="about">About</a></li>
                            <li><a href="category">Category</a></li>
                            <li><a href="blog-details">Blog Details</a></li>
                            <li><a href="author-profile">Author Profile</a></li>
                            <li className="dropdown"><a href="#"><span>Pages</span> <i className="bi bi-chevron-down toggle-dropdown"></i></a>
                                <ul>
                                    <li><a href="about">About</a></li>
                                    <li><a href="category">Category</a></li>
                                    <li><a href="blog-details">Blog Details</a></li>
                                    <li><a href="author-profile">Author Profile</a></li>
                                    <li><a href="search-results">Search Results</a></li>
                                    <li><a href="404">404 Not Found Page</a></li>
        
                                    <li className="dropdown"><a href="#"><span>Deep Dropdown</span> <i className="bi bi-chevron-down toggle-dropdown"></i></a>
                                        <ul>
                                            <li><a href="#">Deep Dropdown 1</a></li>
                                            <li><a href="#">Deep Dropdown 2</a></li>
                                            <li><a href="#">Deep Dropdown 3</a></li>
                                            <li><a href="#">Deep Dropdown 4</a></li>
                                            <li><a href="#">Deep Dropdown 5</a></li>
                                        </ul>
                                    </li>
                                </ul>
                            </li>
                            <li><a href="contact">Contact</a></li>
                        </ul>
                        <i className="mobile-nav-toggle d-xl-none bi bi-list"></i>
                    </nav>
        
                    <div className="header-social-links">
                        <a href="#">Dashboard</a>
                    </div>
        
                </div>
            </header>

            <main className="main">
        
                {/* Blog Hero Section */}
                <section id="blog-hero" className="blog-hero section">
        
                    <div className="container-fluid p-0" data-aos="fade">
        
                        <div className="blog-hero-slider swiper init-swiper">
                            {/*
                            <script type="application/json" className="swiper-config">
                                {
                                    "loop": true,
                                    "speed": 1000,
                                    "effect": "fade",
                                    "autoplay": {
                                        "delay": 5000
                                    },
                                    "slidesPerView": 1,
                                    "navigation": {
                                        "nextEl": ".swiper-button-next",
                                        "prevEl": ".swiper-button-prev"
                                    }
                                }
                            </script>
                            */}
        
                            <div className="swiper-wrapper">
        
                                <div className="swiper-slide">
                                    <div className="blog-hero-item">
                                        <img src="assets/img/blog/blog-hero-1.webp" alt="Blog Hero Image" className="img-fluid"/>
                                        <div className="blog-hero-content">
                                            <span className="category">Lifestyle</span>
                                            <h1>5 Efficient Rules How to Organize Working Place Relationship</h1>
                                            <div className="meta">
                                                <span className="author">BY <a href="#">Dary Smith</a></span>
                                                <span className="date">02 Jan, 2024</span>
                                                <span className="read-time">3 Minute Read</span>
                                                <span className="views">1.9k views</span>
                                            </div>
                                            <a href="blog-details" className="read-more">Continue Reading <i className="bi bi-arrow-right"></i></a>
                                        </div>
                                    </div>
                                </div>
                                {/* End slide item */}
        
        
                            </div>
        
                            <div className="swiper-button-prev"></div>
                            <div className="swiper-button-next"></div>
        
                        </div>
        
                    </div>
        
                </section>
                {/* /Blog Hero Section */}
        
                {/* Featured Posts Section */}
                <section id="featured-posts" className="featured-posts section">
        
                    {/* Section Title */}
                    <div className="container section-title" data-aos="fade-up">
                        <span className="description-title">Featured Posts</span>
                        <h2>Featured Posts</h2>
                        <p>
                            Necessitatibus eius consequatur ex aliquid fuga eum quidem sint consectetur velit
                        </p>
                    </div>
                    {/* End Section Title */}
        
                    <div className="container" data-aos="fade-up" data-aos-delay="100">
        
                        <div className="blog-posts-slider swiper init-swiper">
                            {/*
                            <script type="application/json" className="swiper-config">
                                {
                                    "loop": true,
                                    "speed": 600,
                                    "autoplay": {
                                        "delay": 4500
                                    },
                                    "slidesPerView": 1,
                                    "spaceBetween": 40,
                                    "centeredSlides": true,
                                    "breakpoints": {
                                        "768": {
                                            "slidesPerView": 1.5,
                                            "spaceBetween": 30
                                        },
                                        "1200": {
                                            "slidesPerView": 2.2,
                                            "spaceBetween": 40
                                        }
                                    },
                                    "pagination": {
                                        "el": ".swiper-pagination",
                                        "clickable": true
                                    }
                                }
                            </script>
                            */}
        
                            <div className="swiper-wrapper">
                                <div className="swiper-slide">
                                    <article className="blog-card">
                                        <div className="blog-image">
                                            <img src="assets/img/blog/blog-post-square-3.webp" alt="Blog Image" loading="lazy"/>
                                            <div className="category-badge">
                                                Technology
                                            </div>
                                        </div>
                                        <div className="blog-content">
                                            <div className="author-info">
                                                <img src="assets/img/person/person-f-8.webp" alt="Author" className="author-avatar"/>
                                                <div className="author-details">
                                                    <span className="author-name">Rebecca Martinez</span>
                                                    <span className="publish-date">February 8, 2025</span>
                                                </div>
                                            </div>
                                            <h3><a href="#">Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod</a></h3>
                                            <p>
                                                Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Vestibulum tortor quam, feugiat vitae.
                                            </p>
                                            <div className="blog-footer">
                                                <div className="reading-time">
                                                    <i className="bi bi-clock"></i>
                                                    <span>5 min read</span>
                                                </div>
                                                <a href="#" className="btn-read-more">
                                                    <span>Continue Reading</span>
                                                    <i className="bi bi-arrow-right"></i>
                                                </a>
                                            </div>
                                        </div>
                                    </article>
                                </div>
                                {/* End slide item */}
        
        
                            </div>
        
                            <div className="swiper-pagination"></div>
                        </div>
        
                    </div>
        
                </section>
                {/* /Featured Posts Section */}
        
                {/* Category Section Section */}
                <section id="category-section" className="category-section section">
        
                    {/* Section Title */}
                    <div className="container section-title" data-aos="fade-up">
                        <span className="description-title">Category Section</span>
                        <h2>Category Section</h2>
                        <p>
                            Necessitatibus eius consequatur ex aliquid fuga eum quidem sint consectetur velit
                        </p>
                    </div>
                    {/* End Section Title */}
        
                    <div className="container" data-aos="fade-up" data-aos-delay="100">
                        {/* Main Featured Post */}
                        <div className="row gy-4 mb-5">
                            <div className="col-lg-8">
                                <article className="hero-post" data-aos="zoom-out" data-aos-delay="200">
                                    <div className="post-img">
                                        <img src="assets/img/blog/blog-post-5.webp" alt="" className="img-fluid" loading="lazy"/>
                                    </div>
                                    <div className="post-content">
                                        <div className="author-info">
                                            <img src="assets/img/person/person-m-8.webp" alt="" className="author-avatar"/>
                                            <div className="author-details">
                                                <span className="author-name">Michael R.</span>
                                                <span className="post-date">15 March 2024</span>
                                            </div>
                                        </div>
                                        <h2 className="post-title">
                                            <a href="blog-details">Lorem ipsum dolor sit amet, consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore</a>
                                        </h2>
                                        <p className="post-excerpt">
                                            Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.
                                        </p>
                                        <div className="post-stats">
                                            <span className="read-time"><i className="bi bi-clock"></i> 5 min read</span>
                                            <span className="comments"><i className="bi bi-chat-dots"></i> 12 comments</span>
                                        </div>
                                    </div>
                                </article>
                            </div>
        
                            <div className="col-lg-4">
                                <div className="sidebar-posts">
                                    
                                    <article className="sidebar-post" data-aos="fade-left" data-aos-delay="300">
                                        <div className="post-img">
                                            <img src="assets/img/blog/blog-post-8.webp" alt="" className="img-fluid" loading="lazy"/>
                                        </div>
                                        <div className="post-content">
                                            <span className="post-category">Design</span>
                                            <h4 className="title">
                                                <a href="blog-details">Neque porro quisquam est qui dolorem ipsum quia dolor sit amet</a>
                                            </h4>
                                            <div className="post-meta">
                                                <span className="post-date">22 February 2024</span>
                                            </div>
                                        </div>
                                    </article>
                                    
                                </div>
                            </div>
                        </div>
                        
                        {loading ? (
                            <div className="public-loading" role="status">Menyiapkan cerita untukmu…</div> 
                        ) : posts?.data.length ? (
                            <div className="posts-grid">
                                <div className="row gy-4">
                                {posts.data.map((item, index) => (
                                    <div className="col-md-6" data-aos="fade-up" data-aos-delay="200">
                                        <article className="grid-post">
                                            <div className="post-img">
                                                {item.featured_image && imageUrl(item.featured_image) ? (
                                                    <img src={imageUrl(item.featured_image)} alt={item.featured_image.alt_text || item.title} className="img-fluid" loading="lazy" /> 
                                                ) : (
                                                    <span className={`post-image-placeholder placeholder-${index % 4}`}><span>JURNAL<br />IDE</span><b>✳</b></span>
                                                )}
                                                <div className="post-overlay">
                                                    <span className="category-tag">{item.categories[0]?.name || 'Artikel'}</span>
                                                </div>
                                            </div>
                                            
                                            <div className="post-content">
                                                <h3 className="title">
                                                    <button className="btn btn-outline-light" onClick={() => navigate(`/artikel/${encodeURIComponent(item.slug)}`)}>{item.title}</button>
                                                </h3>
                                                <p className="excerpt">{excerpt(item)}</p>
                                                <div className="post-footer">
                                                    <div className="author-info">
                                                        <img src="assets/img/person/person-f-7.webp" alt="" className="author-img"/>
                                                        <span className="author-name">Sarah K.</span>
                                                    </div>
                                                    {/* <span className="read-time">3 min read</span> */}
                                                    <time>{dateLabel(item.published_at || item.created_at)}</time>
                                                </div>
                                            </div>
                                        </article>
                                    </div>
                                ))}
                                </div>
                            </div>
                        ) : !error ? (
                            <div className="public-empty">
                                <span>✳</span>
                                <h3>Belum ada artikel untuk ditampilkan</h3>
                                <p>Artikel yang telah dipublikasikan akan muncul di sini.</p>
                            </div>
                            ) : null
                        }
                        
                    </div>
        
                </section>
                {/* /Category Section Section */}
        
                {/* Latest Posts Section */}
                <section id="latest-posts" className="latest-posts section">
        
                    {/* Section Title */}
                    <div className="container section-title" data-aos="fade-up">
                        <span className="description-title">Latest Posts</span>
                        <h2>Latest Posts</h2>
                        <p>
                            Necessitatibus eius consequatur ex aliquid fuga eum quidem sint consectetur velit
                        </p>
                    </div>
                    {/* End Section Title */}
        
                    <div className="container" data-aos="fade-up" data-aos-delay="100">
        
                        <div className="row gy-4 align-items-stretch">
        
                            <div className="col-lg-7" data-aos="zoom-in" data-aos-delay="150">
                                <article className="featured-post position-relative h-100">
                                    <figure className="featured-media m-0">
                                        <img src="assets/img/blog/blog-hero-4.webp" alt="Featured post image" className="img-fluid w-100" loading="lazy"/>
                                    </figure>
        
                                    <div className="featured-content">
                                        <div className="date-badge">
                                            <span className="day">12</span>
                                            <span className="mon">Dec</span>
                                        </div>
        
                                        <span className="cat-badge inverse">Politics</span>
        
                                        <h3 className="title">Veritatis maiores natus officiis sit, temporibus alias dicta voluptatum</h3>
                                        <p className="excerpt d-none d-md-block">
                                            Quisquam perferendis officiis incidunt, facilisis aliquet consectetur lorem luctus. Ullamco laboris nisi ut aliquip ex ea commodo consequat.
                                        </p>
        
                                        <div className="meta d-flex align-items-center gap-3">
                                            <div className="d-flex align-items-center">
                                                <i className="bi bi-person"></i><span className="ps-2">Jane Cooper</span>
                                            </div>
                                            <span className="sep">/</span>
                                            <div className="d-flex align-items-center">
                                                <i className="bi bi-folder2"></i><span className="ps-2">Editorial</span>
                                            </div>
                                        </div>
        
                                        <a href="blog-details" className="readmore stretched-link"><span>Continue</span><i className="bi bi-arrow-right"></i></a>
                                    </div>
                                </article>
                            </div>
                            {/* End Featured Post */}
        
                            <div className="col-lg-5">
                                <div className="row gy-4">
                                    <div className="col-12" data-aos="fade-left" data-aos-delay="200">
                                        <article className="compact-post h-100">
                                            <div className="thumb">
                                                <img src="assets/img/blog/blog-post-square-2.webp" className="img-fluid" alt="Post thumbnail" loading="lazy"/>
                                            </div>
                                            <div className="content">
                                                <div className="meta">
                                                    <span className="date">05 Aug</span>
                                                    <span className="dot">•</span>
                                                    <span className="category">Sports</span>
                                                </div>
                                                <h4 className="title">Officia recusandae cumque, dolore asperiores ducimus</h4>
                                                <a href="blog-details" className="readmore"><span>Read Article</span><i className="bi bi-arrow-right"></i></a>
                                            </div>
                                        </article>
                                    </div>
                                    {/* End Compact Post */}
        
        
                                </div>
                            </div>
                            {/* End Right Column */}
        
                            <div className="col-lg-4" data-aos="fade-up" data-aos-delay="200">
                                <article className="card-post h-100">
                                    <div className="post-img position-relative overflow-hidden">
                                        <img src="assets/img/blog/blog-post-2.webp" className="img-fluid w-100" alt="Post image" loading="lazy"/>
                                    </div>
                                    <div className="content">
                                        <div className="meta d-flex align-items-center flex-wrap gap-2">
                                            <span className="cat-badge">Economics</span>
                                            <div className="d-flex align-items-center ms-auto">
                                                <i className="bi bi-person"></i><span className="ps-2">Robert Fox</span>
                                            </div>
                                        </div>
                                        <h3 className="title">Quam impedit minus, cumque aliquam deleniti inventore</h3>
                                        <a href="blog-details" className="readmore"><span>Read More</span><i className="bi bi-arrow-right"></i></a>
                                    </div>
                                </article>
                            </div>
                            {/* End Grid Post */}
        
        
                        </div>
        
                    </div>
        
                </section>
                {/* /Latest Posts Section */}
        
            </main>
        
            <footer id="footer" className="footer position-relative light-background">
        
                <div className="container">
                    <div className="row gy-5">
        
                        <div className="col-lg-4">
                            <div className="footer-brand">
                                <a href="index" className="logo d-flex align-items-center mb-3">
                                    <span className="sitename">Story</span>
                                </a>
                                <p className="tagline">
                                    Innovating the digital landscape with elegant solutions and timeless design.
                                </p>
        
                                <div className="social-links mt-4">
                                    <a href="#" aria-label="Facebook"><i className="bi bi-facebook"></i></a>
                                    <a href="#" aria-label="Instagram"><i className="bi bi-instagram"></i></a>
                                    <a href="#" aria-label="LinkedIn"><i className="bi bi-linkedin"></i></a>
                                    <a href="#" aria-label="Twitter"><i className="bi bi-twitter-x"></i></a>
                                    <a href="#" aria-label="Dribbble"><i className="bi bi-dribbble"></i></a>
                                </div>
                            </div>
                        </div>
        
                        <div className="col-lg-6">
                            <div className="footer-links-grid">
                                <div className="row">
                                    <div className="col-6 col-md-4">
                                        <h5>Company</h5>
                                        <ul className="list-unstyled">
                                            <li><a href="#">About Us</a></li>
                                            <li><a href="#">Our Team</a></li>
                                            <li><a href="#">Careers</a></li>
                                            <li><a href="#">Newsroom</a></li>
                                        </ul>
                                    </div>
                                    <div className="col-6 col-md-4">
                                        <h5>Services</h5>
                                        <ul className="list-unstyled">
                                            <li><a href="#">Web Development</a></li>
                                            <li><a href="#">UI/UX Design</a></li>
                                            <li><a href="#">Digital Strategy</a></li>
                                            <li><a href="#">Branding</a></li>
                                        </ul>
                                    </div>
                                    <div className="col-6 col-md-4">
                                        <h5>Support</h5>
                                        <ul className="list-unstyled">
                                            <li><a href="#">Help Center</a></li>
                                            <li><a href="#">Contact Us</a></li>
                                            <li><a href="#">Privacy Policy</a></li>
                                            <li><a href="#">Terms of Service</a></li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
        
                        <div className="col-lg-2">
                            <div className="footer-cta">
                                <h5>Let's Connect</h5>
                                <a href="contact" className="btn btn-outline">Get in Touch</a>
                            </div>
                        </div>
        
                    </div>
                </div>
        
                <div className="footer-bottom">
                    <div className="container">
                        <div className="row">
                            <div className="col-12">
                                <div className="footer-bottom-content">
                                    <p className="mb-0">
                                        © <strong>Story</strong>. All rights reserved.
                                    </p>
                                    <div className="credits">
                                        {/* All the links in the footer should remain intact. */}
                                        {/* You can delete the links only if you've purchased the pro version. */}
                                        {/* Licensing information: https://bootstrapmade.com/license/ */}
                                        {/* Purchase the pro version with working PHP/AJAX contact form: [buy-url] */}
                                        Designed by <a href="https://bootstrapmade.com/">BootstrapMade</a> | <a href="https://bootstrapmade.com/tools/">DevTools</a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
        
            </footer>
        
            {/* Scroll Top */}
            <a href="#" id="scroll-top" className="scroll-top d-flex align-items-center justify-content-center"><i className="bi bi-arrow-up-short"></i></a>
        
            {/* 
            Preloader
                <div id="preloader"></div>
            */}
        </>
    );
}