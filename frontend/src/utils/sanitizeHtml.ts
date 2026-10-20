import DOMPurify from 'dompurify';

const ALLOWED_TAGS = [
    'p', 'br', 'hr',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'strong', 'b', 'em', 'i', 'u', 's',
    'ul', 'ol', 'li',
    'blockquote', 'pre', 'code',
    'a', 'img', 'figure', 'figcaption',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'sub', 'sup',
];

const ALLOWED_ATTR = [
    'href', 'src', 'alt', 'title',
    'target', 'rel', 'width', 'height',
    'colspan', 'rowspan',
];

export function sanitizeArticleHtml(html: string): string {
    return DOMPurify.sanitize(html, {
        ALLOWED_TAGS,
        ALLOWED_ATTR,
        ALLOW_DATA_ATTR: false,
        FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form'],
        FORBID_ATTR: ['style'],
    });
}
