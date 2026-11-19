import { useCallback, useEffect, useState, type FormEvent } from 'react';
import axios from 'axios';
import api from '../api/client';
import AdminLayout from '../components/AdminLayout';
import ThemePreview from '../components/ThemePreview';
import type { ActiveModule } from '../components/Sidebar';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPalette, faPlus, faCheck, faEdit } from '@fortawesome/free-solid-svg-icons';

type ThemeSettings = {
    colors: Record<string, string>;
    typography: {
        bodyFont: string;
        headingFont: string;
        navFont: string;
        baseFontSize: string;
        headingWeight: number;
        bodyWeight: number;
        lineHeight: number;
    };
    layout: {
        containerWidth: string;
        sectionSpacing: string;
        breakpoints: { sm: number; md: number; lg: number; xl: number };
    };
    radius: { small: string; medium: string; large: string };
    shadows: { small: string; medium: string; large: string };
    components: { buttonStyle: string; cardStyle: string };
};

type Theme = {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    version: string;
    status: string;
    settings?: { schema_version: number; settings: ThemeSettings } | null;
    revisions_count?: number;
    updated_at: string;
};

type NavigationProps = { onNavigate: (module: ActiveModule) => void; onLogout: () => void; };
type ThemeResponse = { data: Theme[]; meta?: { active_theme_id: number | null } };

const defaultSettings: ThemeSettings = {
    colors: {
        primary: '#3458db', secondary: '#64748b', background: '#ffffff', surface: '#f8fafc',
        text: '#212529', heading: '#2d465e', accent: '#f75815', contrast: '#ffffff',
        nav: '#000000', navHover: '#f75815', navBackground: '#ffffff',
        navDropdownBackground: '#ffffff', navDropdownText: '#212529', navDropdownHover: '#f75815',
    },
    typography: {
        bodyFont: 'Roboto, sans-serif', headingFont: 'Nunito, sans-serif', navFont: 'Poppins, sans-serif',
        baseFontSize: '16px', headingWeight: 700, bodyWeight: 400, lineHeight: 1.5,
    },
    layout: {
        containerWidth: '1200px', sectionSpacing: '64px',
        breakpoints: { sm: 576, md: 768, lg: 992, xl: 1200 },
    },
    radius: { small: '4px', medium: '8px', large: '16px' },
    shadows: { small: 'soft', medium: 'medium', large: 'strong' },
    components: { buttonStyle: 'solid', cardStyle: 'elevated' },
};

const colorLabels: Record<string, string> = {
    primary: 'Primary', secondary: 'Secondary', background: 'Background', surface: 'Surface',
    text: 'Text', heading: 'Heading', accent: 'Accent', contrast: 'Contrast',
    nav: 'Navigation text', navHover: 'Navigation hover', navBackground: 'Navigation background',
    navDropdownBackground: 'Dropdown background', navDropdownText: 'Dropdown text',
    navDropdownHover: 'Dropdown hover',
};

function getErrorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
        const errors = error.response?.data?.errors;
        if (errors && typeof errors === 'object') return Object.values(errors).flat().join(' ');
        return error.response?.data?.message || 'Gagal menghubungi API.';
    }
    return 'Terjadi kesalahan yang tidak diketahui.';
}

function cloneSettings(settings?: ThemeSettings | null): ThemeSettings {
    return JSON.parse(JSON.stringify(settings || defaultSettings)) as ThemeSettings;
}

