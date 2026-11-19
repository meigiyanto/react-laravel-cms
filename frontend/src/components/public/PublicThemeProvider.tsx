import { useEffect } from 'react';
import axios from 'axios';
import type { PropsWithChildren } from 'react';
import { themeToCssVariables, themeComponentAttributes, type ThemeSettings } from '../../utils/themeTokens';

type PublicThemeResponse = {
    data: { settings: ThemeSettings } | null;
};

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

export default function PublicThemeProvider({ children }: PropsWithChildren) {
    useEffect(() => {
        let active = true;
        const body = document.body;
        const previous = new Map<string, string>();
        const previousButtonStyle = body.dataset.themeButtonStyle;
        const previousCardStyle = body.dataset.themeCardStyle;
        let applied = false;

        axios.get<PublicThemeResponse>(`${API_BASE}/public/theme`, {
            headers: { Accept: 'application/json' }, timeout: 10000,
        }).then(({ data }) => {
            if (!active || !data.data?.settings) return;
            const variables = themeToCssVariables(data.data.settings);
            Object.entries(variables).forEach(([name, value]) => {
                previous.set(name, body.style.getPropertyValue(name));
                body.style.setProperty(name, value);
            });
            const attributes = themeComponentAttributes(data.data.settings);
            body.dataset.themeButtonStyle = attributes.buttonStyle;
            body.dataset.themeCardStyle = attributes.cardStyle;
            body.classList.add('public-site-active');
            applied = true;
        }).catch(() => {
            // Keep the stylesheet defaults when the public theme endpoint is unavailable.
        });

        return () => {
            active = false;
            if (!applied) return;
            previous.forEach((value, name) => {
                if (value) body.style.setProperty(name, value);
                else body.style.removeProperty(name);
            });
            if (previousButtonStyle === undefined) delete body.dataset.themeButtonStyle;
            else body.dataset.themeButtonStyle = previousButtonStyle;
            if (previousCardStyle === undefined) delete body.dataset.themeCardStyle;
            else body.dataset.themeCardStyle = previousCardStyle;
            body.classList.remove('public-site-active');
        };
    }, []);

    return <>{children}</>;
}
