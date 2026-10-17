import { useEffect, useState } from 'react';
import axios from 'axios';
import api from '../api/client';
import AdminLayout from '../components/AdminLayout';
import { type ActiveModule } from '../components/Sidebar';

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

export default function DashboardPage({ onNavigate, onLogout }: NavigationProps) {
  const [stats, setStats] = useState(initialStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadStats() {
      try {
        const response = await api.get('/dashboard/stats');

        if (active) {
          setStats(response.data.data);
          setError('');
        }
      } catch (err) {
        if (!active) return;

        if (axios.isAxiosError(err)) {
          setError(
            err.response?.data?.message ||
              'Statistik dashboard gagal dimuat.',
          );
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

      <section className="stats-grid" aria-label="Statistik artikel">
        <StatCard
          label="Total Artikel"
          value={stats.total}
          icon="▤"
          tone="blue"
          loading={loading}
        />
        <StatCard
          label="Dipublikasikan"
          value={stats.published}
          icon="↗"
          tone="green"
          loading={loading}
        />
        <StatCard
          label="Draf"
          value={stats.draft}
          icon="✎"
          tone="amber"
          loading={loading}
        />
        <StatCard
          label="Diarsipkan"
          value={stats.archived}
          icon="▣"
          tone="gray"
          loading={loading}
        />
      </section>
    </AdminLayout>
  );
}

function StatCard({
  label,
  value,
  icon,
  tone,
  loading,
}: {
  label: string;
  value: number;
  icon: string;
  tone: string;
  loading: boolean;
}) {
  return (
    <article className="stat-card">
      <div className={`stat-icon ${tone}`} aria-hidden="true">
        {icon}
      </div>
      <div className="stat-label">{label}</div>
      <div className="stat-value" aria-live="polite">
        {loading ? '—' : value.toLocaleString('id-ID')}
      </div>
    </article>
  );
}
