import { NavLink, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, useState, type FormEvent } from 'react';

export default function Header() {
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [searchParams] = useSearchParams();
    const currentQuery = searchParams.get('q') || '';
    const navigate = useNavigate();

    useEffect(() => {
        setSearch(currentQuery);
    }, [currentQuery]);

    useEffect(() => {
        document.body.classList.toggle(
            'mobile-nav-active',
            mobileNavOpen,
        );

        return () => {
            document.body.classList.remove('mobile-nav-active');
        };
    }, [mobileNavOpen]);

    function closeMobileNav() {
        setMobileNavOpen(false);
    }

    function handleSearch(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const query = search.trim();

        if (!query) {
            navigate('/artikel');
            closeMobileNav();
            return;
        }

        navigate(`/artikel?q=${encodeURIComponent(query)}`);
        closeMobileNav();
    }

    return (
        <header id="header" className="header position-relative">
            <div className="container-fluid container-xl position-relative">
                <div className="top-row d-flex align-items-center justify-content-between gap-3">
                    <Link to="/" className="logo d-flex align-items-center">
                        <h1 className="sitename mb-0">ContentHub</h1>
                    </Link>

                    <div className="d-flex align-items-center justify-content-end gap-3">
                        <form className="search-form" onSubmit={handleSearch} role="search">
                            <input type="search" name="q" placeholder="Cari artikel..." className="form-control" aria-label="Cari artikel" value={search} onChange={(event) => {
                                    const value = event.target.value;
                                    setSearch(value);

                                    if (!value.trim() && currentQuery) {
                                        navigate('/', { replace: true });
                                    }
                                }}
                            />

                            <button type="submit" className="btn" aria-label="Cari">
                                <i className="bi bi-search" />
                            </button>
                        </form>

                        <Link to="/admin" className="btn btn-outline-primary public-dashboard-link" onClick={closeMobileNav}>
                            <i className="bi bi-speedometer2 me-1" />
                            Dashboard
                        </Link>
                    </div>
                </div>
            </div>

            <div className="nav-wrap">
                <div className="container d-flex justify-content-center position-relative">
                    <nav id="navmenu" className={`navmenu ${mobileNavOpen ? 'navmenu-mobile-open' : ''}`} aria-label="Navigasi situs publik">
                        <ul>
                            <li>
                                <NavLink to="/" end onClick={closeMobileNav}>
                                    <i className="bi bi-house-door me-2" />
                                    Beranda
                                </NavLink>
                            </li>

                            <li>
                                <NavLink to="/artikel" onClick={closeMobileNav}>
                                    <i className="bi bi-journal-text me-2" />
                                    Blog
                                </NavLink>
                            </li>
                        </ul>

                        <button type="button" className="mobile-nav-toggle d-xl-none" aria-label={mobileNavOpen ? 'Tutup navigasi' : 'Buka navigasi' } aria-expanded={mobileNavOpen} onClick={() => setMobileNavOpen((open) => !open)}>
                            <i className={`bi ${mobileNavOpen ? 'bi-x' : 'bi-list'}`}/>
                        </button>
                    </nav>
                </div>
            </div>
        </header>
    );
}
