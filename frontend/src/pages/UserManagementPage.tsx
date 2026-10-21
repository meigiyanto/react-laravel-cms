import { useCallback, useEffect, useState, type FormEvent } from 'react';
import axios from 'axios';
import api from '../api/client';
import AdminLayout from '../components/AdminLayout';
import type { ActiveModule } from '../components/Sidebar';
import Pagination from '../components/Pagination';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUsers, faSearch, faUserPlus, faUserPen } from '@fortawesome/free-solid-svg-icons';

type RolesResponse = {
    success: boolean;
    data: Role[];
};

type Role = { id: number; name: string; slug: string };
type CmsUser = {
    id: number;
    name: string;
    email: string;
    role: Role | null;
    created_at: string;
};
type UserForm = { name: string; email: string; password: string; role_id: string };
type NavigationProps = { onNavigate: (module: ActiveModule) => void; onLogout: () => void };
type UserListResponse = {
    success: boolean;
    data: CmsUser[];
    meta: { current_page: number; last_page: number; per_page: number; total: number };
};

const emptyForm: UserForm = { name: '', email: '', password: '', role_id: '' };

function errorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
        const errors = error.response?.data?.errors;
        if (errors && typeof errors === 'object') {
            return Object.values(errors).flat().join(' ');
        }
        if (error.response?.status === 403) {
            return 'Akses ditolak. Hanya Administrator yang dapat mengelola pengguna.';
        }
        return error.response?.data?.message || 'Gagal menghubungi API.';
    }
    return 'Terjadi kesalahan yang tidak diketahui.';
}

