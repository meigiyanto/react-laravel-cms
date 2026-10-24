import { Route, Routes, useLocation } from 'react-router-dom';
import AOSInitializer from './components/public/AOSInitializer';
import 'bootstrap-icons/font/bootstrap-icons.min.css';

import Home from './pages/public/Home';
import About from './pages/public/About';
// import AboutAuthor from './pages/public/AboutAuthor';
import Contact from './pages/public/Contact';
import { PageNotFound as PublicPageNotFound } from './pages/public/PageNotFound';
import PageNotFound from './pages/PageNotFound';
import ArticleDetail from './pages/public/ArticleDetail';
import AllArticles from './pages/public/AllArticles';
import AdminApp from './pages/AdminApp';

function App() {
    const { pathname } = useLocation();
    const path = pathname.replace(/\/+$/, '') || '/';

    if (path === '/admin' || path === '/login') {
        return <AdminApp />;
    }

    if (path.startsWith('/admin/')) {
        return <PageNotFound />;
    }

    return (
        <>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/about" element={<About />} />
                {/* <Route path="/about-author" element={<AboutAuthor />} /> */}
                <Route path="/contact" element={<Contact />} />
                <Route path="/blog" element={<AllArticles />} />
                <Route path="/blog/:slug" element={<ArticleDetail />} />
                <Route path="*" element={<PublicPageNotFound />} />
            </Routes>

            <AOSInitializer />
        </>
    );
}

export default App;
