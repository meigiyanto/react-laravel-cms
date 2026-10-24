import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTachometerAlt, faPaperPlane, faTags, faImages, faBookOpen, faUsers, faUserCircle, faGlobe } from '@fortawesome/free-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { useAuthProfile } from '../auth/AuthProfileContext';

export type ActiveModule =
| 'dashboard'
| 'posts'
| 'categories'
| 'media'
| 'pages'
| 'users'
| 'profile';

type SidebarItem = {
    id: ActiveModule;
    label: string;
    module: string;
    icon: IconDefinition;
    permission?: string;
    adminOnly?: boolean;
};

const items: SidebarItem[] = [
    {
        id: "dashboard",
        label: "Dashboard",
        module: "dashboard",
        icon: faTachometerAlt,
        permission: "posts.view",
    },
    {
        id: "posts",
        label: "Posts",
        module: "posts",
        icon: faPaperPlane,
        permission: "posts.view",
    },
    {
        id: "categories",
        label: "Categories",
        module: "categories",
        icon: faTags,
        permission: "categories.view",
    },
    {
        id: "media",
        label: "Media",
        module: "media",
        icon: faImages,
        permission: "media.view",
    },
    {
        id: "pages",
        label: "Pages",
        module: "pages",
        icon: faBookOpen,
        permission: "pages.view",
    },
    {
        id: "users",
        label: "Users & Roles",
        module: "users",
        icon: faUsers,
        adminOnly: true,
    },
    {
        id: 'profile',
        label: 'Profil Saya',
        module: 'profile',
        icon: faUserCircle,
    },
];

type SidebarProps = {
    active: ActiveModule;
    onNavigate: (module: ActiveModule) => void;
    mobileOpen: boolean;
    onClose: () => void;
};

export default function Sidebar({ active, onNavigate, mobileOpen, onClose }: SidebarProps) {
    const profile = useAuthProfile();
    const loadingProfile = profile === null;

    const permissions = profile?.permissions ?? [];
    const isAdministrator = profile?.role?.slug === 'administrator';
    
    const can = (permission: string): boolean =>
        permissions.includes('*') ||
        permissions.includes(permission) ||
        permissions.includes(`${permission}.own`);
    
    const canExact = (permission: string): boolean =>
        permissions.includes('*') ||
        permissions.includes(permission);
    
    const visibleItems = items.filter((item) => {
        if (item.adminOnly) {
            return isAdministrator;
        }
    
        if (!item.permission) {
            return item.id === 'dashboard' ? can('posts.view') : true;
        }
    
        if (item.id === 'pages') {
            return canExact(item.permission);
        }
    
        return can(item.permission);
    });

    return (
        <aside id="admin-sidebar" className={`cms-sidebar ${mobileOpen ? 'is-open' : '' }`} aria-label="Menu admin">
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
                    <p className="px-3 text-secondary">Memuat hak akses...</p>
                ) : (
                    visibleItems.map((item) => (
                        <button key={item.id} type="button" className={`nav-item ${active === item.id ? 'active' : '' }`} aria-current={active === item.id ? 'page' : undefined} onClick={() => { onNavigate(item.id); onClose(); }}>
                            <span aria-hidden="true">
                                <FontAwesomeIcon icon={item.icon} />
                            </span>
                            {item.label}
                        </button>
                    ))
                )}
            </nav>
        
            <div className="mt-3 sidebar-public-link">
                <a href="/" className="btn btn-outline-primary w-100" onClick={onClose}>
                    <FontAwesomeIcon icon={faGlobe} className="me-2" />
                    Lihat Website
                </a>
            </div>
        
            <div className="sidebar-bottom">
                <div className="sidebar-label">STATUS SISTEM</div>

                <div className="system-status">
                    <span className="status-dot" />API terhubung
                </div>
        
                <small>React · Laravel · MariaDB</small>
            </div>
        </aside>
    );
}