import {
    useCallback,
    useEffect,
    useState
} from 'react';
import api, {
    AUTH_EXPIRED_EVENT,
    TOKEN_KEY
} from './api/client';
import LoginPage from './pages/LoginPage';
import CategoriesPage from './pages/CategoriesPage';
import MediaPage from './pages/MediaPage';
import PagesPage from './pages/PagesPage';
import DashboardPage from './pages/DashboardPage';
import PostsPage from './pages/PostsPage';
import type {
    ActiveModule
} from './components/Sidebar';

type ActiveModule = | 'dashboard'| 'posts'| 'categories'| 'media'| 'pages';

function App() {
    const [authenticated,
        setAuthenticated] = useState(false);
    const [checkingAuth,
        setCheckingAuth] = useState(true);
    const [activeModule,
        setActiveModule] = useState < ActiveModule > ('dashboard');

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

                if (active) {
                    setAuthenticated(true);
                }
            } catch {
                localStorage.removeItem(TOKEN_KEY);

                if (active) {
                    setAuthenticated(false);
                }
            } finally {
                if (active) setCheckingAuth(false);
            }
        }

        void verifySession();

        return () => {
            active = false;
            window.removeEventListener(AUTH_EXPIRED_EVENT, expireSession);
        };
    },
        []);

    function handleLogin(token: string) {
        localStorage.setItem(TOKEN_KEY,
            token);
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
                    <p className="mt-3 text-secondary">
                        Memeriksa sesi login...
                    </p>
                </div>
            </main>
        );
    }

    if (!authenticated) {
        return <LoginPage onLogin={handleLogin} />;
    }


    const navigation = {
        onNavigate: (module: ActiveModule) => setActiveModule(module),
        onBack: () => setActiveModule('dashboard'),
        onOpenPosts: () => setActiveModule('posts'),
        onOpenCategories: () => setActiveModule('categories'),
        onOpenMedia: () => setActiveModule('media'),
        onOpenPages: () => setActiveModule('pages'),
        onLogout: () => void handleLogout(),
    };

    switch (activeModule) {
        case 'posts':
            return (
                <PostsPage
                    onNavigate={navigation.onNavigate}
                    onLogout={navigation.onLogout}
                />
            );

        case 'categories':
            return (
                <CategoriesPage
                    onBack={navigation.onBack}
                    onOpenPosts={navigation.onOpenPosts}
                    onOpenMedia={navigation.onOpenMedia}
                    onOpenPages={navigation.onOpenPages}
                    onLogout={navigation.onLogout}
                />
            );

        case 'media':
            return (
                <MediaPage
                    onBack={navigation.onBack}
                    onOpenPosts={navigation.onOpenPosts}
                    onOpenCategories={navigation.onOpenCategories}
                    onOpenPages={navigation.onOpenPages}
                    onLogout={navigation.onLogout}
                />
            );

        case 'pages':
            return (
                <PagesPage
                    onBack={navigation.onBack}
                    onOpenCategories={navigation.onOpenCategories}
                    onOpenMedia={navigation.onOpenMedia}
                    onLogout={navigation.onLogout}
                />
            );

        case 'dashboard':
        default:
            return (
                <DashboardPage
                    onNavigate={navigation.onNavigate}
                    onLogout={navigation.onLogout}
                />
            );
    }

}

export default App;