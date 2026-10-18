import {
    useEffect,
    useState
} from 'react';
import axios from 'axios';
import type {
    IconDefinition
} from '@fortawesome/free-solid-svg-icons';
import {
    faNoteSticky,
    faPaperPlane,
    faPencil,
    faBoxArchive,
} from '@fortawesome/free-solid-svg-icons';
import {
    FontAwesomeIcon
} from '@fortawesome/react-fontawesome';

import api from '../api/client';
import AdminLayout from '../components/AdminLayout';
import type {
    ActiveModule
} from '../components/Sidebar';

type Stats = {
    total: number;
    published: number;
    draft: number;
    archived: number;
};

const initialStats: Stats = {
    total: 0,
    published: 0,
    draft: 0,
    archived: 0,
};

type NavigationProps = {
    onNavigate: (module: ActiveModule) => void;
    onLogout: () => void;
};

type StatCardProps = {
    label: string;
    value: number;
    icon: IconDefinition;
    tone: string;
    loading: boolean;
};

type StatItem = {
    id: keyof Stats;
    label: string;
    icon: IconDefinition;
    tone: string;
};

const items: StatItem[] = [
    {
        id: 'total',
        label: 'Total Artikel',
        icon: faNoteSticky,
        tone: 'blue',
    },
    {
        id: 'published',
        label: 'Dipublikasikan',
        icon: faPaperPlane,
        tone: 'green',
    },
    {
        id: 'draft',
        label: 'Draf',
        icon: faPencil,
        tone: 'amber',
    },
    {
        id: 'archived',
        label: 'Diarsipkan',
        icon: faBoxArchive,
        tone: 'gray',
    },
];

function StatCard({ label, value, icon, tone, loading }: StatCardProps) {
    return (
        <article className="stat-card">
            <div className={`stat-icon ${tone}`} aria-hidden="true">
                <FontAwesomeIcon icon={icon} />
            </div>

            <div className="stat-label">
                {label}
            </div>

            <div className="stat-value" aria-live="polite">
                {loading ? '—': value.toLocaleString('id-ID')}
            </div>
        </article>
    );
}

export default function DashboardPage({ onNavigate, onLogout }: NavigationProps) {
    
    const [stats, setStats] = useState <Stats> (initialStats);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let active = true;

        async function loadStats() {
            try {
                const response = await api.get('/dashboard/stats');

                if (!active) return;

                const data = response.data?.data;

                if (
                    !data ||
                    !['total', 'published', 'draft', 'archived'].every(
                        (key) =>
                        typeof data[key] === 'number' &&
                        Number.isFinite(data[key]) &&
                        data[key] >= 0,
                    )
                ) {
                    throw new Error('Format statistik dari API tidak valid.');
                }

                setStats({
                    total: data.total,
                    published: data.published,
                    draft: data.draft,
                    archived: data.archived,
                });

                setError('');
            } catch (err) {
                if (!active) return;

                if (axios.isAxiosError(err)) {
                    setError(
                        err.response?.data?.message ||
                        'Statistik dashboard gagal dimuat.',
                    );
                } else if (err instanceof Error) {
                    setError(err.message);
                } else {
                    setError('Terjadi kesalahan saat memuat statistik.');
                }
            } finally {
                if (active) setLoading(false);
            }
        }

        void loadStats();

        return () => {
            active = false;
        };
    }, []);

    return (
        <AdminLayout
            active="dashboard"
            onNavigate={onNavigate}
            onLogout={onLogout}
            title="Dashboard"
            breadcrumb="Workspace / Overview"
        >
            {error && (
                <div className="alert alert-danger" role="alert">
                    {error}

                    <button
                        className="btn-close float-end"
                        type="button"
                        aria-label="Tutup"
                        onClick={() => setError('')}
                    />
                </div>
            )}

            <section
                className="stats-grid"
                aria-label="Statistik artikel"
            >
                {items.map((item) => (
                    <StatCard
                        key={item.id}
                        label={item.label}
                        value={stats[item.id]}
                        icon={item.icon}
                        tone={item.tone}
                        loading={loading}
                    />
                ))}
            </section>
        </AdminLayout>
    );
}