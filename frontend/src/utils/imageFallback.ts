import type { SyntheticEvent } from 'react';

export const IMAGE_FALLBACK_SRC = '/images/image-placeholder.svg';

export function handleImageFallback(event: SyntheticEvent<HTMLElement>): void {
    const image = event.target;

    if (!(image instanceof HTMLImageElement) || image.dataset.fallbackApplied === 'true') {
        return;
    }

    image.dataset.fallbackApplied = 'true';
    image.src = IMAGE_FALLBACK_SRC;
    image.alt = image.alt || 'Gambar tidak tersedia';
}
