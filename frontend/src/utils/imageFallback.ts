import type { SyntheticEvent } from 'react';

export const IMAGE_FALLBACK_SRC = '/images/image-placeholder.svg';

function applyImageFallback(image: HTMLImageElement): void {
    if (image.dataset.fallbackApplied === 'true') return;

    image.dataset.fallbackApplied = 'true';
    image.src = IMAGE_FALLBACK_SRC;
    image.alt = image.alt || 'Gambar tidak tersedia';
}

export function handleImageFallback(event: SyntheticEvent<HTMLElement>): void {
    if (event.target instanceof HTMLImageElement) {
        applyImageFallback(event.target);
    }
}

export function handleDocumentImageError(event: Event): void {
    if (event.target instanceof HTMLImageElement) {
        applyImageFallback(event.target);
    }
}