export default function ThemeManagerPage({ onNavigate, onLogout }: NavigationProps) {
    const [themes, setThemes] = useState<Theme[]>([]);
    const [activeThemeId, setActiveThemeId] = useState<number | null>(null);
    const [selected, setSelected] = useState<Theme | null>(null);
    const [settings, setSettings] = useState<ThemeSettings>(cloneSettings());
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activatingId, setActivatingId] = useState<number | null>(null);
    const [showCreate, setShowCreate] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [newTheme, setNewTheme] = useState({ name: '', slug: '', description: '' });
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    const loadThemes = useCallback(async () => {
        try {
            const response = await api.get<ThemeResponse>('/admin/themes');
            setThemes(response.data.data || []);
            setActiveThemeId(response.data.meta?.active_theme_id ?? null);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        let active = true;
        api.get<ThemeResponse>('/admin/themes')
            .then((response) => {
                if (!active) return;
                setThemes(response.data.data || []);
                setActiveThemeId(response.data.meta?.active_theme_id ?? null);
            })
            .catch((err: unknown) => {
                if (active) setError(getErrorMessage(err));
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => { active = false; };
    }, []);

    function selectTheme(theme: Theme) {
        setSelected(theme);
        setSettings(cloneSettings(theme.settings?.settings));
        setError('');
        setNotice('');
        setShowCreate(false);
    }

    function updateColor(key: string, value: string) {
        setSettings((current) => ({ ...current, colors: { ...current.colors, [key]: value } }));
    }

    function updateTypography(key: keyof ThemeSettings['typography'], value: string | number) {
        setSettings((current) => ({ ...current, typography: { ...current.typography, [key]: value } }));
    }

    function updateLayout(key: 'containerWidth' | 'sectionSpacing', value: string) {
        setSettings((current) => ({ ...current, layout: { ...current.layout, [key]: value } }));
    }

    function updateRadius(key: keyof ThemeSettings['radius'], value: string) {
        setSettings((current) => ({ ...current, radius: { ...current.radius, [key]: value } }));
    }

    async function createTheme(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSaving(true);
        setError('');
        setNotice('');
        try {
            const response = await api.post('/admin/themes', {
                name: newTheme.name.trim(),
                slug: newTheme.slug.trim(),
                description: newTheme.description.trim() || null,
            });
            const created: Theme = response.data.data;
            setNewTheme({ name: '', slug: '', description: '' });
            setShowCreate(false);
            await loadThemes();
            selectTheme(created);
            setNotice('Tema baru berhasil dibuat. Sesuaikan design tokens sebelum mengaktifkannya.');
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setSaving(false);
        }
    }

    async function saveTheme(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!selected) return;
        setSaving(true);
        setError('');
        setNotice('');
        try {
            const response = await api.put(`/admin/themes/${selected.id}`, { settings });
            const updated: Theme = response.data.data;
            setSelected(updated);
            setSettings(cloneSettings(updated.settings?.settings));
            setThemes((current) => current.map((theme) => theme.id === updated.id ? updated : theme));
            setNotice('Konfigurasi tema berhasil disimpan. Perubahan belum diterapkan ke website sampai tema diaktifkan.');
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setSaving(false);
        }
    }

    async function activateTheme(theme: Theme) {
        if (theme.id === activeThemeId) return;
        if (!window.confirm(`Aktifkan tema "${theme.name}" untuk website publik?`)) return;
        setActivatingId(theme.id);
        setError('');
        setNotice('');
        try {
            await api.post(`/admin/themes/${theme.id}/activate`);
            setActiveThemeId(theme.id);
            setNotice(`Tema "${theme.name}" sekarang aktif untuk website publik.`);
            await loadThemes();
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setActivatingId(null);
        }
    }

    return (
        <AdminLayout active="themes" onNavigate={onNavigate} onLogout={onLogout} title="Theme Manager"
            breadcrumb="Workspace / Appearance / Themes"
            actions={<button className="btn btn-primary" type="button" onClick={() => { setSelected(null); setShowCreate(true); setError(''); }}>
                <FontAwesomeIcon icon={faPlus} className="me-2" />Tema Baru
            </button>}>
            <section className="welcome-panel">
                <div><span className="eyebrow">DESIGN SYSTEM</span><h2>Kelola identitas visual website.</h2>
                    <p>Buat beberapa tema, atur design tokens, lalu aktifkan tema yang ingin digunakan website publik.</p></div>
                <div className="welcome-icon" aria-hidden="true"><FontAwesomeIcon icon={faPalette} /></div>
            </section>

            {error && <div className="alert alert-danger mt-3" role="alert">{error}<button className="btn-close float-end" type="button" onClick={() => setError('')} aria-label="Tutup" /></div>}
            {notice && <div className="alert alert-success mt-3" role="status">{notice}<button className="btn-close float-end" type="button" onClick={() => setNotice('')} aria-label="Tutup" /></div>}

            {showCreate && <section className="content-panel mt-4">
                <div className="panel-heading"><div><h3>Buat Tema Baru</h3><p>Tema dibuat menggunakan konfigurasi design tokens bawaan.</p></div>
                    <button className="btn-close" type="button" aria-label="Tutup form" onClick={() => setShowCreate(false)} /></div>
                <form className="px-4 pb-4" onSubmit={createTheme}>
                    <div className="row g-3">
                        <div className="col-md-6"><label className="form-label" htmlFor="theme-name">Nama tema *</label>
                            <input id="theme-name" className="form-control" required maxLength={120} value={newTheme.name}
                                onChange={(event) => setNewTheme((current) => ({ ...current, name: event.target.value }))} /></div>
                        <div className="col-md-6"><label className="form-label" htmlFor="theme-slug">Slug *</label>
                            <input id="theme-slug" className="form-control" required maxLength={120} pattern="[A-Za-z0-9_-]+" value={newTheme.slug}
                                onChange={(event) => setNewTheme((current) => ({ ...current, slug: event.target.value }))} /></div>
                        <div className="col-12"><label className="form-label" htmlFor="theme-description">Deskripsi</label>
                            <textarea id="theme-description" className="form-control" rows={2} maxLength={1000} value={newTheme.description}
                                onChange={(event) => setNewTheme((current) => ({ ...current, description: event.target.value }))} /></div>
                    </div>
                    <div className="d-flex justify-content-end gap-2 mt-3"><button className="btn btn-light" type="button" onClick={() => setShowCreate(false)} disabled={saving}>Batal</button>
                        <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Membuat...' : 'Buat Tema'}</button></div>
                </form>
            </section>}

            <section className="content-panel mt-4">
                <div className="panel-heading"><div><h3>Daftar Tema</h3><p>Hanya satu tema yang digunakan website publik pada satu waktu.</p></div>
                    <span className="total-badge">{themes.length} tema</span></div>
                {loading ? <div className="empty-state">Memuat tema...</div> : themes.length === 0 ? (
                    <div className="empty-state"><div className="empty-icon"><FontAwesomeIcon icon={faPalette} /></div><strong>Belum ada tema</strong>
                        <p>Buat tema pertama untuk mengatur tampilan website.</p></div>
                ) : <div className="theme-manager-grid">
                    {themes.map((theme) => <article className={`theme-manager-card ${selected?.id === theme.id ? 'selected' : ''}`} key={theme.id}>
                        <div className="theme-card-preview" style={{ background: theme.settings?.settings.colors.background || '#fff' }}>
                            <div className="theme-preview-header" style={{ background: theme.settings?.settings.colors.navBackground || '#fff', color: theme.settings?.settings.colors.nav || '#222' }}>
                                <strong>{theme.name}</strong><span>Menu&nbsp;&nbsp; Blog&nbsp;&nbsp; About</span></div>
                            <div className="theme-preview-content"><span style={{ background: theme.settings?.settings.colors.primary || '#3458db' }} />
                                <div style={{ background: theme.settings?.settings.colors.surface || '#f8fafc' }} />
                                <div style={{ background: theme.settings?.settings.colors.surface || '#f8fafc' }} /></div>
                        </div>
                        <div className="theme-card-body"><div className="d-flex align-items-start justify-content-between gap-2">
                            <div><h4>{theme.name}</h4><p>/{theme.slug} · v{theme.version}</p></div>
                            {activeThemeId === theme.id ? <span className="theme-active-badge"><FontAwesomeIcon icon={faCheck} /> Aktif</span> : <span className="theme-draft-badge">{theme.status === 'published' ? 'Tersimpan' : 'Draft'}</span>}
                        </div>
                        {theme.description && <p className="theme-description">{theme.description}</p>}
                        <div className="d-flex gap-2 mt-3"><button className="btn btn-sm btn-outline-primary flex-grow-1" type="button" onClick={() => selectTheme(theme)}>
                            <FontAwesomeIcon icon={faEdit} className="me-1" />Edit</button>
                            <button className="btn btn-sm btn-primary flex-grow-1" type="button" disabled={activeThemeId === theme.id || activatingId !== null || !theme.settings}
                                onClick={() => void activateTheme(theme)}>{activatingId === theme.id ? 'Mengaktifkan...' : activeThemeId === theme.id ? 'Tema Aktif' : <><FontAwesomeIcon icon={faCheck} className="me-1" />Aktifkan</>}</button></div>
                    </div></article>)}
                </div>}
            </section>

            {selected && <section className="content-panel mt-4 theme-editor">
                <div className="panel-heading"><div><h3>Edit Design Tokens: {selected.name}</h3>
                    <p>Perubahan disimpan sebagai revisi baru. Simpan konfigurasi sebelum mengaktifkan tema.</p></div>
                    <div className="d-flex gap-2"><button className="btn btn-sm btn-outline-primary" type="button" onClick={() => setShowPreview(true)}>Preview</button>
                        <button className="btn btn-sm btn-outline-secondary" type="button" onClick={() => setSelected(null)}>Tutup Editor</button></div></div>
                <form onSubmit={saveTheme} className="px-4 pb-4">
                    <div className="theme-editor-section"><h4>Color System</h4><p>Atur warna dasar dan warna navigasi website.</p>
                        <div className="theme-color-grid">{Object.entries(colorLabels).map(([key, label]) => <label className="theme-color-field" key={key}>
                            <span>{label}</span><input type="color" className="form-control form-control-color" value={settings.colors[key] || '#000000'}
                                onChange={(event) => updateColor(key, event.target.value)} /><code>{settings.colors[key]}</code>
                        </label>)}</div>
                    </div>
                    <div className="theme-editor-section"><h4>Typography</h4><p>Atur keluarga font dan skala teks.</p>
                        <div className="row g-3">
                            <div className="col-md-4"><label className="form-label" htmlFor="theme-body-font">Body font</label><input id="theme-body-font" className="form-control" value={settings.typography.bodyFont} onChange={(event) => updateTypography('bodyFont', event.target.value)} /></div>
                            <div className="col-md-4"><label className="form-label" htmlFor="theme-heading-font">Heading font</label><input id="theme-heading-font" className="form-control" value={settings.typography.headingFont} onChange={(event) => updateTypography('headingFont', event.target.value)} /></div>
                            <div className="col-md-4"><label className="form-label" htmlFor="theme-nav-font">Navigation font</label><input id="theme-nav-font" className="form-control" value={settings.typography.navFont} onChange={(event) => updateTypography('navFont', event.target.value)} /></div>
                            <div className="col-md-3"><label className="form-label" htmlFor="theme-font-size">Base font size</label><input id="theme-font-size" className="form-control" pattern="([1-9]|[1-9][0-9])px" value={settings.typography.baseFontSize} onChange={(event) => updateTypography('baseFontSize', event.target.value)} /></div>
                            <div className="col-md-3"><label className="form-label" htmlFor="theme-heading-weight">Heading weight</label><select id="theme-heading-weight" className="form-select" value={settings.typography.headingWeight} onChange={(event) => updateTypography('headingWeight', Number(event.target.value))}>{[100,200,300,400,500,600,700,800,900].map((weight) => <option key={weight} value={weight}>{weight}</option>)}</select></div>
                            <div className="col-md-3"><label className="form-label" htmlFor="theme-body-weight">Body weight</label><select id="theme-body-weight" className="form-select" value={settings.typography.bodyWeight} onChange={(event) => updateTypography('bodyWeight', Number(event.target.value))}>{[100,200,300,400,500,600,700,800,900].map((weight) => <option key={weight} value={weight}>{weight}</option>)}</select></div>
                            <div className="col-md-3"><label className="form-label" htmlFor="theme-line-height">Line height</label><input id="theme-line-height" type="number" min="1" max="2.5" step="0.1" className="form-control" value={settings.typography.lineHeight} onChange={(event) => updateTypography('lineHeight', Number(event.target.value))} /></div>
                        </div>
                    </div>
                    <div className="theme-editor-section"><h4>Layout & Shape</h4><p>Atur lebar kontainer, jarak section, dan sudut komponen.</p>
                        <div className="row g-3">
                            <div className="col-md-3"><label className="form-label" htmlFor="theme-container">Container width</label><input id="theme-container" className="form-control" pattern="[1-9][0-9]{2,3}px" value={settings.layout.containerWidth} onChange={(event) => updateLayout('containerWidth', event.target.value)} /></div>
                            <div className="col-md-3"><label className="form-label" htmlFor="theme-section-spacing">Section spacing</label><input id="theme-section-spacing" className="form-control" pattern="[0-9]{1,3}px" value={settings.layout.sectionSpacing} onChange={(event) => updateLayout('sectionSpacing', event.target.value)} /></div>
                            {(['small', 'medium', 'large'] as const).map((key) => <div className="col-md-2" key={key}><label className="form-label" htmlFor={`theme-radius-${key}`}>Radius {key}</label>
                                <input id={`theme-radius-${key}`} className="form-control" pattern="[0-9]{1,3}px" value={settings.radius[key]} onChange={(event) => updateRadius(key, event.target.value)} /></div>)}
                        </div>
                    </div>
                    <div className="theme-editor-section"><h4>Component Styles</h4><div className="row g-3">
                        <div className="col-md-6"><label className="form-label" htmlFor="theme-button-style">Button style</label><select id="theme-button-style" className="form-select" value={settings.components.buttonStyle} onChange={(event) => setSettings((current) => ({ ...current, components: { ...current.components, buttonStyle: event.target.value } }))}><option value="solid">Solid</option><option value="outline">Outline</option><option value="soft">Soft</option></select></div>
                        <div className="col-md-6"><label className="form-label" htmlFor="theme-card-style">Card style</label><select id="theme-card-style" className="form-select" value={settings.components.cardStyle} onChange={(event) => setSettings((current) => ({ ...current, components: { ...current.components, cardStyle: event.target.value } }))}><option value="flat">Flat</option><option value="bordered">Bordered</option><option value="elevated">Elevated</option></select></div>
                    </div></div>
                    <div className="d-flex justify-content-end gap-2 mt-4"><button className="btn btn-light" type="button" onClick={() => setSettings(cloneSettings(selected.settings?.settings))} disabled={saving}>Reset perubahan</button>
                        <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan Design Tokens'}</button></div>
                </form>
            </section>}
        {showPreview && selected && <ThemePreview name={selected.name} settings={settings} onClose={() => setShowPreview(false)} />}
        </AdminLayout>
    );
}
