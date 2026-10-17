import type { ReactNode } from 'react';
import Sidebar, { type ActiveModule } from './Sidebar';

type AdminLayoutProps = { active: ActiveModule; onNavigate: (module: ActiveModule) => void; onLogout: () => void; title: string; breadcrumb: string; actions?: ReactNode; children: ReactNode;
};

export default function AdminLayout({ active, onNavigate, onLogout, title, breadcrumb, actions, children }: AdminLayoutProps) {
    return (
        <div className="cms-shell">
            <Sidebar active={active} onNavigate={onNavigate} />
        
            <main className="cms-main">
                <header className="topbar">
                    <div>
                        <div className="breadcrumb-text">{breadcrumb}</div>
                        <h1>{title}</h1>
                    </div>
                
                    <div className="d-flex align-items-center gap-2">
                        <button className="btn btn-outline-secondary" type="button" onClick={onLogout}>Keluar</button>
                        {actions}
                    </div>
                </header>
                
                {children}
                
                <footer className="cms-footer">ContentHub CMS · Backend Laravel API</footer>
            </main>
        </div>
    );
}
