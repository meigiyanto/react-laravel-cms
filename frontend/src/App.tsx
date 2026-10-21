import PublicSite from './pages/PublicSite';
import AdminApp from './pages/AdminApp';

import 'bootstrap-icons/font/bootstrap-icons.min.css';

function App() {
    const path = window.location.pathname;

    if (path !== '/admin' && !path.startsWith('/admin/')) {
        if (path !== '/login') {
            return <PublicSite />;
        }
    }
    return <AdminApp />;
}

export default App;
