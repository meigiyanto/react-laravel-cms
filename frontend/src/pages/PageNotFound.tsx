import type { ActiveModule } from '../components/Sidebar';
import AdminLayout from '../components/AdminLayout';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';

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
                <div className="text-center">
                    <h3>Halaman Tidak Ditemukan</h3>
                    <div className="mt-3 mb-3">
                        <button
                            className="btn btn-outline-secondary"
                            type="button"
                            onClick={() => window.location.href = '/admin'}
                        >
                            <FontAwesomeIcon icon={faArrowLeft} />
                            Kembali ke Dashboard
                        </button>
                    </div>
                </div>
            </section>
        </AdminLayout>
    )
}