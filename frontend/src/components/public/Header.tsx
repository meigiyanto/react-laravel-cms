import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useEffect, useState, type FormEvent } from 'react';

const mainLinks = [
    { label: 'Home', to: '/' },
    { label: 'About', to: '/about' },
    { label: 'Category', to: '/category' },
];

const pageLinks = [
    { label: 'About', to: '/about' },
    { label: 'Category', to: '/category' },
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
    const navigate = useNavigate();
        
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
    
    function handleSearch(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const query = search.trim();
        if (!query) return;
        navigate(`/search-results?q=${encodeURIComponent(query)}`);
        setMobileNavOpen(false);
    }
    
    return (
        <header id="header" className="header position-relative">
            <div className="container-fluid container-xl position-relative">
                <div className="top-row d-flex align-items-center justify-content-between">
                    <Link to="/" className="logo d-flex align-items-end">
                        {/* Gunakan gambar logo jika diperlukan. */}
                        {/* <img src="/assets/img/logo.webp" alt="Blogy" /> */}
                        <h1 className="sitename">Blogy</h1>
                    </Link>
            
                    <div className="d-flex align-items-center">
                        <div className="social-links">
                            <a
                                href="https://www.facebook.com/"
                                className="facebook"
                                aria-label="Facebook"
                                target="_blank"
                                rel="noreferrer"
                            >
                                <i className="bi bi-facebook" />
                            </a>
            
                            <a
                                href="https://www.twitter.com/"
                                className="twitter"
                                aria-label="Twitter"
                                target="_blank"
                                rel="noreferrer"
                            >
                                <i className="bi bi-twitter" />
                            </a>
            
                            <a
                                href="https://www.instagram.com/"
                                className="instagram"
                                aria-label="Instagram"
                                target="_blank"
                                rel="noreferrer"
                            >
                                <i className="bi bi-instagram" />
                            </a>
                        </div>
            
                        <form className="search-form ms-4" onSubmit={handleSearch}>
                            <input
                                type="search"
                                name="q"
                                placeholder="Search..."
                                className="form-control"
                                aria-label="Search articles"
                                value={search}
                                onChange={(event)=> setSearch(event.target.value)}
                            />
            
                            <button type="submit" className="btn" aria-label="Search">
                                <i className="bi bi-search" />
                            </button>
                        </form>
                    </div>
                </div>
            </div>
            
            <div className="nav-wrap">
                <div className="container d-flex justify-content-center position-relative">
                    <nav
                        id="navmenu"
                        className="navmenu"
                        aria-label="Main navigation"
                    >
                        <ul>
                            {mainLinks.map((link) => (
                                <li key={link.to}>
                                    <NavLink
                                        to={link.to}
                                        onClick={closeMobileNav}
                                    >
                                        {link.label}
                                    </NavLink>
                                </li>
                            ))}
                        
                            {/* Dropdown Pages */}
                            <li className={`dropdown ${pagesDropdownOpen ? 'active' : ''}`}>
                                <a
                                    href="#pages"
                                    aria-expanded={pagesDropdownOpen}
                                    onClick={(event) => {
                                        event.preventDefault();
                                        togglePagesDropdown();
                                    }}
                                >
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
                                        <a
                                            href="#deep-dropdown"
                                            aria-expanded={deepDropdownOpen}
                                            onClick={(event) => {
                                                event.preventDefault();
                                                event.stopPropagation();
                                                toggleDeepDropdown();
                                            }}
                                        >
                                            <span>Deep Dropdown</span>
                                            {' '}
                                            <i className="bi bi-chevron-down toggle-dropdown" />
                                        </a>
                        
                                        <ul className={deepDropdownOpen ? 'dropdown-active' : ''}>
                                            {deepLinks.map((link) => (
                                                <li key={link.label}>
                                                    <a
                                                        href={link.to}
                                                        onClick={(event) => {
                                                            if (link.to === '#') {
                                                                event.preventDefault();
                                                            }
                                                            closeMobileNav();
                                                        }}
                                                    >
                                                        {link.label}
                                                    </a>
                                                </li>
                                            ))}
                                        </ul>
                                    </li>
                                </ul>
                            </li>
                        
                            <li>
                                <Link to="/contact" onClick={closeMobileNav}>
                                    Contact
                                </Link>
                            </li>
                        </ul>

                       <button
                            type="button"
                            className="mobile-nav-toggle d-xl-none"
                            aria-label={mobileNavOpen ? 'Close navigation' : 'Open navigation'}
                            aria-expanded={mobileNavOpen}
                            onClick={toggleMobileNav}
                        >
                            <i className={`bi ${mobileNavOpen ? 'bi-x' : 'bi-list'}`} />
                        </button>
                    </nav>
                </div>
            </div>
        </header>
    );
}