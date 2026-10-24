import { useState, type ReactNode } from 'react';
import Sidebar, { type ActiveModule } from './Sidebar';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSignOut, faBars } from '@fortawesome/free-solid-svg-icons';

type AdminLayoutProps = { 
    active: ActiveModule; 
    onNavigate: (module: ActiveModule) => void; 
    onLogout: () => void; 
    title: string; 
    breadcrumb: string; 
    actions?: ReactNode; 
    children: ReactNode;
};

export default function AdminLayout({ active, onNavigate, onLogout, title, breadcrumb, actions, children }: AdminLayoutProps) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <div className="cms-shell">
            {mobileMenuOpen && (
                <button type="button" className="sidebar-backdrop" aria-label="Tutup menu navigasi" onClick={() => setMobileMenuOpen(false)} />
            )}
            
            <Sidebar active={active} onNavigate={onNavigate} mobileOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
        
            <main className="cms-main">
                <header className="topbar">
                    <div className="topbar-heading">
                        <button type="button" className="mobile-menu-toggle" aria-label={ mobileMenuOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'} aria-controls="admin-sidebar" aria-expanded={mobileMenuOpen} onClick={() => setMobileMenuOpen((open) => !open)}>
                            <FontAwesomeIcon icon={faBars} />
                        </button>
                    
                        <div>
                            <div className="breadcrumb-text">{breadcrumb}</div>
                            <h1>{title}</h1>
                        </div>
                    </div>
                </header>
                
                {children}
                
                <footer className="cms-footer">ContentHub CMS · Backend Laravel API</footer>
            </main>
        </div>
    );
}
