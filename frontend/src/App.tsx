import { Route, Routes, useLocation } from 'react-router-dom';
import AOSInitializer from './components/public/AOSInitializer';
import 'bootstrap-icons/font/bootstrap-icons.min.css';

import Home from './pages/public/Home';
import About from './pages/public/About';
import Contact from './pages/public/Contact';
import { PageNotFound as PublicPageNotFound } from './pages/public/PageNotFound';
import PageNotFound from './pages/PageNotFound';
import ArticleDetail from './pages/public/ArticleDetail';
import AllArticles from './pages/public/AllArticles';
import AdminApp from './pages/AdminApp';

function App() {
    const { pathname: path } = useLocation();

    if (path !== '/admin' && !path.startsWith('/admin/')) {
        if (path !== '/login') {
            return (
                <>
                    <Routes>
                        <Route
                            path="/contact"
                            element={<Contact />}
                        />
                        <Route
                            path="/about"
                            element={<About />}
                        />
                        <Route
                            path="/blog"
                            element={<AllArticles />}
                        />
                        <Route
                            path="/blog/:slug"
                            element={<ArticleDetail />}
                        />
                        <Route
                            path="/"
                            element={<Home />}
                        />
                        <Route
                            path="*"
                            element={<PublicPageNotFound />}
                        />
                    </Routes>

                    <AOSInitializer />
                </>
            );
        } else {
            return <PageNotFound />;
        }
    }

    return <AdminApp />;
}

export default App;
