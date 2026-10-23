import { useNavigate } from 'react-router-dom';
import { useAuth } from './auth';

export default function Layout({ title, subtitle, children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const onLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-slate-800">
            <span className="text-xl">🚨</span>
            <span>DispatchHub</span>
            <span className="hidden sm:inline text-xs font-normal text-slate-400">Emergency Home Services</span>
          </div>
          {user && (
            <div className="flex items-center gap-3">
              <div className="text-right leading-tight">
                <div className="text-sm font-semibold text-slate-700">{user.name}</div>
                <div className="text-xs capitalize text-slate-400">{user.role}</div>
              </div>
              <button
                onClick={onLogout}
                className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <h1 className="text-xl font-bold text-slate-800">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5 mb-4">{subtitle}</p>}
        {children}
      </main>
    </div>
  );
}