function formatDate(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? '—'
        : date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function UserManagementPage({ onNavigate, onLogout }: NavigationProps) {
    const [users, setUsers] = useState<CmsUser[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [editing, setEditing] = useState<CmsUser | null>(null);
    const [form, setForm] = useState<UserForm>(emptyForm);
    const [showForm, setShowForm] = useState(false);

    const loadUsers = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const response = await api.get<UserListResponse>('/admin/users', {
                params: { page, per_page: 100, search: search.trim() || undefined },
            });
            const result = response.data;
            setUsers(result.data);
            setLastPage(result.meta.last_page);
            setTotal(result.meta.total);
            // Backend saat ini belum menyediakan GET /roles, jadi pilihan role
            // dikumpulkan dari metadata role pada akun yang dikembalikan API.
            setRoles((current) => {
                const discovered = new Map<number, Role>();
                current.forEach((role) => discovered.set(role.id, role));
                result.data.forEach((user) => {
                    if (user.role) discovered.set(user.role.id, user.role);
                });
                return [...discovered.values()].sort((a, b) => a.name.localeCompare(b.name));
            });
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setLoading(false);
        }
    }, [page, search]);

    useEffect(() => {
        const timer = window.setTimeout(() => void loadUsers(), 250);
        return () => window.clearTimeout(timer);
    }, [loadUsers]);
    
    useEffect(() => {
        let cancelled = false;
    
        async function loadRoles() {
            try {
                const response = await api.get<RolesResponse>('/admin/roles');
    
                if (!cancelled) {
                    setRoles(
                        response.data.data
                            .slice()
                            .sort((a, b) => a.name.localeCompare(b.name))
                    );
                }
            } catch (error) {
                if (!cancelled) {
                    setError(errorMessage(error));
                }
            }
        }
    
        void loadRoles();
    
        return () => {
            cancelled = true;
        };
    }, []);

    function openCreateForm() {
        setEditing(null);
        setForm({ ...emptyForm, role_id: roles[0] ? String(roles[0].id) : '' });
        setError('');
        setNotice('');
        setShowForm(true);
    }

    function openEditForm(user: CmsUser) {
        setEditing(user);
        setForm({
            name: user.name,
            email: user.email,
            password: '',
            role_id: user.role ? String(user.role.id) : '',
        });
        setError('');
        setNotice('');
        setShowForm(true);
    }

    async function saveUser(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSaving(true);
        setError('');
        setNotice('');
        try {
            if (editing) {
                await api.put(`/admin/users/${editing.id}`, {
                    name: form.name.trim(),
                    email: form.email.trim(),
                });
                if (form.role_id && Number(form.role_id) !== editing.role?.id) {
                    await api.put(`/admin/users/${editing.id}/role`, { role_id: Number(form.role_id) });
                }
                setNotice('Data pengguna berhasil diperbarui.');
            } else {
                await api.post('/users', {
                    name: form.name.trim(),
                    email: form.email.trim(),
                    password: form.password,
                    role_id: Number(form.role_id),
                });
                setNotice('Pengguna berhasil dibuat.');
            }
            setShowForm(false);
            setEditing(null);
            setForm(emptyForm);
            setPage(1);
            await loadUsers();
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setSaving(false);
        }
    }

    return (
        <AdminLayout
            active="users"
            onNavigate={onNavigate}
            onLogout={onLogout}
            title="Manajemen Pengguna"
            breadcrumb="Workspace / Pengaturan / Pengguna"
            actions={
                <button className="btn btn-primary" type="button" onClick={openCreateForm}>
                    <FontAwesomeIcon icon={faUserPlus} className="me-2" />Pengguna Baru
                </button>
            }
        >
            <section className="welcome-panel">
                <div>
                    <span className="eyebrow">USER MANAGEMENT</span>
                    <h2>Kelola akun dan role.</h2>
                    <p>Tambah pengguna, perbarui profil, dan atur kewenangan akses CMS.</p>
                </div>
                <div className="welcome-icon" aria-hidden="true"><FontAwesomeIcon icon={faUsers} /></div>
            </section>

            {error && <div className="alert alert-danger mt-3" role="alert">
                {error}
                <button className="btn-close float-end" type="button" aria-label="Tutup" onClick={() => setError('')} />
            </div>}
            {notice && <div className="alert alert-success mt-3" role="status">
                {notice}
                <button className="btn-close float-end" type="button" aria-label="Tutup" onClick={() => setNotice('')} />
            </div>}

            <section className="content-panel mt-4">
                <div className="panel-heading">
                    <div>
                        <h3>Daftar Pengguna</h3>
                        <p>Cari akun berdasarkan nama atau alamat email.</p>
                    </div>
                    <span className="total-badge">{total} pengguna</span>
                </div>
                <div className="toolbar">
                    <div className="search-box">
                        <span aria-hidden="true"><FontAwesomeIcon icon={faSearch} size="2xs" /></span>
                        <input
                            className="form-control"
                            type="search"
                            placeholder="Cari nama atau email..."
                            aria-label="Cari pengguna"
                            value={search}
                            onChange={(event) => { setSearch(event.target.value); setPage(1); }}
                        />
                    </div>
                </div>

                <div className="table-responsive">
                    <table className="table cms-table align-middle">
                        <thead><tr>
                            <th>PENGGUNA</th><th>ROLE</th><th>TERDAFTAR</th><th className="text-end">AKSI</th>
                        </tr></thead>
                        <tbody>
                            {loading ? <tr><td colSpan={4} className="empty-state">Memuat pengguna...</td></tr>
                                : users.length === 0 ? <tr><td colSpan={4} className="empty-state">
                                    <div className="empty-icon"><FontAwesomeIcon icon={faUsers} /></div>
                                    <strong>{search ? 'Pengguna tidak ditemukan' : 'Belum ada pengguna'}</strong>
                                    <p>Coba ubah kata kunci pencarian.</p>
                                </td></tr>
                                : users.map((user) => <tr key={user.id}>
                                    <td>
                                        <div className="post-title">{user.name}</div>
                                        <div className="post-slug">{user.email}</div>
                                    </td>
                                    <td>{user.role
                                        ? <span className="status-badge published">{user.role.name}</span>
                                        : <span className="status-badge archived">Belum ada role</span>}
                                    </td>
                                    <td className="date-cell">{formatDate(user.created_at)}</td>
                                    <td className="text-end">
                                        <button className="btn btn-sm btn-outline-primary" type="button" onClick={() => openEditForm(user)}>
                                            <FontAwesomeIcon icon={faUserPen} className="me-1" />Edit
                                        </button>
                                    </td>
                                </tr>)}
                        </tbody>
                    </table>
                </div>
                <Pagination
                    currentPage={page}
                    lastPage={lastPage}
                    total={total}
                    perPage={100}
                    loading={loading}
                    itemLabel="pengguna"
                    onPageChange={setPage}
                />
            </section>

            {showForm && <div className="modal-backdrop-custom" role="presentation" onMouseDown={(event) => {
                if (event.target === event.currentTarget && !saving) setShowForm(false);
            }}>
                <section className="editor-modal" role="dialog" aria-modal="true" aria-labelledby="user-form-title">
                    <div className="modal-heading">
                        <div>
                            <h2 id="user-form-title">{editing ? 'Edit Pengguna' : 'Tambah Pengguna'}</h2>
                            <p>{editing ? 'Perbarui profil atau role akun.' : 'Buat akun baru untuk mengakses CMS.'}</p>
                        </div>
                        <button className="btn-close" type="button" aria-label="Tutup" disabled={saving} onClick={() => setShowForm(false)} />
                    </div>
                    {roles.length === 0 && <div className="alert alert-warning">
                        Role belum dapat dimuat dari pengguna yang ada. Backend perlu menyediakan endpoint daftar role untuk pilihan lengkap.
                    </div>}
                    <form onSubmit={(event) => void saveUser(event)}>
                        <div className="mb-3">
                            <label className="form-label" htmlFor="user-name">Nama</label>
                            <input id="user-name" className="form-control" required maxLength={255} value={form.name}
                                onChange={(event) => setForm({ ...form, name: event.target.value })} />
                        </div>
                        <div className="mb-3">
                            <label className="form-label" htmlFor="user-email">Email</label>
                            <input id="user-email" className="form-control" type="email" required maxLength={255} value={form.email}
                                onChange={(event) => setForm({ ...form, email: event.target.value })} />
                        </div>
                        {!editing && <div className="mb-3">
                            <label className="form-label" htmlFor="user-password">Kata sandi sementara</label>
                            <input id="user-password" className="form-control" type="password" required minLength={8} maxLength={255}
                                autoComplete="new-password" value={form.password}
                                onChange={(event) => setForm({ ...form, password: event.target.value })} />
                        </div>}
                        <div className="mb-4">
                            <label className="form-label" htmlFor="user-role">Role</label>
                            <select id="user-role" className="form-select" required value={form.role_id}
                                onChange={(event) => setForm({ ...form, role_id: event.target.value })}>
                                <option value="" disabled>Pilih role</option>
                                {roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
                            </select>
                            <div className="form-text">Pilihan berasal dari role yang sudah digunakan akun yang dimuat.</div>
                        </div>
                        <div className="modal-actions">
                            <button className="btn btn-light" type="button" disabled={saving} onClick={() => setShowForm(false)}>Batal</button>
                            <button className="btn btn-primary" type="submit" disabled={saving || !form.role_id}>
                                {saving ? 'Menyimpan...' : editing ? 'Simpan Perubahan' : 'Buat Pengguna'}
                            </button>
                        </div>
                    </form>
                </section>
            </div>}
        </AdminLayout>
    );
}
