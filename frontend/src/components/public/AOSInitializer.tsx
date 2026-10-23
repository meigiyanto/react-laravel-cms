import { useEffect } from 'react';
import AOS from 'aos';
import 'aos/dist/aos.css';

export default function AOSInitializer() {
    useEffect(() => {
        AOS.init({
            duration: 700,
            easing: 'ease-out',
            once: true,
            offset: 80,
            disable: () =>
            window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        });

        return () => {
            document.querySelectorAll('[data-aos]').forEach((element) => {
                element.classList.remove('aos-init', 'aos-animate');
            });
        };
    }, []);

    return null;
} 