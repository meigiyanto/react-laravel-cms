import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faTachometerAlt,
    faPaperPlane,
    faTags,
    faImages,
    faBookOpen,
    faUsers,
} from '@fortawesome/free-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/free-solid-svg-icons';
import api from '../api/client';

export type ActiveModule =
    | 'dashboard'
    | 'posts'
    | 'categories'
    | 'media'
    | 'pages'
    | 'users';

type SidebarProps = {
    active: ActiveModule;
    onNavigate: (module: ActiveModule) => void;
};

type SidebarItem = {
    id: ActiveModule;
    icon: IconDefinition;
    label: string;
    permission?: string;
    adminOnly?: boolean;
};

type AuthProfile = {
    role: {
        slug: string;
    } | null;
    permissions: string[];
};

const items: SidebarItem[] = [
    { id: 'dashboard', icon: faTachometerAlt, label: 'Dashboard' },
    {
        id: 'posts',
        icon: faPaperPlane,
        label: 'Artikel',
        permission: 'posts.view',
    },
    {
        id: 'categories',
        icon: faTags,
        label: 'Kategori',
        permission: 'categories.view',
    },
    {
        id: 'media',
        icon: faImages,
        label: 'Media',
        permission: 'media.view',
    },
    {
        id: 'pages',
        icon: faBookOpen,
        label: 'Halaman',
        permission: 'pages.view',
    },
    {
        id: 'users',
        icon: faUsers,
        label: 'Pengguna & Role',
        adminOnly: true,
    },
];

export default function Sidebar({ active, onNavigate }: SidebarProps) {
    const [profile, setProfile] = useState<AuthProfile | null>(null);
    const [loadingProfile, setLoadingProfile] = useState(true);

    useEffect(() => {
        let mounted = true;

        async function loadProfile() {
            try {
                const response = await api.get('/auth/me');
                const data = response.data?.data;

                if (!mounted) return;

                setProfile({
                    role: data?.role ?? null,
                    permissions: Array.isArray(data?.permissions)
                        ? data.permissions
                        : [],
                });
            } catch {
                if (mounted) setProfile(null);
            } finally {
                if (mounted) setLoadingProfile(false);
            }
        }

        void loadProfile();

        return () => {
            mounted = false;
        };
    }, []);

    const permissions = profile?.permissions ?? [];
    const isAdministrator = profile?.role?.slug === 'administrator';

    const can = (permission: string): boolean =>
        permissions.includes('*') ||
        permissions.includes(permission) ||
        permissions.includes(`${permission}.own`);

    const visibleItems = items.filter((item) => {
        if (item.adminOnly) return isAdministrator;
        if (!item.permission) return true;
        return can(item.permission);
    });

    return (
        <aside className="cms-sidebar">
            <div className="cms-brand">
                <span className="brand-mark">C</span>
                <div>
                    <strong>ContentHub</strong>
                    <small>CMS Dashboard</small>
                </div>
            </div>

            <div className="sidebar-label">WORKSPACE</div>
            <nav aria-label="Navigasi utama">
                {loadingProfile ? (
                    <p className="px-3 text-secondary">
                        Memuat hak akses...
                    </p>
                ) : (
                    visibleItems.map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            className={`nav-item ${active === item.id ? 'active' : ''}`}
                            aria-current={
                                active === item.id ? 'page' : undefined
                            }
                            onClick={() => onNavigate(item.id)}
                        >
                            <span aria-hidden="true">
                                <FontAwesomeIcon icon={item.icon} />
                            </span>
                            {item.label}
                        </button>
                    ))
                )}
            </nav>

            <div className="sidebar-bottom">
                <div className="sidebar-label">STATUS SISTEM</div>
                <div className="system-status">
                    <span className="status-dot" />
                    API terhubung
                </div>
                <small>React · Laravel · MariaDB</small>
            </div>
        </aside>
    );
}
