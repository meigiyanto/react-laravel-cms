import { useState } from 'react';
import type { EditorMedia } from './RichTextEditor';
import './MediaPicker.css';

type Props = {
    items: EditorMedia[];
    onSelect: (media: EditorMedia) => void;
    onClose: () => void;
};

export default function MediaPicker({ items, onSelect, onClose }: Props) {
    const [search, setSearch] = useState('');

    const filteredItems = items.filter((item) => {
        const query = search.toLowerCase().trim();

        return (
            item.original_name.toLowerCase().includes(query) ||
            (item.alt_text ?? '').toLowerCase().includes(query)
        );
    });

    return (
        <div
            className="media-picker-backdrop"
            role="presentation"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <section
                className="media-picker"
                role="dialog"
                aria-modal="true"
                aria-labelledby="media-picker-title"
            >
                <header className="media-picker-header">
                    <div>
                        <h2 id="media-picker-title">Pilih gambar</h2>
                        <p className="text-muted mb-0">
                            Pilih gambar dari Media Library.
                        </p>
                    </div>

                    <button
                        type="button"
                        className="btn-close"
                        aria-label="Tutup galeri"
                        onClick={onClose}
                    />
                </header>

                <div className="p-3">
                    <input
                        className="form-control"
                        type="search"
                        placeholder="Cari nama file atau teks alternatif..."
                        aria-label="Cari media"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                    />
                </div>

                {filteredItems.length === 0 ? (
                    <div className="media-picker-empty">
                        Tidak ada gambar yang cocok. Unggah gambar melalui
                        menu Media terlebih dahulu.
                    </div>
                ) : (
                    <div className="media-picker-grid">
                        {filteredItems.map((media) => (
                            <button
                                key={media.id}
                                type="button"
                                className="media-picker-item"
                                onClick={() => onSelect(media)}
                            >
                                <div className="media-picker-image">
                                    <img
                                        src={media.url}
                                        alt={media.alt_text || ''}
                                        loading="lazy"
                                        onError={(event) => {
                                            event.currentTarget.style.visibility =
                                                'hidden';
                                        }}
                                    />
                                </div>

                                <span className="media-picker-name">
                                    {media.original_name}
                                </span>

                                <span className="media-picker-alt">
                                    {media.alt_text || 'Belum ada teks alternatif'}
                                </span>
                            </button>
                        ))}
                    </div>
                )}

                <footer className="media-picker-footer">
                    <span>{filteredItems.length} gambar</span>

                    <button
                        type="button"
                        className="btn btn-light"
                        onClick={onClose}
                    >
                        Batal
                    </button>
                </footer>
            </section>
        </div>
    );
}
