import AdminLayout from '../components/AdminLayout';

type NavigationProps = {
    onNavigate: (module: ActiveModule) => void;
    onLogout: () => void;
};

export default function PageNotFound({ onNavigate, onLogout } : NavigationProps) {
    return (
        <AdminLayout
            active="pages"
            onNavigate={onNavigate}
            onLogout={onLogout}
            title="Halaman Tidak Ditemukan"
            breadcrumb="Workspace / Halaman / Halaman Tidak Ditemukan"
        >
            <section className="welcome-panel">
                <div>
                    <span className="eyebrow">PAGE NOT FOUND</span>
                    <h2>404</h2>
                    <p>Halaman yang anda tuju tidak ditemukan.</p>
                </div>
            </section>
            
            <section className="content-panel mt-4">
                <div className="panel-heading">
                    <div>
                        <h3>Halaman Tidak Ditemukan</h3>
                    </div>
                </div>
            </section>
        </AdminLayout>
    )
}