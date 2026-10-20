import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import api, { AUTH_EXPIRED_EVENT, TOKEN_KEY } from './api/client';
import { AuthProfileContext, type AuthProfile } from './auth/AuthProfileContext';
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
    const [profile, setProfile] = useState<AuthProfile | null>(null);
    
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
                setProfile(null);
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
                const response = await api.get('/auth/me');
                if (active) {
                    setProfile(response.data?.data ?? null);
                    setAuthenticated(true);
                }
            } catch {
                setProfile(null);
                setAuthenticated(false);
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

    async function handleLogin(token: string) {
        localStorage.setItem(TOKEN_KEY, token);
    
        try {
            const response = await api.get('/auth/me');
            setProfile(response.data?.data ?? null);
            setActiveModule('dashboard');
            setAuthenticated(true);
        } catch {
            localStorage.removeItem(TOKEN_KEY);
            setProfile(null);
            setAuthenticated(false);
        }
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

    async function loadProfile(): Promise<AuthProfile> {
            const response = await api.get('/auth/me');
            const data = response.data?.data;
        
            if (
                !data ||
                !Array.isArray(data.permissions) ||
                !data.role?.slug
            ) {
                throw new Error('Profil atau hak akses tidak valid.');
            }
        
            return {
                id: data.id,
                name: data.name,
                email: data.email,
                role: data.role,
                permissions: data.permissions,
            };
        }

    const navigation = {
        onNavigate: (module: ActiveModule) => setActiveModule(module),
        onBack: () => setActiveModule('dashboard'),
        onLogout: () => void handleLogout(),
    };
    
    const permissions = profile?.permissions ?? [];

    const can = (permission: string) =>
        permissions.includes('*') ||
        permissions.includes(permission) ||
        permissions.includes(`${permission}.own`);
    
    const isAdministrator = profile?.role?.slug === 'administrator';
    
    const modulePermission: Record<ActiveModule, string | null> = {
        dashboard: 'posts.view',
        posts: 'posts.view',
        categories: 'categories.view',
        media: 'media.view',
        pages: 'pages.view',
        users: null,
    };
    
    const hasPageAccess = activeModule === 'users' ? isAdministrator : modulePermission[activeModule] !== null && can(modulePermission[activeModule]!);
    
    let page: React.ReactNode;
    
    switch (activeModule) {
        case 'posts':
            page = (
                <Suspense fallback={<PageLoading />}>
                    <PostsPage
                        onNavigate={navigation.onNavigate}
                        onLogout={navigation.onLogout}
                    />
                </Suspense>
            );
            break;
    
        case 'categories':
            page = (
                <Suspense fallback={<PageLoading />}>
                    <CategoriesPage
                        onNavigate={navigation.onNavigate}
                        onLogout={navigation.onLogout}
                    />
                </Suspense>
            );
            break;
    
        case 'media':
            page = (
                <Suspense fallback={<PageLoading />}>
                    <MediaPage
                        onNavigate={navigation.onNavigate}
                        onLogout={navigation.onLogout}
                    />
                </Suspense>
            );
            break;
    
        case 'pages':
            page = (
                <Suspense fallback={<PageLoading />}>
                    <PagesPage
                        onNavigate={navigation.onNavigate}
                        onLogout={navigation.onLogout}
                    />
                </Suspense>
            );
            break;
    
        case 'users':
            page = (
                <Suspense fallback={<PageLoading />}>
                    <UserManagementPage
                        onNavigate={navigation.onNavigate}
                        onLogout={navigation.onLogout}
                    />
                </Suspense>
            );
            break;
    
        case 'dashboard':
        default:
            page = (
                <Suspense fallback={<PageLoading />}>
                    <DashboardPage
                        onNavigate={navigation.onNavigate}
                        onLogout={navigation.onLogout}
                    />
                </Suspense>
            );
            break;
    }
    
    if (!profile || !hasPageAccess) {
        return (
            <AuthProfileContext.Provider value={profile}>
                <main className="container py-5">
                    <div className="alert alert-danger" role="alert">
                        Anda tidak memiliki izin untuk membuka halaman ini.
                    </div>
    
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => setActiveModule('dashboard')}
                    >
                        Kembali ke Dashboard
                    </button>
                </main>
            </AuthProfileContext.Provider>
        );
    }
    
    return (
        <AuthProfileContext.Provider value={profile}>
            {page}
        </AuthProfileContext.Provider>
    );

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
