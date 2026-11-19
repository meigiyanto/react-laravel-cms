import { useMemo, useState } from 'react';
type ThemeComparisonTheme = { id: number; name: string; settings?: { settings: Record<string, unknown> } | null };
type Props = { themes: ThemeComparisonTheme[] };
function flatten(value: Record<string, unknown>, prefix = ''): Record<string, string> {
    return Object.entries(value).reduce<Record<string, string>>((result, [key, item]) => {
        const path = prefix ? prefix + '.' + key : key;
        if (item && typeof item === 'object' && !Array.isArray(item)) Object.assign(result, flatten(item as Record<string, unknown>, path));
        else result[path] = String(item);
        return result;
    }, {});
}
export default function ThemeComparison({ themes }: Props) {
    const [leftId, setLeftId] = useState<number>(themes[0]?.id ?? 0);
    const [rightId, setRightId] = useState<number>(themes[1]?.id ?? themes[0]?.id ?? 0);
    const left = themes.find((theme) => theme.id === leftId) ?? themes[0];
    const right = themes.find((theme) => theme.id === rightId) ?? themes[1];
    const differences = useMemo(() => {
        if (!left || !right) return [];
        const a = flatten(left.settings?.settings ?? {});
        const b = flatten(right.settings?.settings ?? {});
        return [...new Set([...Object.keys(a), ...Object.keys(b)])].sort().filter((key) => a[key] !== b[key])
            .map((key) => ({ key, left: a[key] ?? '—', right: b[key] ?? '—' }));
    }, [left, right]);
    return <section className="content-panel mt-4">
        <div className="panel-heading"><div><h3>Perbandingan Tema</h3><p>Bandingkan design tokens dua tema tanpa mengubah konfigurasi atau tema aktif.</p></div><span className="total-badge">{differences.length} perbedaan</span></div>
        {themes.length < 2 ? <div className="empty-state">Buat setidaknya dua tema untuk mulai membandingkan.</div> : <>
            <div className="row g-3 px-4 pb-3">
                <div className="col-md-6"><label className="form-label" htmlFor="theme-compare-left">Tema pertama</label><select id="theme-compare-left" className="form-select" value={left?.id ?? ''} onChange={(event) => setLeftId(Number(event.target.value))}>{themes.map((theme) => <option key={theme.id} value={theme.id}>{theme.name}</option>)}</select></div>
                <div className="col-md-6"><label className="form-label" htmlFor="theme-compare-right">Tema kedua</label><select id="theme-compare-right" className="form-select" value={right?.id ?? ''} onChange={(event) => setRightId(Number(event.target.value))}>{themes.map((theme) => <option key={theme.id} value={theme.id}>{theme.name}</option>)}</select></div>
            </div>
            {!left?.settings || !right?.settings ? <div className="alert alert-warning mx-4">Salah satu tema belum memiliki konfigurasi design tokens.</div> : left.id === right.id ? <div className="empty-state">Pilih dua tema yang berbeda untuk dibandingkan.</div> : differences.length === 0 ? <div className="empty-state">Kedua tema memiliki design tokens yang identik.</div> :
                <div className="table-responsive px-4 pb-4"><table className="table cms-table align-middle"><thead><tr><th>Design token</th><th>{left.name}</th><th>{right.name}</th></tr></thead><tbody>{differences.map((item) => <tr key={item.key}><td><code>{item.key}</code></td><td><code>{item.left}</code></td><td><code>{item.right}</code></td></tr>)}</tbody></table></div>}
        </>}
    </section>;
}
