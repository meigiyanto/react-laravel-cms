import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import DOMPurify from 'dompurify';
import Header from '../../components/public/Header';
import Footer from '../../components/public/Footer';
import BackToTop from '../../components/public/BackToTop';
import { handleImageFallback } from '../../utils/imageFallback';
import '../../public-site.css';

type PublicPageData = {
    id: number;
    title: string;
    slug: string;
    body: string;
    published_at: string | null;
    featured_image: {
        url?: string;
        path?: string;
        alt_text?: string | null;
    } | null;
    meta_title: string | null;
    meta_description: string | null;
};

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
const publicApi = axios.create({
    baseURL: API_BASE,
    headers: { Accept: 'application/json' },
    timeout: 12000,
});

function getImageUrl(media: PublicPageData['featured_image']): string {
    if (!media) return '';
    const raw = media.url || (media.path ? \`/storage/\${media.path.replace(/^\/+/, '')}\` : '');
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw)) return raw;
    const origin = API_BASE.replace(/\/api\/?$/, '');
    return new URL(raw, `${origin || window.location.origin}/`).toString();
}

export default function DynamicPage() {
    const { slug } = useParams<{ slug: string }>();
    const [page, setPage] = useState<PublicPageData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let active = true;

        async function loadPage() {
            if (!slug) {
                setError('Alamat halaman tidak valid.');
                setLoading(false);
                return;
            }

            setLoading(true);
            setError('');
            setPage(null);

            try {
                const response = await publicApi.get(`/public/pages/${encodeURIComponent(slug)}`);
                if (active) setPage(response.data.data);
            } catch (requestError: unknown) {
                if (!active) return;
                if (axios.isAxiosError(requestError) && requestError.response?.status === 404) {
                    setError('Halaman tidak ditemukan atau belum dipublikasikan.');
                } else {
                    setError('Halaman tidak dapat dimuat. Silakan coba lagi.');
                }
            } finally {
                if (active) setLoading(false);
            }
        }

        void loadPage();
        return () => {
            active = false;
        };
    }, [slug]);

    useEffect(() => {
        if (!page) return;

        const previousTitle = document.title;
        const descriptionTag = document.querySelector<HTMLMetaElement>('meta[name="description"]');
        const previousDescription = descriptionTag?.content;
        const createdDescriptionTag = !descriptionTag;
        const metaDescription = descriptionTag || document.createElement('meta');

        if (createdDescriptionTag) {
            metaDescription.name = 'description';
            document.head.appendChild(metaDescription);
        }

        document.title = page.meta_title?.trim() || page.title;
        metaDescription.content = page.meta_description || '';

        return () => {
            document.title = previousTitle;
            if (createdDescriptionTag) metaDescription.remove();
            else if (previousDescription !== undefined) metaDescription.content = previousDescription;
        };
    }, [page]);

    const featuredImage = getImageUrl(page?.featured_image ?? null);

    return (
        <>
            <Header />
            <main className="main" onErrorCapture={handleImageFallback}>
                {loading ? (
                    <div className="container public-loading" role="status">Memuat halaman...</div>
                ) : error ? (
                    <section className="container py-5">
                        <h1>Halaman tidak tersedia</h1>
                        <p role="alert">{error}</p>
                        <Link to="/" className="btn btn-primary">Kembali ke beranda</Link>
                    </section>
                ) : page ? (
                    <>
                        <div className="page-title">
                            <div className="breadcrumbs">
                                <nav aria-label="breadcrumb">
                                    <ol className="breadcrumb">
                                        <li className="breadcrumb-item"><Link to="/">Home</Link></li>
                                        <li className="breadcrumb-item active current" aria-current="page">{page.title}</li>
                                    </ol>
                                </nav>
                            </div>
                            <div className="title-wrapper"><h1>{page.title}</h1></div>
                        </div>
                        <section className="section">
                            <div className="container">
                                <article className="cms-public-page">
                                    {featuredImage && (
                                        <figure className="cms-public-page__featured-image mb-4">
                                            <img src={featuredImage} alt={page.featured_image?.alt_text || page.title} className="img-fluid" />
                                        </figure>
                                    )}
                                    <div className="cms-public-page__content"
                                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(page.body || '') }} />
                                </article>
                            </div>
                        </section>
                    </>
                ) : null}
            </main>
            <Footer />
            <BackToTop />
        </>
    );
}
