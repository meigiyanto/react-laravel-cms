import { useEffect, useState, type FormEvent } from 'react';
import axios from 'axios';
import api from '../api/client';
import AdminLayout from '../components/AdminLayout';
import { useAuthProfile, type AuthProfile } from '../auth/AuthProfileContext';
import type { ActiveModule } from '../components/Sidebar';

type ProfilePageProps = {
    onNavigate: (module: ActiveModule) => void;
    onLogout: () => void;
    onProfileUpdated: (updated: Partial<AuthProfile>) => void;
};

function getPhotoUrl(path?: string | null): string | null {
    if (!path) return null;
    if (/^https?:\/\//i.test(path)) return path;

    const base = (api.defaults.baseURL || window.location.origin)
        .replace(/\/api\/?$/, '')
        .replace(/\/+$/, '');

    return new URL(path, `${base}/`).toString();
}

function getErrorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
        const errors = error.response?.data?.errors;

        if (errors && typeof errors === 'object') {
            return Object.values(errors)
                .flat()
                .join(' ');
        }

        return error.response?.data?.message
            || 'Gagal menyimpan profil.';
    }

    return 'Terjadi kesalahan yang tidak diketahui.';
}

export default function ProfilePage({
    onNavigate,
    onLogout,
    onProfileUpdated,
}: ProfilePageProps) {
    const profile = useAuthProfile();

    const [name, setName] = useState(profile?.name ?? '');
    const [photo, setPhoto] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newPasswordConfirmation, setNewPasswordConfirmation] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    useEffect(() => {
        if (!photo) {
            setPreview(null);
            return;
        }

        const objectUrl = URL.createObjectURL(photo);
        setPreview(objectUrl);

        return () => URL.revokeObjectURL(objectUrl);
    }, [photo]);

    async function saveProfile(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSaving(true);
        setError('');
        setNotice('');

        try {
            const payload = new FormData();
            payload.append('name', name.trim());

            if (photo) {
                payload.append('photo', photo);
            }

            if (currentPassword || newPassword || newPasswordConfirmation) {
                payload.append('current_password', currentPassword);
                payload.append('new_password', newPassword);
                payload.append(
                    'new_password_confirmation',
                    newPasswordConfirmation,
                );
            }

            const response = await api.post('/profile', payload);
            const data = response.data.data;

            onProfileUpdated({
                name: data.name,
                profile_photo_url: data.profile_photo_url ?? null,
            });

            setName(data.name);
            setPhoto(null);
            setCurrentPassword('');
            setNewPassword('');
            setNewPasswordConfirmation('');
            setNotice(response.data.message || 'Profil berhasil diperbarui.');
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setSaving(false);
        }
    }

    const photoUrl = getPhotoUrl(profile?.profile_photo_url);
    const displayedPhoto = preview || photoUrl;

    return (
        <AdminLayout
            active="profile"
            onNavigate={onNavigate}
            onLogout={onLogout}
            title="Profil Saya"
            breadcrumb="Akun / Profil Saya"
        >
            <div className="container-fluid py-4">
                <div className="row justify-content-center">
                    <div className="col-12 col-xl-8">
                        {error && (
                            <div className="alert alert-danger" role="alert">
                                {error}
                            </div>
                        )}

                        {notice && (
                            <div className="alert alert-success" role="status">
                                {notice}
                            </div>
                        )}

                        <form onSubmit={saveProfile}>
                            <section className="card border-0 shadow-sm mb-4">
                                <div className="card-body p-4">
                                    <h2 className="h5 mb-4">Informasi Profil</h2>

                                    <div className="d-flex align-items-center gap-3 mb-4">
                                        {displayedPhoto ? (
                                            <img
                                                src={displayedPhoto}
                                                alt="Foto profil"
                                                className="rounded-circle border"
                                                style={{
                                                    width: 96,
                                                    height: 96,
                                                    objectFit: 'cover',
                                                }}
                                            />
                                        ) : (
                                            <div
                                                className="rounded-circle bg-light border d-flex align-items-center justify-content-center"
                                                style={{
                                                    width: 96,
                                                    height: 96,
                                                    fontSize: 32,
                                                }}
                                                aria-label="Belum ada foto profil"
                                            >
                                                <i className="bi bi-person" />
                                            </div>
                                        )}

                                        <div className="flex-grow-1">
                                            <label
                                                htmlFor="profile-photo"
                                                className="form-label"
                                            >
                                                Foto profil
                                            </label>
                                            <input
                                                id="profile-photo"
                                                type="file"
                                                className="form-control"
                                                accept="image/jpeg,image/png,image/webp"
                                                disabled={saving}
                                                onChange={(event) => {
                                                    const file =
                                                        event.currentTarget.files?.[0] ?? null;

                                                    setPhoto(file);
                                                }}
                                            />
                                            <small className="text-muted">
                                                JPG, PNG, atau WebP. Maksimal 2 MB.
                                            </small>
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <label
                                            htmlFor="profile-name"
                                            className="form-label"
                                        >
                                            Nama
                                        </label>
                                        <input
                                            id="profile-name"
                                            type="text"
                                            className="form-control"
                                            maxLength={255}
                                            required
                                            value={name}
                                            disabled={saving}
                                            onChange={(event) =>
                                                setName(event.target.value)
                                            }
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <label
                                            htmlFor="profile-email"
                                            className="form-label"
                                        >
                                            Email
                                        </label>
                                        <input
                                            id="profile-email"
                                            type="email"
                                            className="form-control"
                                            value={profile?.email ?? ''}
                                            readOnly
                                        />
                                        <small className="text-muted">
                                            Email tidak diubah melalui formulir ini.
                                        </small>
                                    </div>
                                </div>
                            </section>

                            <section className="card border-0 shadow-sm mb-4">
                                <div className="card-body p-4">
                                    <h2 className="h5 mb-2">Ganti Kata Sandi</h2>
                                    <p className="text-muted small">
                                        Kosongkan bagian ini jika tidak ingin
                                        mengganti kata sandi.
                                    </p>

                                    <div className="mb-3">
                                        <label
                                            htmlFor="profile-current-password"
                                            className="form-label"
                                        >
                                            Kata sandi saat ini
                                        </label>
                                        <input
                                            id="profile-current-password"
                                            type="password"
                                            autoComplete="current-password"
                                            className="form-control"
                                            value={currentPassword}
                                            disabled={saving}
                                            onChange={(event) =>
                                                setCurrentPassword(event.target.value)
                                            }
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <label
                                            htmlFor="profile-new-password"
                                            className="form-label"
                                        >
                                            Kata sandi baru
                                        </label>
                                        <input
                                            id="profile-new-password"
                                            type="password"
                                            autoComplete="new-password"
                                            className="form-control"
                                            minLength={8}
                                            value={newPassword}
                                            disabled={saving}
                                            onChange={(event) =>
                                                setNewPassword(event.target.value)
                                            }
                                        />
                                        <small className="text-muted">
                                            Minimal 8 karakter.
                                        </small>
                                    </div>

                                    <div className="mb-3">
                                        <label
                                            htmlFor="profile-new-password-confirmation"
                                            className="form-label"
                                        >
                                            Konfirmasi kata sandi baru
                                        </label>
                                        <input
                                            id="profile-new-password-confirmation"
                                            type="password"
                                            autoComplete="new-password"
                                            className="form-control"
                                            value={newPasswordConfirmation}
                                            disabled={saving}
                                            onChange={(event) =>
                                                setNewPasswordConfirmation(
                                                    event.target.value,
                                                )
                                            }
                                        />
                                    </div>
                                </div>
                            </section>

                            <div className="d-flex justify-content-end mb-4">
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={saving || !name.trim()}
                                >
                                    {saving ? 'Menyimpan...' : 'Simpan Profil'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
