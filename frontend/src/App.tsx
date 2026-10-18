import {
    lazy,
    Suspense,
    useCallback,
    useEffect,
    useState,
} from 'react';
import api, {
    AUTH_EXPIRED_EVENT,
    TOKEN_KEY
} from './api/client';
const CategoriesPage = lazy(() => import('./pages/CategoriesPage'));
const MediaPage = lazy(() => import('./pages/MediaPage'));
const PagesPage = lazy(() => import('./pages/PagesPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const PostsPage = lazy(() => import('./pages/PostsPage'));
const UserManagementPage = lazy(() => import('./pages/UserManagementPage'));

import LoginPage from './pages/LoginPage';
import type { ActiveModule } from './components/Sidebar';

import 'bootstrap-icons/font/bootstrap-icons.min.css';

function App() {
    const [authenticated, setAuthenticated] = useState(false);
    const [checkingAuth, setCheckingAuth] = useState(true);
    const [activeModule, setActiveModule] = useState<ActiveModule>('dashboard');

    const handleLogout = useCallback(async () => {
        try {
            await api.post('/auth/logout');
        } catch {
            // Tetap keluarkan pengguna jika token sudah tidak valid
            // atau server tidak dapat dijangkau.
        } finally {
            localStorage.removeItem(TOKEN_KEY);
            setAuthenticated(false);
            setActiveModule('dashboard');
        }
    }, []);

    useEffect(() => {
        let active = true;
        const expireSession = () => {
            localStorage.removeItem(TOKEN_KEY);
            if (active) {
                setAuthenticated(false);
                setCheckingAuth(false);
            }
        };
        window.addEventListener(AUTH_EXPIRED_EVENT, expireSession);

        async function verifySession() {
            const token = localStorage.getItem(TOKEN_KEY);
            if (!token) {
                if (active) setCheckingAuth(false);
                return;
            }
            try {
                await api.get('/auth/me');
                if (active) setAuthenticated(true);
            } catch {
                localStorage.removeItem(TOKEN_KEY);
                if (active) setAuthenticated(false);
            } finally {
                if (active) setCheckingAuth(false);
            }
        }
        void verifySession();
        return () => {
            active = false;
            window.removeEventListener(AUTH_EXPIRED_EVENT, expireSession);
        };
    }, []);

    function handleLogin(token: string) {
        localStorage.setItem(TOKEN_KEY, token);
        setActiveModule('dashboard');
        setAuthenticated(true);
    }

    if (checkingAuth) {
        return (
            <main className="login-page">
                <div className="text-center">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Memeriksa autentikasi...</span>
                    </div>
                    <p className="mt-3 text-secondary">Memeriksa sesi login...</p>
                </div>
            </main>
        );
    }

    if (!authenticated) return <LoginPage onLogin={handleLogin} />;

    const navigation = {
        onNavigate: (module: ActiveModule) => setActiveModule(module),
        onBack: () => setActiveModule('dashboard'),
        onLogout: () => void handleLogout(),
    };

    switch (activeModule) {
        case 'posts':
            return <Suspense fallback={<PageLoading />}><PostsPage onNavigate={navigation.onNavigate} onLogout={navigation.onLogout} /></Suspense>;
        case 'categories':
            return <Suspense fallback={<PageLoading />}><CategoriesPage onNavigate={navigation.onNavigate} onLogout={navigation.onLogout} /></Suspense>;
        case 'media':
            return <Suspense fallback={<PageLoading />}><MediaPage onNavigate={navigation.onNavigate} onLogout={navigation.onLogout} /></Suspense>;
        case 'pages':
            return <Suspense fallback={<PageLoading />}><PagesPage onNavigate={navigation.onNavigate} onLogout={navigation.onLogout} /></Suspense>;
        case 'users':
            return <Suspense fallback={<PageLoading />}><UserManagementPage onNavigate={navigation.onNavigate} onLogout={navigation.onLogout} /></Suspense>;
        case 'dashboard':
        default:
            return <Suspense fallback={<PageLoading />}><DashboardPage onNavigate={navigation.onNavigate} onLogout={navigation.onLogout} /></Suspense>;
    }
}

function PageLoading() {
    return (
        <div className="container py-5 text-center" role="status">
            <div className="spinner-border text-primary" />
            <p className="mt-3">Memuat halaman...</p>
        </div>
    );
}

export default App;
