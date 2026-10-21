import { useCallback, useEffect, useState, lazy, type FormEvent } from 'react';
import axios from 'axios';
import api from '../api/client';
import AdminLayout from '../components/AdminLayout';
import { type ActiveModule } from '../components/Sidebar';
const Pagination = lazy(() => import('../components/Pagination'));
import { faImages } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useAuthProfile } from '../auth/AuthProfileContext';

type MediaItem = {
    id: number;
    user_id: number;
    path: string;
    url?: string;
    original_name: string;
    mime_type: string;
    size: number;
    alt_text: string | null;
    created_at: string;
};

type MediaPagination = {
    current_page: number;
    last_page: number;
    total: number;
    data: MediaItem[];
};

function errorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
        const errors = error.response?.data?.errors;
        if (errors && typeof errors === 'object') {
            return Object.values(errors).flat().join(' ');
        }
        return error.response?.data?.message || 'Gagal menghubungi API.';
    }
    return 'Terjadi kesalahan yang tidak diketahui.';
}

function getMediaUrl(media: MediaItem): string {
    const url = media.url || `/storage/${media.path.replace(/^\/+/, '')}`;
    if (/^https?:\/\//i.test(url)) return url;

    const base = (api.defaults.baseURL || window.location.origin)
    .replace(/\/api\/?$/, '')
    .replace(/\/+$/, '');

    return new URL(url, `${base}/`).toString();
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type NavigationProps = {
    onNavigate: (module: ActiveModule) => void;
    onLogout: () => void;
};

export default function MediaPage({ onNavigate, onLogout }: NavigationProps) {
    const [items, setItems] = useState < MediaItem[] > ([]);
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [deletingId, setDeletingId] = useState <number | null> (null);
    const [selectedFile, setSelectedFile] = useState <File | null> (null);
    const [uploadAlt, setUploadAlt] = useState('');
    const [altTexts, setAltTexts] = useState <Record <number, string>>({});
    const [savingAltId, setSavingAltId] = useState <number | null> (null);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    
    const profile = useAuthProfile();

    const canEditMedia = (media: MediaItem) => {
        const permissions = profile?.permissions ?? [];
    
        return (
            permissions.includes('*') ||
            permissions.includes('media.update') ||
            (
                permissions.includes('media.update.own') &&
                media.user_id === profile?.id
            )
        );
    };
    
    const canDeleteMedia = (media: MediaItem) => {
        const permissions = profile?.permissions ?? [];
    
        return (
            permissions.includes('*') ||
            permissions.includes('media.delete') ||
            (
                permissions.includes('media.delete.own') &&
                media.user_id === profile?.id
            )
        );
    };

    const loadMedia = useCallback(async () => {
        setLoading(true);
        setError('');
    
        try {
            const response = await api.get('/media', {
                params: {
                    page,
                    search: search.trim() || undefined,
                },
            });
    
            const result: MediaPagination = response.data.data;
    
            setItems(result.data);
            setLastPage(result.last_page);
            setTotal(result.total);
    
            setAltTexts((current) => {
                const next = { ...current };
    
                result.data.forEach((item) => {
                    if (next[item.id] === undefined) {
                        next[item.id] = item.alt_text || '';
                    }
                });
    
                return next;
            });
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setLoading(false);
        }
    }, [page, search]);
    
    useEffect(() => {
        const timer = window.setTimeout(() => {
            void loadMedia();
        }, 250);

        return () => window.clearTimeout(timer);
    }, [loadMedia]);

    async function uploadMedia(event: FormEvent < HTMLFormElement >) {
        event.preventDefault();

        if (!selectedFile) {
            setError('Pilih gambar yang ingin diunggah.');
            return;
        }

        const data = new FormData();
        data.append('file', selectedFile);
        data.append('alt_text', uploadAlt.trim());

        setUploading(true);
        setError('');
        setNotice('');

        try {
            await api.post('/media', data);
            setSelectedFile(null);
            setUploadAlt('');
            setNotice('Gambar berhasil diunggah.');

            const input = document.getElementById('media-file') as HTMLInputElement | null;
            if (input) input.value = '';

            if (page !== 1) {
                setPage(1);
            } else {
                await loadMedia();
            }
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setUploading(false);
        }
    }

    async function saveAltText(media: MediaItem) {
        setSavingAltId(media.id);
        setError('');
        setNotice('');

        try {
            const altText = (altTexts[media.id] || '').trim();
            const response = await api.patch(`/media/${media.id}`, {
                alt_text: altText || null,
            });

            const updated: MediaItem = response.data.data;

            setItems((current) =>
                current.map((item) => item.id === media.id
                    ? {
                        ...item, ...updated
                    }: item),
            );
            setAltTexts((current) => ({
                ...current, [media.id]: altText
            }));
            setNotice(`Alt text untuk "${media.original_name}" berhasil diperbarui.`);
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setSavingAltId(null);
        }
    }

    async function deleteMedia(media: MediaItem) {
        if (!window.confirm(
            `Hapus gambar "${media.original_name}"? Tindakan ini tidak dapat dibatalkan.`,
        )) return;

        setDeletingId(media.id);
        setError('');
        setNotice('');

        try {
            await api.delete(`/media/${media.id}`);
            setNotice('Gambar berhasil dihapus.');

            if (items.length === 1 && page > 1) {
                setPage((current) => current - 1);
            } else {
                await loadMedia();
            }
        } catch (err) {
            // API menolak penghapusan jika gambar masih digunakan oleh artikel/halaman.
            setError(errorMessage(err));
        } finally {
            setDeletingId(null);
        }
    }

    return (
        <AdminLayout
            active="media"
            onNavigate={onNavigate}
            onLogout={onLogout}
            title="Media"
            breadcrumb="Workspace / Konten / Media"
        >
            <section className="welcome-panel">
                <div>
                    <span className="eyebrow">MEDIA LIBRARY</span>
                    <h2>Kelola aset visual CMS.</h2>
                    <p>Unggah gambar dan gunakan kembali pada artikel maupun halaman.</p>
                </div>
                <div className="welcome-icon" aria-hidden="true">
                    <FontAwesomeIcon icon={faImages} />
                </div>
            </section>

            {error && (
                <div className="alert alert-danger mt-3" role="alert">
                    {error}
                    <button className="btn-close float-end" type="button"
                        onClick={() => setError('')} aria-label="Tutup" />
                </div>
            )}
            
            {notice && (
                <div className="alert alert-success mt-3" role="status">
                    {notice}
                    <button className="btn-close float-end" type="button"
                        onClick={() => setNotice('')} aria-label="Tutup" />
                </div>
            )}

            <section className="content-panel mt-4">            <div className="panel-heading">
                    <div>
                        <h3>Unggah Gambar</h3>
                        <p>Format JPEG, JPG, PNG, WebP, atau GIF. Maksimum 5 MB.</p>
                    </div>
                </div>

                <form className="px-4 pb-4" onSubmit={uploadMedia}>
                    <div className="mb-3">
                        <label className="form-label" htmlFor="media-file">File gambar *</label>
                            <input
                                id="media-file"
                                className="form-control"
                                type="file"
                                accept="image/jpeg,image/png,image/webp,image/gif"
                                required
                                onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
                            />
                        {selectedFile && (
                            <div className="form-text">
                                {selectedFile.name} · {formatBytes(selectedFile.size)}
                            </div>
                        )}
                    </div>
                    <div className="mb-3">
                                        <label className="form-label" htmlFor="upload-alt">Alt text</label>
                                        <input
                                            id="upload-alt"
                                            className="form-control"
                                            maxLength={255}
                                            value={uploadAlt}
                                            placeholder="Deskripsi singkat gambar untuk aksesibilitas"
                                            onChange={(event) => setUploadAlt(event.target.value)}
                                        />
                                </div>
                    <button className="btn btn-primary" type="submit" disabled={uploading}>
                        {uploading ? 'Mengunggah...': 'Unggah Gambar'}
                    </button>
                </form>
            </section>

            <section className="content-panel mt-4">            <div className="panel-heading">
                    <div>
                        <h3>Perpustakaan Media</h3>
                        <p>
                            Gambar terbaru ditampilkan terlebih dahulu.
                        </p>
                    </div>
                    <span className="total-badge">{total} file</span>
                </div>

                <div className="px-4 pb-3">
                    <label className="form-label" htmlFor="media-search">
                        Cari media
                    </label>
                    <input
                        id="media-search"
                        type="search"
                        className="form-control"
                        value={search}
                        placeholder="Cari nama file atau alt text..."
                        aria-label="Cari media berdasarkan nama file atau alt text"
                        onChange={(event) => {
                            setSearch(event.target.value);
                            setPage(1);
                        }}
                    />
                </div>

                {loading ? (
                    <div className="empty-state">
                        Memuat media...
                    </div>
                ) : items.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">
                            <FontAwesomeIcon icon={faImages} />
                        </div>
                        <strong>
                            {search.trim()
                                ? 'Media tidak ditemukan'
                                : 'Belum ada gambar'}
                        </strong>
                        <p>
                            {search.trim()
                                ? 'Coba kata kunci nama file atau alt text yang lain.'
                                : 'Unggah gambar pertama menggunakan formulir di atas.'}
                        </p>
                    </div>
                ): (
                    <div className="media-grid">
                        {items.map((media) => (
                            <article className="media-card" key={media.id}>
                                <a
                                    className="media-preview"
                                    href={getMediaUrl(media)}
                                    target="_blank"
                                    rel="noreferrer"
                                    aria-label={`Buka gambar ${media.original_name} di tab baru`}
                                >
                                    <img
                                        src={getMediaUrl(media)}
                                        alt={media.alt_text || media.original_name}
                                        loading="lazy"
                                    />
                            </a>
                            <div className="media-card-body">
                                <div className="media-filename" title={media.original_name}>
                                    {media.original_name}
                                </div>
                                <div className="media-meta">
                                    {formatBytes(media.size)} · {media.mime_type}
                                </div>
                                <label className="form-label mt-3" htmlFor={`alt-${media.id}`}>
                                    Alt text
                                </label>
                                <input
                                    id={`alt-${media.id}`}
                                    className="form-control form-control-sm"
                                    maxLength={255}
                                    value={altTexts[media.id] ?? ''}
                                    onChange={(event) => setAltTexts((current) => ({
                                        ...current,
                                        [media.id]: event.target.value,
                                    }))}
                                />
                            <div className="d-flex gap-2 mt-3">
                                {canEditMedia(media) && (
                                <button
                                    className="btn btn-sm btn-primary flex-grow-1"
                                    type="button"
                                    disabled={savingAltId !== null || deletingId !== null}
                                    onClick={() => void saveAltText(media)}
                                >
                                    {savingAltId === media.id ? 'Menyimpan...': 'Simpan Alt'}
                                </button>
                                )}
                                {canDeleteMedia(media) && (
                                <button
                                    className="btn btn-sm btn-outline-danger"
                                    type="button"
                                    disabled={deletingId !== null || savingAltId !== null}
                                    onClick={() => void deleteMedia(media)}
                                >
                                    {deletingId === media.id ? '...': 'Hapus'}
                                </button>
                                )}
                            </div>
                        </div>
                        </article>
                    ))}
                </div>
                )}
                
                <Pagination
                    currentPage={page}
                    lastPage={lastPage}
                    total={total}
                    perPage={20}
                    loading={loading}
                    itemLabel="file"
                    onPageChange={setPage}
                />

            </section>
        </AdminLayout>
    );
}