import { useState, type FormEvent } from 'react';
import axios from 'axios';
import api from '../api/client';

type Props = {
  onLogin: (token: string) => void;
};

export default function LoginPage({ onLogin }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/login', {
        email,
        password,
      });

      const token = response.data.data?.token;

      if (typeof token !== 'string' || !token) {
        throw new Error('Token autentikasi tidak ditemukan.');
      }

      onLogin(token);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(
          err.response?.data?.message ??
            'Login gagal. Periksa email dan kata sandi.',
        );
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Terjadi kesalahan saat login.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-brand">
          <span className="brand-mark">C</span>
          <div>
            <strong>ContentHub</strong>
            <small>Content Management System</small>
          </div>
        </div>

        <div className="login-heading">
          <h1>Selamat datang</h1>
          <p>Masuk untuk mengelola konten website Anda.</p>
        </div>

        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="login-email" className="form-label">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              className="form-control"
              autoComplete="username"
              placeholder="admin@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="mb-4">
            <label htmlFor="login-password" className="form-label">
              Kata sandi
            </label>
            <input
              id="login-password"
              type="password"
              className="form-control"
              autoComplete="current-password"
              placeholder="Masukkan kata sandi"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary w-100 login-submit"
            disabled={loading}
          >
            {loading ? 'Memverifikasi...' : 'Masuk ke Dashboard'}
          </button>
        </form>

        <p className="login-footer">
          ContentHub CMS · Akses khusus pengguna terotorisasi
        </p>
      </section>
    </main>
  );
}
