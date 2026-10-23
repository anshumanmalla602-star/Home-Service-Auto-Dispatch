import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth';
import api from '../api';
import { toast } from '../ui';

const MENU_ITEMS = [
  { key: 'profile', label: 'Profile', icon: '👤', path: '/account/profile' },
  { key: 'records', label: 'Past Records', icon: '📜', path: '/account/records' },
  { key: 'password', label: 'Edit Password', icon: '🔑', path: '/account/password' },
  { key: 'logout', label: 'Logout', icon: '🚪', path: null },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(typeof window !== 'undefined' && window.innerWidth >= 1024);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsOpen(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const fetchData = async () => {
      try {
        if (user.role === 'customer') {
          const p = await api.get('/customer/profile');
          setProfile({ ...p, role: user.role, email: user.email });
        } else if (user.role === 'technician') {
          const p = await api.get('/technician/profile');
          setProfile({ ...p, role: user.role, email: user.email });
        } else {
          setProfile({ id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone });
        }
      } catch (e) { toast(e.message, 'error'); } finally { setLoading(false); }
    };
    fetchData();
  }, [user]);

  const handleMenuItem = (item) => {
    if (item.key === 'logout') { logout(); navigate('/login'); setIsOpen(false); return; }
    navigate(item.path);
    if (window.innerWidth < 1024) setIsOpen(false);
  };

  const avatar = user?.name ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) : '??';

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
        aria-label="Toggle sidebar"
      >
        {isOpen ? '✕' : '☰'}
      </button>

      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full'} shadow-2xl`}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-2 font-bold text-slate-800">
            <span className="text-xl">🚨</span><span className="text-sm">DispatchHub</span>
          </div>
          {typeof window !== 'undefined' && window.innerWidth < 1024 && (
            <button onClick={() => setIsOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">✕</button>
          )}
        </div>

        <div className="px-4 py-3">
          <div className="bg-slate-50 rounded-xl p-3 mb-6 border border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">{avatar}</div>
              <div>
                <div className="text-sm font-semibold text-slate-800">{user?.name || 'User'}</div>
                <div className="text-xs text-slate-500 capitalize">{user?.role || ''}</div>
                <div className="text-xs text-slate-400 truncate">{user?.email || ''}</div>
              </div>
            </div>
          </div>
          <nav className="space-y-1">
            {MENU_ITEMS.map((item) => {
              if (item.key === 'logout') {
                return (
                  <button key={item.key} onClick={() => handleMenuItem(item)} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition text-slate-600 hover:bg-slate-50 hover:text-slate-900">
                    <span>{item.icon}</span><span>{item.label}</span>
                  </button>
                );
              }
              const isActive = location.pathname === item.path;
              return (
                <button key={item.key} onClick={() => handleMenuItem(item)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition ${isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>
                  <span>{item.icon}</span><span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
        <div className="absolute bottom-0 w-full border-t border-slate-100 p-4 bg-white">
          <div className="text-xs text-slate-400">DispatchHub v1.0</div>
        </div>
      </div>
      {isOpen && window.innerWidth < 1024 && (
        <div className="fixed inset-0 z-40 bg-black/40 md:hidden backdrop-blur-sm" onClick={() => setIsOpen(false)}></div>
      )}
    </>
  );
}