import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faComments, faChevronLeft, faTachometerAlt, faPaperPlane, faTags, faImages, faBookOpen, faUsers, faUserCircle, faGlobe } from '@fortawesome/free-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { useAuthProfile } from '../auth/AuthProfileContext';

export type ActiveModule =
| 'dashboard'
| 'posts'
| 'comments'
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
        id: "comments",
        label: "Comments",
        module: "comments",
        icon: faComments,
        permission: "comments.view",
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
};

export default function Sidebar({ active, onNavigate }: SidebarProps) {
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
    
    function toggleSidebar() {
        const sidebar = document.querySelector('.cms-sidebar');
        sidebar?.classList.toggle('collapsed');
    }

    return (
        <aside id="admin-sidebar" aria-label="Menu admin" className="cms-sidebar d-flex flex-column flex-shrink-0 position-fixed">
            <nav aria-label="Navigasi utama">
                <button type="button" className="toggle-btn" onClick={toggleSidebar} aria-label="Ciutkan atau perluas sidebar">
                    <FontAwesomeIcon icon={faChevronLeft} />
                </button>
                
                <div className="cms-brand">
                    <span className="brand-mark">C</span>
                    <div className="hide-on-collapse">
                        <strong>ContentHub</strong>
                        <small>CMS Dashboard</small>
                    </div>
                </div>
            
                <div className="sidebar-label hide-on-collapse">WORKSPACE</div>
                
                {loadingProfile ? (
                    <p className="px-3 text-secondary">Memuat hak akses...</p>
                ) : (
                    visibleItems.map((item) => (
                        <button 
                            key={item.id} 
                            type="button" 
                            className={`cms-sidebar-link nav-item ${active === item.id ? 'active' : '' }`} 
                            aria-current={active === item.id ? 'page' : undefined} 
                            onClick={() => { onNavigate(item.id); }}
                        >
                            <span aria-hidden="true">
                                <FontAwesomeIcon icon={item.icon} />
                            </span>
                            <span className="hide-on-collapse">{item.label}</span>
                        </button>
                    ))
                )}
                
                <div className="mt-3 sidebar-public-link">
                    <Link to="/" className="cms-sidebar-link nav-item">
                        <span aria-hidden="true">
                            <FontAwesomeIcon icon={faGlobe} className="me-2" />
                        </span>
                        <span className="hide-on-collapse">Lihat website</span>
                    </Link>
                </div>
            
                <div className="hide-on-collapse sidebar-bottom">
                    <div className="sidebar-label">STATUS SISTEM</div>
    
                    <div className="system-status">
                        <span className="status-dot"/>API terhubung
                    </div>
            
                    <small>React · Laravel · MariaDB</small>
                </div>
            </nav>
        </aside>
    );
}