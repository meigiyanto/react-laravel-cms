import { useCallback, useEffect, useState } from 'react';
import api from '../api/client';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRefresh } from '@fortawesome/free-solid-svg-icons';

type Revision = {
    id: number;
    revision_number: number;
    snapshot: Record<string, unknown>;
    change_summary: string | null;
    created_at: string;
    user?: { id: number; name: string } | null;
};

type Props = {
    resource: 'posts' | 'pages';
    contentId: number | null;
    onRestored: () => void | Promise<void>;
};

export default function RevisionHistory({ resource, contentId, onRestored }: Props) {
    const [revisions, setRevisions] = useState<Revision[]>([]);
    const [loading, setLoading] = useState(false);
    const [restoringId, setRestoringId] = useState<number | null>(null);
    const [error, setError] = useState('');

    const loadRevisions = useCallback(async () => {
        if (!contentId) return;
        setLoading(true);
        setError('');
        try {
            const response = await api.get(`/${resource}/${contentId}/revisions`);
            setRevisions(response.data.data ?? []);
        } catch {
            setError('Riwayat versi gagal dimuat.');
        } finally {
            setLoading(false);
        }
    }, [contentId, resource]);

    useEffect(() => {
        if (!contentId) return;
        let active = true;
        api.get(`/${resource}/${contentId}/revisions`)
            .then((response) => {
                if (active) setRevisions(response.data.data ?? []);
            })
            .catch(() => {
                if (active) setError('Riwayat versi gagal dimuat.');
            });
        return () => { active = false; };
    }, [contentId, resource]);

    async function restore(revision: Revision) {
        const title = String(revision.snapshot.title ?? `versi ${revision.revision_number}`);
        if (!window.confirm(`Pulihkan "${title}" dari revisi #${revision.revision_number}? Konten saat ini akan tetap tersimpan sebagai revisi baru.`)) return;
        setRestoringId(revision.id);
        setError('');
        try {
            await api.post(`/${resource}/${contentId}/revisions/${revision.id}/restore`);
            await loadRevisions();
            await onRestored();
        } catch {
            setError('Versi gagal dipulihkan. Periksa hak akses dan coba lagi.');
        } finally {
            setRestoringId(null);
        }
    }

    if (!contentId) return null;

    return (
        <section className="border rounded p-3 my-4" aria-labelledby={`revision-history-${resource}`}>
            <div className="d-flex justify-content-between align-items-center mb-2">
                <div className="text-wrap me-1">
                    <h3 className="h6 mb-1" id={`revision-history-${resource}`}>Riwayat Versi</h3>
                    <p className="small text-muted mb-0">Versi tersimpan otomatis setiap konten dibuat atau diperbarui.</p>
                </div>
                <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => void loadRevisions()} disabled={loading}>
                    <FontAwesomeIcon icon={faRefresh} />
                </button>
            </div>
            {error && <div className="alert alert-danger py-2" role="alert">{error}</div>}
            {loading ? <p className="small text-muted mb-0">Memuat riwayat...</p> : revisions.length === 0 ? (
                <p className="small text-muted mb-0">Belum ada riwayat versi.</p>
            ) : (
                <ol className="list-group list-group-numbered">
                    {revisions.map((revision) => (
                        <li key={revision.id} className="list-group-item d-flex flex-wrap justify-content-between align-items-center gap-2">
                            <div className="me-auto">
                                <strong>Revisi #{revision.revision_number}</strong>
                                <div className="small text-muted">{String(revision.snapshot.title ?? 'Tanpa judul')} · {revision.user?.name ?? 'Pengguna sistem'} · {new Date(revision.created_at).toLocaleString('id-ID')}</div>
                                <div className="small text-muted">Status: {String(revision.snapshot.status ?? '-')}</div>
                            </div>
                            <button type="button" className="btn btn-sm btn-outline-primary" disabled={restoringId !== null} onClick={() => void restore(revision)}>
                                {restoringId === revision.id ? 'Memulihkan...' : 'Pulihkan'}
                            </button>
                        </li>
                    ))}
                </ol>
            )}
        </section>
    );
}
