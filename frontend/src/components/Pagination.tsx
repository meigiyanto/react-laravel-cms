import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faArrowLeft,
    faArrowRight
} from '@fortawesome/free-solid-svg-icons';

type PaginationProps = {
    currentPage: number;
    lastPage: number;
    total: number;
    perPage: number;
    loading?: boolean;
    itemLabel?: string;
    onPageChange: (page: number) => void;
};

export default function Pagination({
    currentPage, lastPage, total, perPage, loading = false, itemLabel = 'data', onPageChange
}: PaginationProps) {
    const safeLastPage = Math.max(1, lastPage);
    const start = total === 0 ? 0: (currentPage - 1) * perPage + 1;
    const end = Math.min(currentPage * perPage, total);

    return (
        <nav className="pagination-bar" aria-label="Navigasi halaman">
            <span aria-live="polite">
                Menampilkan {start}–{end} dari {total} {itemLabel}
            </span>
            <span aria-current="page">
                Halaman {currentPage} dari {safeLastPage}
            </span>
            
            <div className="d-flex align-items-center gap-2">
                <button
                    className="btn btn-sm btn-outline-secondary"
                    type="button"
                    disabled={loading || currentPage <= 1}
                    onClick={() => onPageChange(currentPage - 1)}
                    >
                    <FontAwesomeIcon icon={faArrowLeft} /> Sebelumnya
                </button>

                <button
                    className="btn btn-sm btn-outline-secondary"
                    type="button"
                    disabled={loading || currentPage >= safeLastPage}
                    onClick={() => onPageChange(currentPage + 1)}
                    >
                    Berikutnya <FontAwesomeIcon icon={faArrowRight} />
                </button>
            </div>
        </nav>
    );
}