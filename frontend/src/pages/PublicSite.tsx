import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import '../public-site.css';
import axios from 'axios';
// import DOMPurify from 'dompurify';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';
import Header from '../components/public/Header';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';

import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

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
    const [posts, setPosts] = useState<Post[]>([]);
    const [latestPosts, setLatestPosts] = useState<Post[]>([]);
    const [featuredPosts, setfeaturedPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [categoryArticles, setCategoryArticles] = useState<CategoryWithPosts[]>([]);
    const heroPost = posts[0] ?? null;
    
    const [searchParams] = useSearchParams();
    const searchQuery = (searchParams.get('q') || '').trim();
    
    const [searchResults, setSearchResults] = useState<Post[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchError, setSearchError] = useState('');
    
    useEffect(() => {
        let active = true;
    
        const loadData = async () => {
            setLoading(true);
            setError('');
            setPosts([]);
            try {
                const [response, featuredResponse, categoryResponse] =
                    await Promise.all([
                        publicApi.get('/public/posts', {
                            params: { page: 1 },
                        }),
                        publicApi.get('/public/posts', {
                            params: { featured: 1, page: 1 },
                        }),
                        publicApi.get('/public/categories/posts'),
                    ]);
                
                if (active) {
                    setPosts(response.data.data.posts.data);
                    setfeaturedPosts(featuredResponse.data.data.posts.data);
                    setLatestPosts(response.data.data.latestposts);
                    setCategoryArticles(categoryResponse.data.data);
                }
                
            } catch (err: unknown) {
                if (active) setError(errorText(err));
            } finally {
                if (active) setLoading(false);
            }
        };
    
        queueMicrotask(() => {
            if (active) void loadData();
        });
    
        return () => {
            active = false;
        };
    }, []);
    
    useEffect(() => {
    let active = true;

    async function searchArticles() {
        if (!searchQuery) {
            setSearchResults([]);
            setSearchError('');
            setSearchLoading(false);
            return;
        }

        setSearchLoading(true);
        setSearchError('');

        try {
            const response = await publicApi.get('/public/posts', {
                params: {
                    search: searchQuery,
                    page: 1,
                },
            });

            if (active) {
                setSearchResults(
                    response.data?.data?.posts?.data ?? []
                );
            }
        } catch (error: unknown) {
            if (active) {
                setSearchError(errorText(error));
                setSearchResults([]);
            }
        } finally {
            if (active) {
                setSearchLoading(false);
            }
        }
    }
        void searchArticles();
    
        return () => {
            active = false;
        };
    }, [searchQuery]);
    
    return (
        <>
            <Header />
            <main className="main">
                {searchQuery ? (
                    <>
                        <div className="page-title">
                            <div className="breadcrumbs">
                                <nav aria-label="breadcrumb">
                                    <ol className="breadcrumb">
                                        <li className="breadcrumb-item"><a href="#"><i className="bi bi-house"></i> Home</a></li>
                                        <li className="breadcrumb-item"><a href="#">Category</a></li>
                                        <li className="breadcrumb-item active current">Search Results</li>
                                    </ol>
                                </nav>
                            </div>
                
                            <div className="title-wrapper">
                                <h1>Search Results</h1>
                                <p>We found <strong>{searchResults.length}</strong> results for your search term <strong>{searchQuery}</strong></p>
                            </div>
                        </div>
                        
                        {searchLoading ? (
                            <div className="public-loading" role="status">
                                <FontAwesomeIcon
                                    icon={faSpinner}
                                    style={{
                                        animation: 'spinning 1s linear infinite',
                                    }}
                                />
                                {' '}Mencari artikel...
                            </div>
                        ) : searchError ? (
                            <p className="alert alert-danger" role="alert">
                                {searchError}
                            </p>
                        ) : searchResults.length === 0 ? (
                            <div className="public-empty">
                                <h3>Artikel tidak ditemukan</h3>
                                <p>Coba gunakan kata kunci yang berbeda.</p>
                            </div>
                        ) : (
                            <section id="search-results-posts" className="search-results-posts section">
                                <div className="container" data-aos="fade-up" data-aos-delay="100">
                                    <div className="row gy-4">
                                        {searchResults.map((post) => (
                                            <div key={post.id} className="col-md-6 col-lg-4">
                                                <article>

                                                    <div className="post-img">
                                                        {post.featured_image && imageUrl(post.featured_image) ? (
                                                            <img
                                                                src={imageUrl(post.featured_image)}
                                                                alt={post.featured_image.alt_text ||post.title}
                                                                className="img-fluid"
                                                                loading="lazy"
                                                            />
                                                        ) : (
                                                            <div className="post-image-placeholder">
                                                                <span>JURNAL<br />IDE</span>
                                                            </div>
                                                        )}
                                                    </div>
                        
                                                    <p className="post-category">
                                                        {post.categories?.[0]?.name || 'Tanpa kategori'}
                                                    </p>
                        
                                                    <h2 className="title">
                                                        <Link to={`/artikel/${post.slug}`}>
                                                            {post.title}
                                                        </Link>
                                                    </h2>
                        
                                                    <div className="d-flex align-items-center">
                                                        {authorImageUrl(post.user) ? (
                                                            <img src={authorImageUrl(post.user)} alt={`Foto ${post.user?.name || 'penulis'}`} className="img-fluid post-author-img flex-shrink-0" loading="lazy" onError={(event) => { event.currentTarget.style.display = 'none'; }} />
                                                        ) : (
                                                            <span className="author-avatar-fallback" aria-hidden="true"> {(post.user?.name || 'T').charAt(0).toUpperCase()}</span>
                                                        )}
                                                        
                                                        <div className="post-meta">
                                                            <p className="post-author">
                                                                {post.user?.name}
                                                            </p>
                                                            <p className="post-date">
                                                                <time dateTime={post.published_at || post.created_at}>{dateLabel(post.published_at || post.created_at)}</time>
                                                            </p>
                                                        </div>
                                                    </div>
                        
                                                </article>
                                                
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </section>
                        )}
                        
                        {searchResults.length > 12 && (
                            <section id="pagination-3" className="pagination-3 section">

                                <div className="container">
                                    <div className="d-flex justify-content-center">
                                        <ul>
                                            <li><a href="#"><i className="bi bi-chevron-left"></i></a></li>
                                            <li><a href="#">1</a></li>
                                            <li><a href="#" className="active">2</a></li>
                                            <li><a href="#">3</a></li>
                                            <li><a href="#">4</a></li>
                                            <li>...</li>
                                            <li><a href="#">10</a></li>
                                            <li><a href="#"><i className="bi bi-chevron-right"></i></a></li>
                                        </ul>
                                    </div>
                                </div>
                    
                            </section>
                        )}
                    </>
                ) : loading ? (
                    <div className="container public-loading" role="status">
                        <FontAwesomeIcon icon={faSpinner} style={{ animation: 'spinning 1s linear infinite' }}/> Menyiapkan cerita untukmu…
                    </div> 
                ) : posts?.length ? (
                    <>
                        {/* Blog Hero Section */}
                        <section id="blog-hero" className="blog-hero section">
                
                            <div className="container" data-aos="fade-up" data-aos-delay="100">
                                <div className="blog-grid">
                                    {heroPost && (
                                        <article className="blog-item featured" data-aos="fade-up">
                                            {heroPost.featured_image && imageUrl(heroPost.featured_image) ? (
                                                <img
                                                    src={imageUrl(heroPost.featured_image)}
                                                    alt={heroPost.featured_image.alt_text || heroPost.title}
                                                    loading="lazy"
                                                />
                                            ) : (
                                                <div className="post-image-placeholder">
                                                    <span>JURNAL<br />IDE</span>
                                                </div>
                                            )}
                                    
                                            <div className="blog-content">
                                                <div className="post-meta">
                                                    <span className="date">
                                                        {dateLabel(heroPost.published_at || heroPost.created_at)}
                                                    </span>
                                                    <span className="category">
                                                        {heroPost.categories?.[0]?.name || 'Tanpa kategori'}
                                                    </span>
                                                </div>
                                    
                                                <h3 className="post-title">
                                                    <Link to={`/artikel/${heroPost.slug}`}>
                                                        {heroPost.title}
                                                    </Link>
                                                </h3>
                                            </div>
                                        </article>
                                    )}
                                    
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
                                                    <span className="category">{post.categories?.[0]?.name || 'Tanpa Kategori'}</span>
                                                </div>
                                                <h3 className="post-title">
                                                    <Link to={`/artikel/${post.slug}`}>{post.title}</Link>
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
                                    <a href="#" className="float-end">View all posts</a>
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
                                            loop={featuredPosts?.length > 1}
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
                                                            <h2><Link to={`/artikel/${item.slug}`}>{item.title}</Link></h2>
                                                            <p>{excerpt(item)}</p>
                                                            <Link className="read-more" to={`/artikel/${item.slug}`}> <i className="bi bi-arrow-right"></i></Link>
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
                                    <span className="description-title">Check Our Category Posts</span>
                                    <a href="#" className="float-end">View all posts</a>
                                </div>
                            </div>
                            {categoryArticles.map((item, index) => (
                                <div key={index}>
                                    {item.posts?.length > 0 ? (
                                        <div className="container" data-aos="fade-up" data-aos-delay="100">
                                            {item.posts?.length >= 4 && (
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
                                                                        <Link to={`/artikel/${article.slug}`}>{article.title}</Link>
                                                                    </h2>
                                                                </div>
                                                            </article>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            
                                            <div className="row">
                                            {item.posts?.length >= 6 && (
                                                <>
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
                                                                        <Link to={`/artikel/${article.slug}`}>{article.title}</Link>
                                                                    </h3>
                                                                    <div className="post-meta">
                                                                        <span className="post-date">{dateLabel(article.created_at || article.published_at)}</span>
                                                                    </div>
                                                                </div>
                                                            </article>
                                                        </div>
                                                    ))}
                                                </>
                                            )}
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
                                    <a href="#" className="float-end">View all posts</a>
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
                                                <Link to={`/artikel/${post.slug}`}>{post.title}</Link>
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
                                                        <time dateTime={post.created_at || post.published_at}>{dateLabel(post.created_at || post.published_at)}</time>
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
                                            </form>
                                        </div>
                                    </div>
                                    <div className="d-sm-none d-md-block col-lg-4">
                                        <div className="cta-image" data-aos="zoom-out" data-aos-delay="200">
                                            <img src="http://localhost:8000/storage/cms-media/1PwvRWpRVsEdutiPNHZTCAdjmMdSaNpBwsXpsGMU.webp" alt="" className="img-fluid"/>
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