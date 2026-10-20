import { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import api from '../api/client';
import './RichTextEditor.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faQuoteLeft,
    faLink,
    faLinkSlash,
    faImage,
    faFileImage
} from '@fortawesome/free-solid-svg-icons';
import MediaPicker from './MediaPicker';


export type EditorMedia = {
    id: number;
    url: string;
    path?: string;
    original_name: string;
    alt_text: string | null;
};

type Props = {
    value: string;
    onChange: (html: string) => void;
    mediaItems?: EditorMedia[];
    disabled?: boolean;
};

function getMediaUrl(media: EditorMedia): string {
    const rawUrl = media.url ||
        (media.path ? `/storage/${media.path.replace(/^\/+/, '')}` : '');

    if (!rawUrl) return '';

    if (/^https?:\/\//i.test(rawUrl)) {
        return rawUrl;
    }

    const base = (api.defaults.baseURL || window.location.origin)
        .replace(/\/api\/?$/, '')
        .replace(/\/+$/, '');

    return new URL(rawUrl, `${base}/`).toString();
}

export default function RichTextEditor({ value, onChange, 
mediaItems = [], disabled = false }: Props) {
    const [showMediaPicker, setShowMediaPicker] = useState(false);
    
    const editor = useEditor({
        extensions: [
            StarterKit,
            Link.configure({
                openOnClick: false,
                autolink: true,
                HTMLAttributes: {
                    rel: 'noopener noreferrer',
                },
            }),
            Image.configure({
                inline: false,
                allowBase64: false,
            }),
        ],
        content: value || '',
        editable: !disabled,
        onUpdate: ({ editor: currentEditor }) => {
            onChange(currentEditor.getHTML());
        },
        editorProps: {
            attributes: {
                'aria-label': 'Isi artikel',
                class: 'rich-text-area',
            },
        },
    });

    useEffect(() => {
        if (!editor) return;

        // Jangan memindahkan kursor jika konten sudah sama.
        if (editor.getHTML() !== (value || '')) {
            editor.commands.setContent(value || '', {
                emitUpdate: false,
            });
        }
    }, [editor, value]);

    useEffect(() => {
        editor?.setEditable(!disabled);
    }, [editor, disabled]);

    if (!editor) {
        return <div className="form-control">Memuat editor...</div>;
    }

    function addLink() {
        const current = editor.getAttributes('link').href as
            | string
            | undefined;

        const input = window.prompt('Masukkan URL tautan (https:// atau mailto:)', current || 'https://',);

        if (input === null) return;

        const url = input.trim();

        if (!url) {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
            return;
        }

        try {
            const parsed = new URL(url);

            if (!['http:', 'https:', 'mailto:', 'tel:'].includes(parsed.protocol)) {
                window.alert('Protokol tautan tidak diizinkan.');
                return;
            }

            editor.chain().focus().extendMarkRange('link')
                .setLink({ href: url })
                .run();
        } catch {
            window.alert('Masukkan URL yang valid, misalnya https://example.com.');
        }
    }

    function insertSelectedImage(media: EditorMedia) {
        const src = getMediaUrl(media);
    
        if (!src || !editor) return;
    
        editor.chain().focus().setImage({
            src,
            alt: media.alt_text || media.original_name,
            title: media.original_name,
        }).run();
    
        setShowMediaPicker(false);
    }

    function addImageByUrl() {
        const input = window.prompt('Masukkan URL gambar HTTPS:', 'https://');

        if (!input?.trim()) return;

        try {
            const url = new URL(input.trim());

            if (url.protocol !== 'https:' && url.protocol !== 'http:') {
                window.alert('URL gambar harus menggunakan HTTP atau HTTPS.');
                return;
            }

            editor.chain().focus().setImage({
                src: url.href,
                alt: '',
            }).run();
        } catch {
            window.alert('URL gambar tidak valid.');
        }
    }

    return (
        <div className={`rich-text-editor ${disabled ? 'is-disabled' : ''}`}>
            <div className="rich-text-toolbar" aria-label="Toolbar editor">
                <select
                    className="form-select form-select-sm toolbar-heading"
                    aria-label="Jenis heading"
                    disabled={disabled}
                    value={
                        editor.isActive('heading', { level: 1 }) ? '1' :
                        editor.isActive('heading', { level: 2 }) ? '2' :
                        editor.isActive('heading', { level: 3 }) ? '3' : 'p'
                    }
                    onChange={(event) => {
                        const level = event.target.value;

                        if (level === 'p') {
                            editor.chain().focus().setParagraph().run();
                        } else {
                            editor.chain().focus().setHeading({
                                level: Number(level) as 1 | 2 | 3,
                            }).run();
                        }
                    }}
                >
                    <option value="p">Paragraf</option>
                    <option value="1">Heading 1</option>
                    <option value="2">Heading 2</option>
                    <option value="3">Heading 3</option>
                </select>

                <ToolbarButton
                    label="Tebal"
                    title="Tebal"
                    active={editor.isActive('bold')}
                    disabled={disabled}
                    onClick={() => editor.chain().focus().toggleBold().run()}
                >
                    B
                </ToolbarButton>

                <ToolbarButton
                    label="Miring"
                    title="Miring"
                    active={editor.isActive('italic')}
                    disabled={disabled}
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                >
                    <em>I</em>
                </ToolbarButton>

                <ToolbarButton
                    label="Coret"
                    title="Coret"
                    active={editor.isActive('strike')}
                    disabled={disabled}
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                >
                    <s>S</s>
                </ToolbarButton>

                <ToolbarButton
                    label="Daftar bullet"
                    title="Daftar bullet"
                    active={editor.isActive('bulletList')}
                    disabled={disabled}
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                >
                    <i className="bi bi-list-ul"></i>
                </ToolbarButton>

                <ToolbarButton
                    label="Daftar bernomor"
                    title="Daftar bernomor"
                    active={editor.isActive('orderedList')}
                    disabled={disabled}
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                >
                    <i className="bi bi-list-ol"></i>
                </ToolbarButton>

                <ToolbarButton
                    label="Kutipan"
                    title="Kutipan"
                    active={editor.isActive('blockquote')}
                    disabled={disabled}
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                >
                    <FontAwesomeIcon icon={faQuoteLeft} />
                </ToolbarButton>

                <ToolbarButton
                    label="Tautan"
                    title="Tambah atau ubah tautan"
                    active={editor.isActive('link')}
                    disabled={disabled}
                    onClick={addLink}
                >
                    <FontAwesomeIcon icon={faLink} />
                </ToolbarButton>

                <ToolbarButton
                    label="Hapus tautan"
                    title="Hapus tautan"
                    disabled={disabled || !editor.isActive('link')}
                    onClick={() => editor.chain().focus().unsetLink().run()}
                >
                    <FontAwesomeIcon icon={faLinkSlash} />
                </ToolbarButton>
                
                <ToolbarButton
                    label="Sisipkan gambar dari Media"
                    title="Pilih gambar dari Media Library"
                    disabled={disabled || mediaItems.length === 0}
                    onClick={() => setShowMediaPicker(true)}
                >
                    <FontAwesomeIcon icon={faImage} />
                </ToolbarButton>

                <ToolbarButton
                    label="Sisipkan gambar melalui URL"
                    title="Sisipkan gambar melalui URL"
                    disabled={disabled}
                    onClick={addImageByUrl}
                >
                    <FontAwesomeIcon icon={faFileImage} />
                </ToolbarButton>

                <ToolbarButton
                    label="Hapus format"
                    title="Hapus format teks"
                    disabled={disabled}
                    onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
                >
                    Hapus format
                </ToolbarButton>
            </div>

            <EditorContent editor={editor} />

            <div className="rich-text-footer">
                Format isi artikel disimpan sebagai HTML. Gambar dari Media
                Library menggunakan URL media yang sudah tersedia.
                
                {showMediaPicker && (
                    <MediaPicker
                        items={mediaItems}
                        onSelect={insertSelectedImage}
                        onClose={() => setShowMediaPicker(false)}
                    />
                )}
            </div>
        </div>
    );
}

type ToolbarButtonProps = {
    label: string;
    title: string;
    active?: boolean;
    disabled?: boolean;
    onClick: () => void;
    children: React.ReactNode;
};

function ToolbarButton({ label, title, active = false, disabled = false, onClick, children }: ToolbarButtonProps) {
    return (
        <button
            type="button"
            className={`btn btn-sm ${active ? 'btn-primary' : 'btn-outline-secondary'}`}
            aria-label={label}
            aria-pressed={active}
            title={title}
            disabled={disabled}
            onMouseDown={(event) => event.preventDefault()}
            onClick={onClick}
        >
            {children}
        </button>
    );
}
