import type { ReactNode } from 'react';

type Block = { id: string; type: 'heading' | 'text' | 'image' | 'button' | 'spacer'; content: string; media?: { url: string; alt_text: string | null } | null; settings: Record<string, string> };
type Section = { id: string; type: 'container' | 'hero' | 'content' | 'grid' | 'columns' | 'cta'; settings: Record<string, string>; blocks: Block[] };
export type LayoutDefinition = { version: 1; sections: Section[] };
type Props = { definition: LayoutDefinition };

function safeLink(value: string): boolean {
    if (!value) return false;
    if (value.startsWith('/') && !value.startsWith('//')) return true;
    try { const url = new URL(value); return ['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol); }
    catch { return false; }
}

function renderBlock(block: Block): ReactNode {
    switch (block.type) {
        case 'heading':
            return <h2 className={`cms-layout-heading size-${block.settings.size || 'large'} align-${block.settings.align || 'left'}`}>{block.content}</h2>;
        case 'text':
            return <p className={`cms-layout-text size-${block.settings.size || 'medium'} align-${block.settings.align || 'left'}`}>{block.content}</p>;
        case 'image': {
            const src = block.media?.url || block.content;
            if (!src || (!block.media && !safeLink(src))) return null;
            return <img className="cms-layout-image" src={src} alt={block.media?.alt_text || ''} loading="lazy" />;
        }
        case 'button': {
            const className = `cms-layout-button variant-${block.settings.variant || 'primary'}`;
            const href = block.settings.url || '';
            if (!safeLink(href)) return <span className={className}>{block.content}</span>;
            const target = block.settings.target === '_blank' ? '_blank' : '_self';
            return <a className={className} href={href} target={target} rel={target === '_blank' ? 'noopener noreferrer' : undefined}>{block.content}</a>;
        }
        case 'spacer':
            return <div className="cms-layout-spacer" aria-hidden="true" />;
        default:
            return null;
    }
}

export default function LayoutRenderer({ definition }: Props) {
    if (definition.version !== 1 || !Array.isArray(definition.sections)) return null;
    return <div className="cms-layout-renderer">{definition.sections.map((section) => (
        <section key={section.id} className={`cms-layout-section section-${section.type}`}>
            <div className={`cms-layout-inner width-${section.settings.width || 'default'} spacing-${section.settings.spacing || 'medium'} background-${section.settings.background || 'default'}`}>
                {section.blocks.map((block) => <div key={block.id} className={`cms-layout-block block-${block.type}`}>{renderBlock(block)}</div>)}
            </div>
        </section>
    ))}</div>;
}
