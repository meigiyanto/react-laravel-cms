export type ThemeSettings = {
    colors: Record<string, string>;
    typography: { bodyFont: string; headingFont: string; navFont: string; baseFontSize: string; headingWeight: number; bodyWeight: number; lineHeight: number };
    layout: { containerWidth: string; sectionSpacing: string; breakpoints: { sm: number; md: number; lg: number; xl: number } };
    radius: { small: string; medium: string; large: string };
    shadows: { small: string; medium: string; large: string };
    components: { buttonStyle: string; cardStyle: string };
};

const colorFallbacks: Record<string, string> = {
    primary: '#3458db', secondary: '#64748b', background: '#ffffff', surface: '#f8fafc',
    text: '#212529', heading: '#2d465e', accent: '#f75815', contrast: '#ffffff',
    nav: '#000000', navHover: '#f75815', navBackground: '#ffffff',
    navDropdownBackground: '#ffffff', navDropdownText: '#212529', navDropdownHover: '#f75815',
};

function safeColor(value: unknown, fallback: string): string {
    return typeof value === 'string' && /^#(?:[\da-f]{3}|[\da-f]{6}|[\da-f]{8})$/i.test(value) ? value : fallback;
}

function safeLength(value: unknown, fallback: string, max = 2000): string {
    if (typeof value !== 'string' || !/^\d{1,4}px$/.test(value)) return fallback;
    return Number.parseInt(value, 10) <= max ? value : fallback;
}

function safeFont(value: unknown, fallback: string): string {
    return typeof value === 'string' && value.length <= 120 && /^[a-z\d ,"'-]+$/i.test(value) ? value : fallback;
}

function safeWeight(value: unknown, fallback: number): number {
    return typeof value === 'number' && Number.isInteger(value) && value >= 100 && value <= 900 ? value : fallback;
}

function safeLineHeight(value: unknown, fallback: number): number {
    return typeof value === 'number' && value >= 1 && value <= 2.5 ? value : fallback;
}

const shadowValues: Record<string, string> = {
    none: 'none', soft: '0 4px 18px rgba(20, 32, 50, .08)',
    medium: '0 8px 28px rgba(20, 32, 50, .12)', strong: '0 14px 40px rgba(20, 32, 50, .18)',
};

export function themeToCssVariables(settings: ThemeSettings): Record<string, string> {
    const colors = settings?.colors || {};
    const typography = settings?.typography || {} as ThemeSettings['typography'];
    const layout = settings?.layout || {} as ThemeSettings['layout'];
    const radius = settings?.radius || {} as ThemeSettings['radius'];
    const shadows = settings?.shadows || {} as ThemeSettings['shadows'];
    const result: Record<string, string> = {};
    for (const [key, fallback] of Object.entries(colorFallbacks)) {
        result[`--theme-color-${key}`] = safeColor(colors[key], fallback);
    }
    result['--default-font'] = safeFont(typography.bodyFont, 'Roboto, sans-serif');
    result['--heading-font'] = safeFont(typography.headingFont, 'Nunito, sans-serif');
    result['--nav-font'] = safeFont(typography.navFont, 'Poppins, sans-serif');
    result['--default-color'] = result['--theme-color-text'];
    result['--background-color'] = result['--theme-color-background'];
    result['--surface-color'] = result['--theme-color-surface'];
    result['--heading-color'] = result['--theme-color-heading'];
    result['--accent-color'] = result['--theme-color-accent'];
    result['--contrast-color'] = result['--theme-color-contrast'];
    result['--nav-color'] = result['--theme-color-nav'];
    result['--nav-hover-color'] = result['--theme-color-navHover'];
    result['--nav-mobile-background-color'] = result['--theme-color-navBackground'];
    result['--nav-dropdown-background-color'] = result['--theme-color-navDropdownBackground'];
    result['--nav-dropdown-color'] = result['--theme-color-navDropdownText'];
    result['--nav-dropdown-hover-color'] = result['--theme-color-navDropdownHover'];
    result['--theme-base-font-size'] = safeLength(typography.baseFontSize, '16px', 99);
    result['--theme-body-font-weight'] = String(safeWeight(typography.bodyWeight, 400));
    result['--theme-heading-font-weight'] = String(safeWeight(typography.headingWeight, 700));
    result['--theme-line-height'] = String(safeLineHeight(typography.lineHeight, 1.5));
    result['--theme-container-width'] = safeLength(layout.containerWidth, '1200px', 1920);
    result['--theme-section-spacing'] = safeLength(layout.sectionSpacing, '64px', 500);
    result['--theme-radius-small'] = safeLength(radius.small, '4px', 200);
    result['--theme-radius-medium'] = safeLength(radius.medium, '8px', 200);
    result['--theme-radius-large'] = safeLength(radius.large, '16px', 200);
    for (const key of ['small', 'medium', 'large'] as const) {
        const shadow = shadows[key];
        result[`--theme-shadow-${key}`] = typeof shadow === 'string' ? (shadowValues[shadow] || shadowValues.soft) : shadowValues.soft;
    }
    return result;
}

export function themeComponentAttributes(settings: ThemeSettings): { buttonStyle: string; cardStyle: string } {
    return {
        buttonStyle: ['solid', 'outline', 'soft'].includes(settings?.components?.buttonStyle) ? settings.components.buttonStyle : 'solid',
        cardStyle: ['flat', 'bordered', 'elevated'].includes(settings?.components?.cardStyle) ? settings.components.cardStyle : 'elevated',
    };
}
