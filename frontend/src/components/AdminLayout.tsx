import { type ReactNode } from 'react';
import Sidebar, { type ActiveModule } from './Sidebar';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSignOut } from '@fortawesome/free-solid-svg-icons';

type AdminLayoutProps = { 
    active: ActiveModule; 
    onNavigate: (module: ActiveModule) => void;
    onLogout?: () => void;
    title: string; 
    breadcrumb: string; 
    actions?: ReactNode; 
    children: ReactNode;
};

export default function AdminLayout({ active, onNavigate, title, onLogout, breadcrumb, children, actions }: AdminLayoutProps) {

    return (
        <div className="cms-shell">
            <Sidebar active={active} onNavigate={onNavigate} />
            
            <main className="cms-main">
                <header className="topbar">
                    <div className="topbar-heading">
                        <div>
                            <div className="breadcrumb-text">{breadcrumb}</div>
                            <h1>{title}</h1>
                        </div>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                        <button className="btn btn-outline-secondary" type="button" onClick={onLogout}>
                            <FontAwesomeIcon icon={faSignOut} /> Keluar
                            </button>
                        {actions}
                    </div>
                    
                </header>
                
                {children}
                
                <footer className="cms-footer">ContentHub CMS · Backend Laravel API</footer>
            </main>
        </div>
    );
}
