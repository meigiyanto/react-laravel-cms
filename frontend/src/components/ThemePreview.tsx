import type { CSSProperties } from 'react';
import { themeToCssVariables, themeComponentAttributes, type ThemeSettings } from '../utils/themeTokens';
import './ThemePreview.css';

type Props = { name: string; settings: ThemeSettings; onClose: () => void };

export default function ThemePreview({ name, settings, onClose }: Props) {
    const variables = themeToCssVariables(settings) as CSSProperties;
    const attributes = themeComponentAttributes(settings);

    return (
        <div className="theme-preview-backdrop" role="presentation" onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose();
        }}>
            <section className="theme-preview-dialog" role="dialog" aria-modal="true" aria-labelledby="theme-preview-title">
                <header className="theme-preview-toolbar">
                    <div><strong id="theme-preview-title">Preview: {name}</strong><span>Pratinjau lokal · belum mengubah website publik</span></div>
                    <button type="button" className="btn-close" aria-label="Tutup preview" onClick={onClose} />
                </header>
                <div className="theme-preview-canvas" style={variables} data-button-style={attributes.buttonStyle} data-card-style={attributes.cardStyle}>
                    <div className="theme-preview-nav"><strong>{name}</strong><nav><span>Home</span><span>Blog</span><span>About</span><span>Contact</span></nav></div>
                    <main className="theme-preview-main">
                        <span className="theme-preview-eyebrow">DESIGN PREVIEW</span>
                        <h1>Build a meaningful digital experience.</h1>
                        <p>Periksa warna, tipografi, ruang, dan gaya komponen sebelum tema diaktifkan.</p>
                        <div className="theme-preview-actions"><button type="button" className="theme-preview-primary">Explore articles</button><button type="button" className="theme-preview-secondary">Learn more</button></div>
                        <div className="theme-preview-cards">
                            <article><span className="theme-preview-card-icon">01</span><h2>Thoughtful design</h2><p>Visual yang konsisten membantu konten tampil lebih jelas.</p></article>
                            <article><span className="theme-preview-card-icon">02</span><h2>Flexible content</h2><p>Layout dan tema tetap terpisah agar mudah dikembangkan.</p></article>
                            <article><span className="theme-preview-card-icon">03</span><h2>Reusable system</h2><p>Design tokens dapat digunakan kembali di seluruh halaman.</p></article>
                        </div>
                    </main>
                    <footer className="theme-preview-footer">Footer preview · {name}</footer>
                </div>
            </section>
        </div>
    );
}
