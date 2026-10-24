import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import api from '../api/client';
import AdminLayout from '../components/AdminLayout';
import type { ActiveModule } from '../components/Sidebar';
import Pagination from '../components/Pagination';

type CommentStatus = 'pending' | 'approved' | 'rejected';

type CommentItem = {
    id: number;
    post_id: number;
    user_id: number | null;
    author_name: string;
    author_email: string | null;
    body: string;
    status: CommentStatus;
    created_at: string;
    post?: {
        id: number;
        title: string;
        slug: string;
    } | null;
    user?: {
        id: number;
        name: string;
        email: string;
    } | null;
};

type PaginatedComments = {
    data: CommentItem[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
};

type NavigationProps = {
    onNavigate: (module: ActiveModule) => void;
    onLogout: () => void;
};

function errorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
        const errors = error.response?.data?.errors;

        if (errors && typeof errors === 'object') {
            return Object.values(errors).flat().join(' ');
        }

        if (error.response?.status === 403) {
            return 'Akses ditolak. Periksa permission role akun Anda.';
        }

        return error.response?.data?.message
            || 'Gagal menghubungi API.';
    }

    return 'Terjadi kesalahan yang tidak diketahui.';
}

function formatDate(value: string): string {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return '—';
    }

    return date.toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

const statusLabels: Record<CommentStatus, string> = {
    pending: 'Menunggu',
    approved: 'Disetujui',
    rejected: 'Ditolak',
};

