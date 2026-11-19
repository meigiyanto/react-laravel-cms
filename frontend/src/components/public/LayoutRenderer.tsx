import type { ReactNode } from 'react';

type Block = { id: string; type: 'heading' | 'text' | 'image' | 'button' | 'spacer'; content: string; settings: Record<string, string> };
type Section = { id: string; type: 'container' | 'hero' | 'content' | 'grid' | 'columns' | 'cta'; settings: Record<string, string>; blocks: Block[] };
export type LayoutDefinition = { version: 1; sections: Section[] };
type Props = { definition: LayoutDefinition };

function isHttpUrl(value: string): boolean {
    try { const url = new URL(value); return url.protocol === 'http:' || url.protocol === 'https:'; }
    catch { return false; }
}

function renderBlock(block: Block): ReactNode {
    switch (block.type) {
        case 'heading':
            return <h2 className={`cms-layout-heading size-${block.settings.size || 'large'} align-${block.settings.align || 'left'}`}>{block.content}</h2>;
        case 'text':
            return <p className={`cms-layout-text size-${block.settings.size || 'medium'} align-${block.settings.align || 'left'}`}>{block.content}</p>;
        case 'image':
            return isHttpUrl(block.content) ? <img className="cms-layout-image" src={block.content} alt="" loading="lazy" /> : null;
        case 'button':
            return <span className={`cms-layout-button variant-${block.settings.variant || 'primary'}`}>{block.content}</span>;
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
