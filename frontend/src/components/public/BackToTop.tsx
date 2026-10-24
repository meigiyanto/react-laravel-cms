import { useEffect, useState } from 'react';

export default function BackToTop() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        function handleScroll() {
            setVisible(window.scrollY > 300);
        }

        handleScroll();

        window.addEventListener('scroll', handleScroll, {
            passive: true,
        });

        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);

    function scrollToTop() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth',
        });
    }

    return (
        <button
            type="button"
            id="scroll-top"
            className={`scroll-top d-flex align-items-center justify-content-center ${
                visible ? 'active' : ''
            }`}
            onClick={scrollToTop}
            aria-label="Kembali ke atas"
            aria-hidden={!visible}
            tabIndex={visible ? 0 : -1}
        >
            <i
                className="bi bi-arrow-up-short"
                aria-hidden="true"
            />
        </button>
    );
}