export default function CommentsPage({
    onNavigate,
    onLogout,
}: NavigationProps) {
    const [comments, setComments] = useState<CommentItem[]>([]);
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [total, setTotal] = useState(0);

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [loading, setLoading] = useState(true);
    const [workingId, setWorkingId] = useState<number | null>(null);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    const loadComments = useCallback(async () => {
        setLoading(true);
        setError('');

        try {
            const response = await api.get<{
                success: boolean;
                data: PaginatedComments;
            }>('/comments', {
                params: {
                    page,
                    search: search.trim() || undefined,
                    status: statusFilter || undefined,
                },
            });

            const paginator = response.data.data;

            setComments(paginator.data);
            setLastPage(paginator.last_page);
            setTotal(paginator.total);
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setLoading(false);
        }
    }, [page, search, statusFilter]);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            void loadComments();
        }, 250);

        return () => window.clearTimeout(timer);
    }, [loadComments]);

    async function updateStatus(
        comment: CommentItem,
        status: CommentStatus,
    ) {
        setWorkingId(comment.id);
        setError('');
        setNotice('');

        try {
            await api.patch(`/comments/${comment.id}/status`, { status });

            setNotice(
                `Status komentar dari ${comment.author_name} berhasil diubah.`,
            );

            await loadComments();
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setWorkingId(null);
        }
    }

    async function deleteComment(comment: CommentItem) {
        const confirmed = window.confirm(
            `Hapus komentar dari ${comment.author_name}? Tindakan ini tidak dapat dibatalkan.`,
        );

        if (!confirmed) {
            return;
        }

        setWorkingId(comment.id);
        setError('');
        setNotice('');

        try {
            await api.delete(`/comments/${comment.id}`);

            setNotice('Komentar berhasil dihapus.');

            // Jika item terakhir di halaman terhapus, mundur satu halaman.
            if (comments.length === 1 && page > 1) {
                setPage((current) => current - 1);
            } else {
                await loadComments();
            }
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setWorkingId(null);
        }
    }

    return (
        <AdminLayout
            active="comments"
            onNavigate={onNavigate}
            onLogout={onLogout}
            title="Pengelola Komentar"
            breadcrumb="Workspace / Konten / Komentar"
        >
            <section className="welcome-panel">
                <div>
                    <span className="eyebrow">COMMENT MANAGEMENT</span>
                    <h2>Moderasi percakapan.</h2>
                    <p>
                        Tinjau komentar, setujui komentar yang layak,
                        tolak spam, atau hapus komentar yang tidak sesuai.
                    </p>
                </div>

                <div className="welcome-icon" aria-hidden="true">
                    <i className="bi bi-chat-square-text" />
                </div>
            </section>

            {error && (
                <div className="alert alert-danger mt-3" role="alert">
                    {error}
                    <button
                        className="btn-close float-end"
                        type="button"
                        aria-label="Tutup"
                        onClick={() => setError('')}
                    />
                </div>
            )}

            {notice && (
                <div className="alert alert-success mt-3" role="status">
                    {notice}
                    <button
                        className="btn-close float-end"
                        type="button"
                        aria-label="Tutup"
                        onClick={() => setNotice('')}
                    />
                </div>
            )}

            <section className="content-panel mt-4">
                <div className="panel-heading">
                    <div>
                        <h3>Daftar Komentar</h3>
                        <p>
                            Cari komentar berdasarkan isi, penulis, atau artikel.
                        </p>
                    </div>

                    <span className="total-badge">
                        {total} komentar
                    </span>
                </div>

                <div className="toolbar">
                    <div className="search-box">
                        <span aria-hidden="true">
                            <i className="bi bi-search" />
                        </span>

                        <input
                            className="form-control"
                            type="search"
                            aria-label="Cari komentar"
                            placeholder="Cari komentar atau penulis..."
                            value={search}
                            onChange={(event) => {
                                setSearch(event.target.value);
                                setPage(1);
                            }}
                        />
                    </div>

                    <select
                        className="form-select"
                        aria-label="Filter status komentar"
                        value={statusFilter}
                        onChange={(event) => {
                            setStatusFilter(event.target.value);
                            setPage(1);
                        }}
                    >
                        <option value="">Semua status</option>
                        <option value="pending">Menunggu</option>
                        <option value="approved">Disetujui</option>
                        <option value="rejected">Ditolak</option>
                    </select>
                </div>

                <div className="table-responsive">
                    <table className="table align-middle">
                        <thead>
                            <tr>
                                <th>Penulis / Komentar</th>
                                <th>Artikel</th>
                                <th>Status</th>
                                <th>Tanggal</th>
                                <th className="text-end">Tindakan</th>
                            </tr>
                        </thead>

                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-5">
                                        <div
                                            className="spinner-border spinner-border-sm"
                                            role="status"
                                        />
                                        <span className="ms-2">
                                            Memuat komentar...
                                        </span>
                                    </td>
                                </tr>
                            ) : comments.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="text-center text-secondary py-5"
                                    >
                                        Tidak ada komentar yang cocok.
                                    </td>
                                </tr>
                            ) : (
                                comments.map((comment) => (
                                    <tr key={comment.id}>
                                        <td style={{ minWidth: '260px' }}>
                                            <strong>
                                                {comment.author_name}
                                            </strong>

                                            {comment.author_email && (
                                                <div className="small text-secondary">
                                                    {comment.author_email}
                                                </div>
                                            )}

                                            <p
                                                className="mb-0 mt-2"
                                                style={{
                                                    whiteSpace: 'pre-wrap',
                                                    overflowWrap: 'anywhere',
                                                }}
                                            >
                                                {comment.body}
                                            </p>
                                        </td>

                                        <td style={{ minWidth: '160px' }}>
                                            {comment.post?.title ?? 'Artikel dihapus'}
                                        </td>

                                        <td>
                                            <span
                                                className={`badge ${
                                                    comment.status === 'approved'
                                                        ? 'text-bg-success'
                                                        : comment.status === 'rejected'
                                                          ? 'text-bg-danger'
                                                          : 'text-bg-warning'
                                                }`}
                                            >
                                                {statusLabels[comment.status]}
                                            </span>
                                        </td>

                                        <td style={{ minWidth: '145px' }}>
                                            {formatDate(comment.created_at)}
                                        </td>

                                        <td>
                                            <div className="d-flex justify-content-end flex-wrap gap-2">
                                                {comment.status !== 'approved' && (
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-outline-success"
                                                        disabled={workingId === comment.id}
                                                        onClick={() => void updateStatus(comment, 'approved')}
                                                    >
                                                        Setujui
                                                    </button>
                                                )}

                                                {comment.status !== 'rejected' && (
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-outline-warning"
                                                        disabled={workingId === comment.id}
                                                        onClick={() => void updateStatus(comment, 'rejected')}
                                                    >
                                                        Tolak
                                                    </button>
                                                )}

                                                {comment.status !== 'pending' && (
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-outline-secondary"
                                                        disabled={workingId === comment.id}
                                                        onClick={() => void updateStatus(comment, 'pending')}
                                                    >
                                                        Tinjau ulang
                                                    </button>
                                                )}

                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-outline-danger"
                                                    disabled={workingId === comment.id}
                                                    onClick={() => void deleteComment(comment)}
                                                >
                                                    Hapus
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <Pagination
                    currentPage={page}
                    lastPage={lastPage}
                    total={total}
                    perPage={10}
                    loading={loading}
                    itemLabel="komentar"
                    onPageChange={setPage}
                />
            </section>
        </AdminLayout>
    );
}