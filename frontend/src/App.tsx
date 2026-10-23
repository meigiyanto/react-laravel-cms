import { Route, Routes, useLocation } from 'react-router-dom';
import PublicSite from './pages/PublicSite';
import PublicArticleDetail from './pages/PublicArticleDetail';
import AdminApp from './pages/AdminApp';
import AllArticles from './pages/AllArticles';
import AOSInitializer from './components/public/AOSInitializer';
import 'bootstrap-icons/font/bootstrap-icons.min.css';

function App() {
    const { pathname: path } = useLocation();

    if (path !== '/admin' && !path.startsWith('/admin/')) {
        if (path !== '/login') {
            return (
                <>
                    <Routes>
                        <Route
                            path="/artikel"
                            element={<AllArticles />}
                        />
                        <Route
                            path="/artikel/:slug"
                            element={<PublicArticleDetail />}
                        />
                        <Route
                            path="*"
                            element={<PublicSite />}
                        />
                    </Routes>

                    <AOSInitializer />
                </>
            );
        }
    }

    return <AdminApp />;
}

export default App;
