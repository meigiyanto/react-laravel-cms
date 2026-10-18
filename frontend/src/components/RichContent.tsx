import { useMemo } from 'react';
import './RichContent.css';
import { sanitizeArticleHtml } from '../utils/sanitizeHtml';

// import DOMPurify from 'dompurify';
// import api from '../api/client';


/*
type RichContentProps = {
    content: string | null | undefined;
};

function normalizeUrl( value: string, baseUrl: string ): string {
    try {
        const backendOrigin = new URL(baseUrl).origin;
        const url = new URL(value, backendOrigin);

        if (!['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol)) {
            return '';
        }

        return url.href;
    } catch {
        return '';
    }
}

function renderSafeHtml(content: string): string {
    const baseUrl = api.defaults.baseURL;

    const looksLikeHtml =
        /<\/?(?:h[1-6]|p|br|hr|strong|b|em|i|u|s|blockquote|pre|code|ul|ol|li|a|img|figure|figcaption|table|thead|tbody|tr|th|td)\b[^>]*>/i.test(
            content,
        );

    const input = looksLikeHtml
        ? content
        : content
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

    const cleanHtml = DOMPurify.sanitize(input, {
        ALLOWED_TAGS,
        ALLOWED_ATTR,
        ALLOW_DATA_ATTR: false,
    });

    const document = new DOMParser().parseFromString(
        cleanHtml,
        'text/html',
    );

    document.querySelectorAll('a[href]').forEach((element) => {
        const anchor = element as HTMLAnchorElement;
        const href = anchor.getAttribute('href');

        if (!href) return;

        const normalized = normalizeUrl(href, baseUrl ?? window.location.origin);

        if (!normalized) {
            anchor.removeAttribute('href');
            return;
        }

        anchor.setAttribute('href', normalized);

        if (new URL(normalized).origin !== window.location.origin) {
            anchor.setAttribute('target', '_blank');
            anchor.setAttribute('rel', 'noopener noreferrer');
        }
    });

    document.querySelectorAll('img[src]').forEach((element) => {
        const image = element as HTMLImageElement;
        const src = image.getAttribute('src');

        if (!src) return;

        const normalized = normalizeUrl(src, baseUrl ?? window.location.origin);

        if (!normalized) {
            image.remove();
            return;
        }

        image.setAttribute('src', normalized);
        image.setAttribute('loading', 'lazy');
        image.setAttribute('decoding', 'async');
    });

    return document.body.innerHTML;
}
*/

type Props = {
    content: string | null | undefined;
};

export default function RichContent({ content }: Props) {
    const safeHtml = useMemo(() => sanitizeArticleHtml(content ?? ''), [content]);

    if (!content?.trim()) {
        return <p className="text-muted">Artikel belum memiliki isi.</p>;
    }

    return (
        <div
            className="post-content"
            dangerouslySetInnerHTML={{ __html: safeHtml }}
        />
    );
}
