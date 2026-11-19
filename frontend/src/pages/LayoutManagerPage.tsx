import { useCallback, useEffect, useMemo, useState, type DragEvent, type FormEvent } from 'react';
import axios from 'axios';
import api from '../api/client';
import AdminLayout from '../components/AdminLayout';
import type { ActiveModule } from '../components/Sidebar';
import MediaPicker from '../components/MediaPicker';
import type { EditorMedia } from '../components/RichTextEditor';

type SectionType = 'container' | 'hero' | 'content' | 'grid' | 'columns' | 'cta';
type BlockType = 'heading' | 'text' | 'image' | 'button' | 'spacer';
type Settings = Record<string, string>;
type Block = { id: string; type: BlockType; content: string; media_id?: number | null; settings: Settings };
type Section = { id: string; type: SectionType; settings: Settings; blocks: Block[] };
type Definition = { version: 1; sections: Section[] };
type Layout = { id: number; name: string; slug: string; description: string | null; status: string; definition: Definition; revisions_count?: number; updated_at: string };
type Revision = { id: number; revision_number: number; created_at: string; user?: { name: string } };
type Props = { onNavigate: (module: ActiveModule) => void; onLogout: () => void };
type Device = 'desktop' | 'tablet' | 'mobile';

const sectionTypes: Array<{ value: SectionType; label: string }> = [{ value: 'container', label: 'Container' }, { value: 'hero', label: 'Hero' }, { value: 'content', label: 'Content' }, { value: 'grid', label: 'Grid' }, { value: 'columns', label: 'Columns' }, { value: 'cta', label: 'Call to action' }];
const blockTypes: Array<{ value: BlockType; label: string }> = [{ value: 'heading', label: 'Heading' }, { value: 'text', label: 'Text' }, { value: 'image', label: 'Image' }, { value: 'button', label: 'Button' }, { value: 'spacer', label: 'Spacer' }];
const makeId = (prefix: string) => prefix + '-' + Math.random().toString(36).slice(2, 10);
const makeBlock = (type: BlockType): Block => ({ id: makeId('block'), type, content: type === 'heading' ? 'Judul baru' : type === 'text' ? 'Tulis konten di sini.' : type === 'button' ? 'Pelajari lebih lanjut' : '', ...(type === 'image' ? { media_id: null } : {}), settings: { ...(type === 'heading' || type === 'text' ? { align: 'left' } : {}), ...(type === 'heading' ? { size: 'large' } : type === 'text' ? { size: 'medium' } : {}), ...(type === 'button' ? { variant: 'primary', url: '', target: '_self' } : {}) } });
const makeSection = (type: SectionType = 'container'): Section => ({ id: makeId('section'), type, settings: { width: 'default', spacing: 'medium', background: 'default' }, blocks: [] });
const starter: Definition = { version: 1, sections: [{ id: 'section-main', type: 'container', settings: { width: 'default', spacing: 'medium', background: 'default' }, blocks: [{ id: 'block-heading', type: 'heading', content: 'Bangun halaman yang menarik', settings: { align: 'left', size: 'large' } }, { id: 'block-text', type: 'text', content: 'Susun konten dengan menambahkan komponen dari panel editor.', settings: { align: 'left', size: 'medium' } }] }] };
function errorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) { const errors = error.response?.data?.errors; if (errors && typeof errors === 'object') return Object.values(errors).flat().join(' '); return error.response?.data?.message || 'Gagal menghubungi API.'; }
    return 'Terjadi kesalahan yang tidak diketahui.';
}
function moveItem<T>(items: T[], from: number, to: number): T[] {
    if (to < 0 || to >= items.length || from < 0 || from >= items.length || from === to) return items;
    const next = [...items]; const [item] = next.splice(from, 1); next.splice(to, 0, item); return next;
}
const isHttpUrl = (value: string) => /^https?:\/\//i.test(value.trim());

