import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTachometerAlt, faPaperPlane, faTags, faImages, faBookOpen, faUsers } from '@fortawesome/free-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { useAuthProfile } from '../auth/AuthProfileContext';

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
    const profile = useAuthProfile();
    const loadingProfile = profile === null;
    
    const can = (permission: string): boolean => permissions.includes('*') || permissions.includes(permission) || permissions.includes(`${permission}.own`);
    const permissions = profile?.permissions ?? [];
    const isAdministrator = profile?.role?.slug === 'administrator';
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
