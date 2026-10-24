import { Link } from 'react-router-dom';
import { useState } from 'react';
import { AuthProfileContext, type AuthProfile } from '../auth/AuthProfileContext';
import Header from '../../components/public/Header';
import Footer from '../../components/public/Footer';
import BackToTop from '../../components/public/BackToTop';

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

export default function AbouAuthor() {
    const [profile, setProfile] = useState<AuthProfile | null>(null);
    
    async function loadProfile(): Promise<AuthProfile> {
        const response = await api.get('/auth/me');
        const data = response.data?.data;
    
        if (!data ||
            !Array.isArray(data.permissions) ||
            !data.role?.slug
        ) {
            throw new Error('Profil atau hak akses tidak valid.');
        }
    
        return {
            id: data.id,
            name: data.name,
            email: data.email,
            profile_photo_url: data.profile_photo_url ?? null,
            role: data.role,
            permissions: data.permissions,
        };
    }
    
    return (
        <>
            <Header />
            <main className="main">
                <div className="page-title">
                    <div className="breadcrumbs">
                        <nav aria-label="breadcrumb">
                            <ol className="breadcrumb">
                                <li className="breadcrumb-item"><Link to="#"><i className="bi bi-house"></i> Home</Link></li>
                                <li className="breadcrumb-item active current">Author Author</li>
                            </ol>
                        </nav>
                    </div>
        
                    <div className="title-wrapper">
                        <h1>Author Profile</h1>
                        <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut elit tellus, luctus nec ullamcorper mattis, pulvinar dapibus leo.</p>
                    </div>
                </div>
                
                <section id="author-profile" className="author-profile section">
                    <div className="container" data-aos="fade-up" data-aos-delay="100">
                        <div className="author-profile-1">
                            <div className="row">
                                <div className="col-lg-4 mb-4 mb-lg-0">
                                    <div className="author-card" data-aos="fade-up">
                                        <div className="author-image">
                                            <img src="assets/img/person/person-m-5.webp" alt="Author" className="img-fluid rounded" />
                                            {authorImageUrl(post.user) ? (
                                                <img src={authorImageUrl(post.user)} alt={`Foto ${post.user?.name}`} className="img-fluid rounded" loading="lazy" onError={(event) => { event.currentTarget.style.display = 'none'; }} />
                                            ) : (
                                                <span className="author-avatar-fallback" aria-hidden="true"> {(post.user?.name || 'T').charAt(0).toUpperCase()}</span>
                                            )}
                                        </div>
        
                                        <div className="author-info">
                                            <h2>Kevin Anderson</h2>
                                            <p className="designation">
                                                Senior Technology Writer
                                            </p>
        
                                            <div className="author-bio">
                                                Through my articles, I explore the intersection of technology and society, focusing on how emerging tech shapes our daily lives and future possibilities.
                                            </div>
        
                                            <div className="author-stats d-flex justify-content-between text-center my-4">
                                                <div className="stat-item">
                                                    <h4 data-purecounter-start="0" data-purecounter-end="147" data-purecounter-duration="1" className="purecounter"></h4>
                                                    <p>
                                                        Articles
                                                    </p>
                                                </div>
                                                <div className="stat-item">
                                                    <h4 data-purecounter-start="0" data-purecounter-end="13" data-purecounter-duration="1" className="purecounter"></h4>
                                                    <p>
                                                        Awards
                                                    </p>
                                                </div>
                                                <div className="stat-item">
                                                    <h4 data-purecounter-start="0" data-purecounter-end="25" data-purecounter-duration="1" className="purecounter">K</h4>
                                                    <p>
                                                        Followers
                                                    </p>
                                                </div>
                                            </div>
        
                                            <div className="social-links">
                                                <Link to="#" className="twitter"><i className="bi bi-twitter-x"></i></Link>
                                                <Link to="#" className="facebook"><i className="bi bi-facebook"></i></Link>
                                                <Link to="#" className="instagram"><i className="bi bi-instagram"></i></Link>
                                                <Link to="#" className="linkedin"><i className="bi bi-linkedin"></i></Link>
                                            </div>
                                        </div>
                                    </div>
                                </div>
        
                                <div className="col-lg-8">
                                    <div className="author-content" data-aos="fade-up" data-aos-delay="200">
                                        <div className="content-header">
                                            <h3>About Me</h3>
                                        </div>
                                        <div className="content-body">
                                            <p>
                                                With over a decade of experience in technology journalism, I've had the privilege of witnessing and documenting the rapid evolution of our digital landscape. My work spans from in-depth analysis of artificial intelligence and its implications to hands-on reviews of the latest consumer technology.
                                            </p>
        
                                            <div className="expertise-areas">
                                                <h4>Areas of Expertise</h4>
                                                <div className="tags">
                                                    <span>Artificial Intelligence</span>
                                                    <span>Cybersecurity</span>
                                                    <span>Smart Home Technology</span>
                                                    <span>Digital Privacy</span>
                                                    <span>Consumer Electronics</span>
                                                    <span>Future Tech Trends</span>
                                                </div>
                                            </div>
        
                                            <div className="featured-articles mt-5">
                                                <h4>Featured Articles</h4>
                                                <div className="row g-4">
                                                    <div className="col-md-6" data-aos="fade-up" data-aos-delay="300">
                                                        <article className="article-card">
                                                            <div className="article-img">
                                                                <img src="assets/img/blog/blog-post-10.webp" alt="Article" className="img-fluid" />
                                                            </div>
                                                            <div className="article-details">
                                                                <div className="post-category">
                                                                    Technology
                                                                </div>
                                                                <h5><Link to="#">The Future of AI in Everyday Computing</Link></h5>
                                                                <div className="post-meta">
                                                                    <span><i className="bi bi-clock"></i> Jan 15, 2024</span>
                                                                    <span><i className="bi bi-chat-dots"></i> 24 Comments</span>
                                                                </div>
                                                            </div>
                                                        </article>
                                                    </div>
        
                                                    <div className="col-md-6" data-aos="fade-up" data-aos-delay="400">
                                                        <article className="article-card">
                                                            <div className="article-img">
                                                                <img src="assets/img/blog/blog-post-6.webp" alt="Article" className="img-fluid" />
                                                            </div>
                                                            <div className="article-details">
                                                                <div className="post-category">
                                                                    Privacy
                                                                </div>
                                                                <h5><Link to="#">Understanding Digital Privacy in 2024</Link></h5>
                                                                <div className="post-meta">
                                                                    <span><i className="bi bi-clock"></i> Feb 3, 2024</span>
                                                                    <span><i className="bi bi-chat-dots"></i> 18 Comments</span>
                                                                </div>
                                                            </div>
                                                        </article>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
        
                            </div>
        
                        </div>
        
                    </div>
        
                </section>
            </main>
            <Footer />
            <BackToTop />
        </>
    )
}