export default function LayoutManagerPage({ onNavigate, onLogout }: Props) {
    const [layouts, setLayouts] = useState<Layout[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState<Layout | null>(null);
    const [showEditor, setShowEditor] = useState(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState('draft');
    const [definition, setDefinition] = useState<Definition>(starter);
    const [sectionId, setSectionId] = useState<string | null>(starter.sections[0].id);
    const [blockId, setBlockId] = useState<string | null>(starter.sections[0].blocks[0].id);
    const [device, setDevice] = useState<Device>('desktop');
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [revisions, setRevisions] = useState<Revision[]>([]);
    const [mediaItems, setMediaItems] = useState<EditorMedia[]>([]);
    const [showMediaPicker, setShowMediaPicker] = useState(false);
    const [dragSection, setDragSection] = useState<number | null>(null);
    const [dragBlock, setDragBlock] = useState<number | null>(null);
    const selectedSection = useMemo(() => definition.sections.find((item) => item.id === sectionId) ?? null, [definition, sectionId]);
    const selectedBlock = useMemo(() => selectedSection?.blocks.find((item) => item.id === blockId) ?? null, [selectedSection, blockId]);

    const loadLayouts = useCallback(async () => {
        try { const response = await api.get('/admin/layouts'); setLayouts(response.data.data.data || []); }
        catch (err) { setError(errorMessage(err)); } finally { setLoading(false); }
    }, []);
    useEffect(() => {
        let active = true;
        api.get('/admin/layouts').then((response) => { if (active) setLayouts(response.data.data.data || []); }).catch((err: unknown) => { if (active) setError(errorMessage(err)); }).finally(() => { if (active) setLoading(false); });
        api.get('/media', { params: { per_page: 100 } }).then((response) => { if (active) setMediaItems((response.data.data.data || []).filter((item: EditorMedia & { mime_type?: string }) => !item.mime_type || item.mime_type.startsWith('image/'))); }).catch(() => { if (active) setMediaItems([]); });
        return () => { active = false; };
    }, []);
    function openCreate() {
        setEditing(null); setName(''); setDescription(''); setStatus('draft'); setDefinition(starter); setSectionId(starter.sections[0].id); setBlockId(starter.sections[0].blocks[0].id); setRevisions([]); setError(''); setDevice('desktop'); setShowEditor(true);
    }
    async function openEdit(layout: Layout) {
        setEditing(layout); setName(layout.name); setDescription(layout.description || ''); setStatus(layout.status); setDefinition(layout.definition);
        setSectionId(layout.definition.sections[0]?.id ?? null); setBlockId(layout.definition.sections[0]?.blocks[0]?.id ?? null); setRevisions([]); setError(''); setDevice('desktop'); setShowEditor(true);
        try { const response = await api.get('/admin/layouts/' + layout.id + '/revisions'); setRevisions(response.data.data.data || []); } catch (err) { setError(errorMessage(err)); }
    }
    function updateSection(id: string, fn: (item: Section) => Section) { setDefinition((current) => ({ ...current, sections: current.sections.map((item) => item.id === id ? fn(item) : item) })); }
    function updateBlock(sid: string, bid: string, fn: (item: Block) => Block) { updateSection(sid, (section) => ({ ...section, blocks: section.blocks.map((item) => item.id === bid ? fn(item) : item) })); }
    function addSection(type: SectionType) { const item = makeSection(type); setDefinition((current) => ({ ...current, sections: [...current.sections, item] })); setSectionId(item.id); setBlockId(null); }
    function addBlock(type: BlockType) { if (!selectedSection) return; const item = makeBlock(type); updateSection(selectedSection.id, (section) => ({ ...section, blocks: [...section.blocks, item] })); setBlockId(item.id); }
    function deleteSection(id: string) { const next = definition.sections.filter((item) => item.id !== id); setDefinition((current) => ({ ...current, sections: next })); setSectionId(next[0]?.id ?? null); setBlockId(next[0]?.blocks[0]?.id ?? null); }
    function deleteBlock(sid: string, bid: string) { const next = (definition.sections.find((item) => item.id === sid)?.blocks ?? []).filter((item) => item.id !== bid); updateSection(sid, (item) => ({ ...item, blocks: next })); setBlockId(next[0]?.id ?? null); }
    function reorderSections(from: number, to: number) { setDefinition((current) => ({ ...current, sections: moveItem(current.sections, from, to) })); }
    function reorderBlocks(sid: string, from: number, to: number) { updateSection(sid, (item) => ({ ...item, blocks: moveItem(item.blocks, from, to) })); }
    function dropSection(event: DragEvent<HTMLDivElement>, index: number) { event.preventDefault(); if (dragSection !== null) reorderSections(dragSection, index); setDragSection(null); }
    function dropBlock(event: DragEvent<HTMLDivElement>, index: number, sid: string) { event.preventDefault(); event.stopPropagation(); if (dragBlock !== null) reorderBlocks(sid, dragBlock, index); setDragBlock(null); }
    async function save(event: FormEvent<HTMLFormElement>) {
        event.preventDefault(); setError('');
        const blocks = definition.sections.reduce((sum, item) => sum + item.blocks.length, 0);
        if (definition.sections.length > 50 || blocks > 200) { setError('Batas schema terlampaui: maksimal 50 section dan 200 block.'); return; }
        setSaving(true);
        try {
            const payload = { name: name.trim(), description: description.trim() || null, status, definition };
            if (editing) await api.put('/admin/layouts/' + editing.id, payload); else await api.post('/admin/layouts', payload);
            setNotice(editing ? 'Layout berhasil diperbarui.' : 'Layout berhasil dibuat.'); setShowEditor(false); setEditing(null); await loadLayouts();
        } catch (err) { setError(errorMessage(err)); } finally { setSaving(false); }
    }
    async function remove(layout: Layout) {
        if (!window.confirm('Hapus layout "' + layout.name + '" beserta riwayat revisinya?')) return;
        try { await api.delete('/admin/layouts/' + layout.id); setNotice('Layout berhasil dihapus.'); await loadLayouts(); } catch (err) { setError(errorMessage(err)); }
    }

    return <AdminLayout active="layouts" onNavigate={onNavigate} onLogout={onLogout} title="Layout Manager" breadcrumb="Workspace / Design / Layout Manager" actions={<button type="button" className="btn btn-primary" onClick={openCreate}>Layout Baru</button>}>
        <div className="container-fluid py-4">
            <section className="welcome-panel"><div><span className="eyebrow">VISUAL LAYOUT BUILDER</span><h2>Rancang halaman secara visual.</h2><p>Susun section dan block, atur properti komponen, lalu lihat pratinjau responsif sebelum menyimpan.</p></div></section>
            {error && !showEditor && <div className="alert alert-danger mt-3" role="alert">{error}</div>}{notice && <div className="alert alert-success mt-3" role="status">{notice}</div>}
            <section className="content-panel mt-4"><div className="panel-heading"><div><h3>Daftar Layout</h3><p>Layout tersimpan belum otomatis diterapkan ke halaman publik.</p></div><span className="total-badge">{layouts.length} layout</span></div>
                <div className="table-responsive"><table className="table cms-table align-middle"><thead><tr><th>Nama</th><th>Status</th><th>Revisi</th><th>Diperbarui</th><th className="text-end">Aksi</th></tr></thead><tbody>
                    {loading ? <tr><td colSpan={5} className="empty-state">Memuat layout...</td></tr> : layouts.length === 0 ? <tr><td colSpan={5} className="empty-state">Belum ada layout. Buat layout pertama untuk memulai.</td></tr> : layouts.map((layout) => <tr key={layout.id}><td><strong>{layout.name}</strong><div className="post-slug">{layout.slug}</div></td><td><span className={'status-badge ' + layout.status}>{layout.status}</span></td><td>{layout.revisions_count ?? 0}</td><td>{new Date(layout.updated_at).toLocaleDateString('id-ID')}</td><td><div className="d-flex justify-content-end gap-2"><button className="btn btn-sm btn-outline-primary" type="button" onClick={() => void openEdit(layout)}>Buka Editor</button><button className="btn btn-sm btn-outline-danger" type="button" onClick={() => void remove(layout)}>Hapus</button></div></td></tr>)}
                </tbody></table></div>
            </section>
            {showEditor && <div className="visual-editor-overlay"><form className="visual-editor-shell" onSubmit={save}>
                <header className="visual-editor-topbar"><div className="visual-editor-title"><button type="button" className="btn btn-light btn-sm" onClick={() => setShowEditor(false)}>← Kembali</button><div><strong>{editing ? 'Edit Layout' : 'Layout Baru'}</strong><small>Editor visual · Schema v1</small></div></div><button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan Layout'}</button></header>
                {error && <div className="alert alert-danger m-3 mb-0">{error}</div>}
                <div className="visual-editor-meta"><div><label htmlFor="visual-name">Nama layout</label><input id="visual-name" className="form-control form-control-sm" required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} /></div><div><label htmlFor="visual-description">Deskripsi</label><input id="visual-description" className="form-control form-control-sm" maxLength={2000} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Deskripsi (opsional)" /></div><div><label htmlFor="visual-layout-status">Status layout</label><select id="visual-layout-status" className="form-select form-select-sm" value={status} onChange={(event) => setStatus(event.target.value)}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></div></div>
                <div className="visual-editor-workspace">
                    <aside className="visual-toolbox"><div className="visual-panel-heading"><strong>Struktur halaman</strong><span>{definition.sections.length}/50</span></div><div className="visual-add-group"><small>Tambah section</small><div className="visual-add-grid">{sectionTypes.map((item) => <button type="button" key={item.value} onClick={() => addSection(item.value)}>＋ {item.label}</button>)}</div></div>
                        <div className="visual-section-list">{definition.sections.map((section, index) => <div key={section.id} draggable className={'visual-section-item ' + (sectionId === section.id ? 'active' : '')} onDragStart={() => setDragSection(index)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => dropSection(event, index)} onClick={() => { setSectionId(section.id); setBlockId(null); }}><span className="visual-drag-handle">⠿</span><span className="visual-section-name"><strong>{sectionTypes.find((item) => item.value === section.type)?.label}</strong><small>{section.blocks.length} block</small></span><span className="visual-item-actions"><button type="button" onClick={(event) => { event.stopPropagation(); reorderSections(index, index - 1); }}>↑</button><button type="button" onClick={(event) => { event.stopPropagation(); reorderSections(index, index + 1); }}>↓</button></span></div>)}{definition.sections.length === 0 && <p className="visual-empty">Tambahkan section untuk mulai.</p>}</div>
                        {selectedSection && <div className="visual-add-group"><small>Tambah block</small><div className="visual-add-grid">{blockTypes.map((item) => <button type="button" key={item.value} onClick={() => addBlock(item.value)}>＋ {item.label}</button>)}</div></div>}
                    </aside>
                    <main className="visual-preview-area"><div className="visual-preview-toolbar"><span>Live preview</span><div className="btn-group btn-group-sm">{(['desktop', 'tablet', 'mobile'] as Device[]).map((item) => <button type="button" key={item} className={'btn ' + (device === item ? 'btn-primary' : 'btn-outline-secondary')} onClick={() => setDevice(item)}>{item[0].toUpperCase() + item.slice(1)}</button>)}</div></div>
                        <div className="visual-preview-scroll"><div className={'visual-page-preview ' + device}>{definition.sections.map((section, index) => <section key={section.id} className={'visual-render-section section-' + section.type + (sectionId === section.id ? ' selected' : '')} onClick={() => { setSectionId(section.id); setBlockId(null); }}><div className="visual-render-section-label">{section.type} · {index + 1}</div><div className={'visual-render-inner width-' + (section.settings.width || 'default') + ' spacing-' + (section.settings.spacing || 'medium') + ' background-' + (section.settings.background || 'default')}>
                            {section.blocks.map((block, blockIndex) => <div key={block.id} draggable className={'visual-render-block block-' + block.type + (blockId === block.id ? ' selected' : '')} onDragStart={(event) => { event.stopPropagation(); setSectionId(section.id); setDragBlock(blockIndex); }} onDragOver={(event) => event.preventDefault()} onDrop={(event) => dropBlock(event, blockIndex, section.id)} onClick={(event) => { event.stopPropagation(); setSectionId(section.id); setBlockId(block.id); }}>
                                {block.type === 'heading' && <div className={'preview-heading size-' + (block.settings.size || 'large') + ' align-' + (block.settings.align || 'left')}>{block.content || 'Judul'}</div>}
                                {block.type === 'text' && <p className={'preview-text size-' + (block.settings.size || 'medium') + ' align-' + (block.settings.align || 'left')}>{block.content || 'Teks paragraf'}</p>}
                                {block.type === 'image' && (() => { const media = mediaItems.find((item) => item.id === block.media_id); const src = media?.url || block.content; return src && (media || isHttpUrl(src)) ? <img className="preview-image" src={src} alt={media?.alt_text || 'Preview'} /> : <div className="preview-image-placeholder">Pilih gambar dari Media Library.</div>; })()}
                                {block.type === 'button' && <button type="button" className={'preview-button variant-' + (block.settings.variant || 'primary')}>{block.content || 'Tombol'}</button>}
                                {block.type === 'spacer' && <div className="preview-spacer">Spacer</div>}
                            </div>)}{section.blocks.length === 0 && <div className="visual-section-placeholder">Section kosong · tambahkan block</div>}</div></section>)}{definition.sections.length === 0 && <div className="visual-canvas-empty">Canvas kosong. Tambahkan section dari panel kiri.</div>}</div></div>
                    </main>
                    <aside className="visual-properties"><div className="visual-panel-heading"><strong>Properti</strong><span>{selectedBlock ? 'Block' : selectedSection ? 'Section' : '—'}</span></div>
                        {selectedBlock && selectedSection ? <div className="visual-properties-body">
                            <div className="visual-property-group"><label>Jenis block</label><select className="form-select form-select-sm" value={selectedBlock.type} onChange={(event) => { const type = event.target.value as BlockType; updateBlock(selectedSection.id, selectedBlock.id, (item) => ({ ...makeBlock(type), id: item.id })); }}>{blockTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
                            {selectedBlock.type === 'image' ? <div className="visual-property-group"><label>Gambar</label>{(() => { const media = mediaItems.find((item) => item.id === selectedBlock.media_id); return media ? <div className="mb-2"><img src={media.url} alt={media.alt_text || media.original_name} style={{ width: '100%', maxHeight: 140, objectFit: 'contain' }} /><small className="d-block text-muted">{media.original_name}</small></div> : <small className="d-block text-muted mb-2">Belum ada gambar yang dipilih.</small>; })()}<button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setShowMediaPicker(true)}>Pilih dari Media Library</button><button type="button" className="btn btn-sm btn-link text-danger" disabled={!selectedBlock.media_id} onClick={() => updateBlock(selectedSection.id, selectedBlock.id, (item) => ({ ...item, media_id: null, content: '' }))}>Hapus gambar</button></div> : selectedBlock.type !== 'spacer' && <div className="visual-property-group"><label htmlFor="visual-content">Konten</label><textarea id="visual-content" className="form-control form-control-sm" rows={3} maxLength={5000} value={selectedBlock.content} onChange={(event) => updateBlock(selectedSection.id, selectedBlock.id, (item) => ({ ...item, content: event.target.value }))} /></div>}
                            {(selectedBlock.type === 'heading' || selectedBlock.type === 'text') && <><div className="visual-property-group"><label>Perataan</label><select className="form-select form-select-sm" value={selectedBlock.settings.align || 'left'} onChange={(event) => updateBlock(selectedSection.id, selectedBlock.id, (item) => ({ ...item, settings: { ...item.settings, align: event.target.value } }))}><option value="left">Kiri</option><option value="center">Tengah</option><option value="right">Kanan</option></select></div><div className="visual-property-group"><label>Ukuran</label><select className="form-select form-select-sm" value={selectedBlock.settings.size || 'medium'} onChange={(event) => updateBlock(selectedSection.id, selectedBlock.id, (item) => ({ ...item, settings: { ...item.settings, size: event.target.value } }))}><option value="small">Kecil</option><option value="medium">Sedang</option><option value="large">Besar</option></select></div></>}
                            {selectedBlock.type === 'button' && <><div className="visual-property-group"><label>Varian tombol</label><select className="form-select form-select-sm" value={selectedBlock.settings.variant || 'primary'} onChange={(event) => updateBlock(selectedSection.id, selectedBlock.id, (item) => ({ ...item, settings: { ...item.settings, variant: event.target.value } }))}><option value="default">Default</option><option value="primary">Primary</option><option value="secondary">Secondary</option><option value="outline">Outline</option></select></div><div className="visual-property-group"><label htmlFor="visual-button-url">URL tujuan</label><input id="visual-button-url" className="form-control form-control-sm" type="text" maxLength={2048} placeholder="/kontak atau https://example.com" value={selectedBlock.settings.url || ''} onChange={(event) => updateBlock(selectedSection.id, selectedBlock.id, (item) => ({ ...item, settings: { ...item.settings, url: event.target.value } }))} /><small>HTTP(S), mailto, tel, atau path internal.</small></div><div className="visual-property-group"><label>Target tautan</label><select className="form-select form-select-sm" value={selectedBlock.settings.target || '_self'} onChange={(event) => updateBlock(selectedSection.id, selectedBlock.id, (item) => ({ ...item, settings: { ...item.settings, target: event.target.value } }))}><option value="_self">Tab yang sama</option><option value="_blank">Tab baru</option></select></div></>}
                            <button type="button" className="btn btn-sm btn-outline-danger mt-3" onClick={() => deleteBlock(selectedSection.id, selectedBlock.id)}>Hapus block</button>
                        </div> : selectedSection ? <div className="visual-properties-body">
                            <div className="visual-property-group"><label>Jenis section</label><select className="form-select form-select-sm" value={selectedSection.type} onChange={(event) => updateSection(selectedSection.id, (item) => ({ ...item, type: event.target.value as SectionType }))}>{sectionTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
                            <div className="visual-property-group"><label>Lebar</label><select className="form-select form-select-sm" value={selectedSection.settings.width || 'default'} onChange={(event) => updateSection(selectedSection.id, (item) => ({ ...item, settings: { ...item.settings, width: event.target.value } }))}><option value="default">Default</option><option value="wide">Wide</option><option value="full">Full width</option></select></div>
                            <div className="visual-property-group"><label>Spacing</label><select className="form-select form-select-sm" value={selectedSection.settings.spacing || 'medium'} onChange={(event) => updateSection(selectedSection.id, (item) => ({ ...item, settings: { ...item.settings, spacing: event.target.value } }))}><option value="none">None</option><option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option></select></div>
                            <div className="visual-property-group"><label>Background</label><select className="form-select form-select-sm" value={selectedSection.settings.background || 'default'} onChange={(event) => updateSection(selectedSection.id, (item) => ({ ...item, settings: { ...item.settings, background: event.target.value } }))}><option value="default">Default</option><option value="surface">Surface</option><option value="primary">Primary</option><option value="secondary">Secondary</option><option value="accent">Accent</option></select></div>
                            <button type="button" className="btn btn-sm btn-outline-danger mt-3" onClick={() => deleteSection(selectedSection.id)}>Hapus section</button>
                        </div> : <p className="visual-empty p-3">Pilih section atau block pada canvas.</p>}
                    </aside>
                </div>
                {editing && <footer className="visual-revision-footer"><strong>Riwayat revisi</strong>{revisions.length === 0 ? <span>Belum ada revisi.</span> : revisions.map((item) => <span key={item.id}>#{item.revision_number} · {item.user?.name || 'Pengguna'} · {new Date(item.created_at).toLocaleString('id-ID')}</span>)}</footer>}
            </form>{showMediaPicker && <MediaPicker items={mediaItems} onSelect={(media) => { if (selectedSection && selectedBlock?.type === 'image') updateBlock(selectedSection.id, selectedBlock.id, (item) => ({ ...item, media_id: media.id, content: '' })); setShowMediaPicker(false); }} onClose={() => setShowMediaPicker(false)} />}</div>}
            </form></div>}
        </div>
    </AdminLayout>;
}
