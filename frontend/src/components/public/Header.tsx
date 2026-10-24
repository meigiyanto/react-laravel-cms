import { NavLink, Link, useNavigate, useSearchParams } from 'react-router-dom';
import api, { AUTH_EXPIRED_EVENT, TOKEN_KEY } from '../../api/client';
import { useEffect, useState, type FormEvent } from 'react';

const mainLinks = [
    { label: 'Home', to: '/' },
    { label: 'Blog', to: '/blog' },
    { label: 'Contact', to: '/contact' },
];

const pageLinks = [
    { label: 'About', to: '/about' },
    { label: 'About Author', to: '/about-author' },
    { label: 'Search Results', to: '/search-results' },
    { label: '404 Not Found Page', to: '/404' },
];

const deepLinks = [
    { label: 'Deep Dropdown 1', to: '#' },
    { label: 'Deep Dropdown 2', to: '#' },
    { label: 'Deep Dropdown 3', to: '#' },
    { label: 'Deep Dropdown 4', to: '#' },
    { label: 'Deep Dropdown 5', to: '#' },
];

export default function Header() {
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const [pagesDropdownOpen, setPagesDropdownOpen] = useState(false);
    const [deepDropdownOpen, setDeepDropdownOpen] = useState(false);

    const [search, setSearch] = useState('');
    const [searchParams] = useSearchParams();
    const currentQuery = searchParams.get('q') || '';
    const navigate = useNavigate();

    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [authChecked, setAuthChecked] = useState(false);

    useEffect(() => {
        setSearch(currentQuery);
    }, [currentQuery]);

    useEffect(() => {
        document.body.classList.toggle('mobile-nav-active', mobileNavOpen);
        
        return () => {
            document.body.classList.remove('mobile-nav-active');
        };
    }, [mobileNavOpen]);
    
    function closeMobileNav() {
        setMobileNavOpen(false);
        setPagesDropdownOpen(false);
        setDeepDropdownOpen(false);
    }
    
    function toggleMobileNav() {
        setMobileNavOpen((open) => !open);
    }
    
    function togglePagesDropdown() {
        setPagesDropdownOpen((open) => !open);
        setDeepDropdownOpen(false);
    }
    
    function toggleDeepDropdown() {
        setDeepDropdownOpen((open) => !open);
    }

    useEffect(() => {
        let active = true;
    
        async function checkAuth() {
            const token = localStorage.getItem(TOKEN_KEY);
    
            if (!token) {
                if (active) {
                    setIsAuthenticated(false);
                    setAuthChecked(true);
                }
                return;
            }
    
            try {
                await api.get('/auth/me');
    
                if (active) {
                    setIsAuthenticated(true);
                }
            } catch {
                if (active) {
                    setIsAuthenticated(false);
                }
            } finally {
                if (active) {
                    setAuthChecked(true);
                }
            }
        }
    
        const handleAuthExpired = () => {
            setIsAuthenticated(false);
        };
    
        window.addEventListener(
            AUTH_EXPIRED_EVENT,
            handleAuthExpired,
        );
    
        void checkAuth();
    
        return () => {
            active = false;
            window.removeEventListener(
                AUTH_EXPIRED_EVENT,
                handleAuthExpired,
            );
        };
    }, []);

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
    
    async function handleLogout() {
        try {
            await api.post('/auth/logout');
        } catch {
            // Tetap logout jika token tidak valid
            // atau server tidak dapat dijangkau.
        } finally {
            localStorage.removeItem(TOKEN_KEY);
            setIsAuthenticated(false);
            closeMobileNav();
            navigate('/', { replace: true });
        }
    }

    return (
        <header id="header" className="header position-relative">
            <div className="container-fluid container-xl position-relative">
                <div className="top-row d-flex align-items-center justify-content-between">
                    <Link to="/" className="logo d-flex align-items-end">
                        {/* Gunakan gambar logo jika diperlukan. */}
                        {/* <img src="/assets/img/logo.webp" alt="Blogy" /> */}
                        <h1 className="sitename">Content HUB</h1>
                    </Link>
            
                    <div className="d-flex align-items-center">
                        <form className="search-form ms-4" onSubmit={handleSearch}>
                            <input type="search" name="q" placeholder="Search..." className="form-control" aria-label="Search articles" value={search} onChange={(event) => { const value = event.target.value; setSearch(value); if (!value.trim() && currentQuery) {navigate('/', { replace: true });}}}/>
                            <button type="submit" className="btn" aria-label="Search">
                                <i className="bi bi-search" />
                            </button>
                        </form>
                    </div>
                </div>
            </div>
            
            <div className="nav-wrap">
                <div className="container d-flex justify-content-center position-relative">
                    <nav id="navmenu" className="navmenu" aria-label="Main navigation">
                        <ul>
                            {mainLinks.map((link) => (
                                <li key={link.to}>
                                    <NavLink to={link.to} onClick={closeMobileNav}>
                                        {link.label}
                                    </NavLink>
                                </li>
                            ))}
                        
                            <li className={`dropdown ${pagesDropdownOpen ? 'active' : ''}`}>
                                <a href="#pages" aria-expanded={pagesDropdownOpen} onClick={(event) => { event.preventDefault(); togglePagesDropdown(); }}>
                                    <span>Pages</span>
                                    {' '}
                                    <i className="bi bi-chevron-down toggle-dropdown" />
                                </a>
                        
                                <ul className={pagesDropdownOpen ? 'dropdown-active' : ''}>
                                    {pageLinks.map((link) => (
                                        <li key={link.to}>
                                            <Link to={link.to} onClick={closeMobileNav}>
                                                {link.label}
                                            </Link>
                                        </li>
                                    ))}
                        
                                    {/* Dropdown bertingkat */}
                                    <li className={`dropdown ${deepDropdownOpen ? 'active' : ''}`}>
                                        <a href="#deep-dropdown" aria-expanded={deepDropdownOpen} onClick={(event) => { event.preventDefault(); event.stopPropagation(); toggleDeepDropdown(); }}>
                                            <span>Deep Dropdown</span>
                                            {' '}
                                            <i className="bi bi-chevron-down toggle-dropdown" />
                                        </a>
                        
                                        <ul className={deepDropdownOpen ? 'dropdown-active' : ''}>
                                            {deepLinks.map((link) => (
                                                <li key={link.label}>
                                                    <a href={link.to} onClick={(event) => { if (link.to === '#') { event.preventDefault(); } closeMobileNav(); }}>
                                                        {link.label}
                                                    </a>
                                                </li>
                                            ))}
                                        </ul>
                                    </li>
                                </ul>
                            </li>
                        
                            {authChecked && (
                                isAuthenticated ? (
                                    <>
                                        <li>
                                            <Link to="/admin" onClick={closeMobileNav}>Dashboard</Link>
                                        </li>
                                        <li>
                                            <button type="button" className="nav-link" onClick={() => void handleLogout()}>Logout</button>
                                        </li>
                                    </>
                                ) : (
                                    <li><Link to="/login" onClick={closeMobileNav}>Login</Link></li>
                                )
                            )}
                        </ul>

                       <button type="button" className="mobile-nav-toggle d-xl-none" aria-label={mobileNavOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={mobileNavOpen} onClick={toggleMobileNav}>
                            <i className={`bi ${mobileNavOpen ? 'bi-x' : 'bi-list'}`} />
                        </button>
                    </nav>
                </div>
            </div>
        </header>
    );
}
