export type ActiveModule = | 'dashboard'| 'posts'| 'categories'| 'media'| 'pages';

type SidebarProps = {
    active: ActiveModule;
    onNavigate: (module: ActiveModule) => void;
};

const items: { id: ActiveModule; icon: string; label: string; }[] = [
  { id: 'dashboard', icon: '▦', label: 'Dashboard' },
  { id: 'posts', icon: '▤', label: 'Artikel' },
  { id: 'categories', icon: '▧', label: 'Kategori' },
  { id: 'media', icon: '▣', label: 'Media' },
  { id: 'pages', icon: '▱', label: 'Halaman' },
];

export default function Sidebar({ active, onNavigate }: SidebarProps) {
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
                {items.map((item) => (
                    <button key={item.id} type="button" className={`nav-item ${ active === item.id ? 'active' : '' }`} aria-current={active === item.id ? 'page' : undefined} onClick={() => onNavigate(item.id)}>
                        <span aria-hidden="true">{item.icon}</span>
                        {item.label}
                    </button>
                ))}
            </nav>
            <div className="sidebar-bottom">
                <div className="sidebar-label">STATUS SISTEM</div>
                <div className="system-status">
                <span className="status-dot" />API terhubung</div>
                <small>React · Laravel · MariaDB</small>
            </div>
        </aside>
    );
}
