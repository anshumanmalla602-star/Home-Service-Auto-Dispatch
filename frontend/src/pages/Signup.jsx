import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { toast } from '../ui';
import api from '../api';

const ROLES = [
  { value: 'customer', label: 'Customer', icon: '👤', desc: 'Request emergency home services' },
  { value: 'technician', label: 'Technician', icon: '🔧', desc: 'Accept and complete service jobs' },
];

export default function Signup() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [role, setRole] = useState('customer');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [address, setAddress] = useState('');
  const [skillCategory, setSkillCategory] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const isTechnician = role === 'technician';

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);

    if (!name || !email || !password || !confirmPassword) {
      toast('Please fill in all required fields', 'error');
      setBusy(false);
      return;
    }
    if (password !== confirmPassword) {
      toast('Passwords do not match', 'error');
      setBusy(false);
      return;
    }
    if (password.length < 6) {
      toast('Password must be at least 6 characters', 'error');
      setBusy(false);
      return;
    }

    const extra = {};
    if (isTechnician) {
      if (!skillCategory) { toast('Please select a skill category', 'error'); setBusy(false); return; }
      if (!latitude || !longitude) { toast('Please enter your current location', 'error'); setBusy(false); return; }
      extra.skillCategory = skillCategory;
      extra.latitude = latitude;
      extra.longitude = longitude;
    } else {
      extra.address = address || null;
    }

    try {
      const u = await apiRegister(role, name, email, phone, password, extra);
      toast(`Welcome, ${u.name}!`, 'success');
      const portal = u.role === 'customer' ? '/customer' : u.role === 'technician' ? '/technician' : '/admin';
      navigate(portal);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const apiRegister = (r, n, e, p, pw, ex) => api.register(r, n, e, p, pw, ex);

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 flex items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
      <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-blue-200/50 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-indigo-200/50 blur-3xl pointer-events-none" />
      <div className="relative z-10 grid w-full max-w-5xl overflow-hidden rounded-3xl border border-white bg-white shadow-2xl shadow-slate-200/70 lg:grid-cols-2">
        <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-950 p-10 text-white lg:flex xl:p-12">
          <div className="absolute -right-24 -top-20 h-72 w-72 rounded-full border-[35px] border-white/10" />
          <div className="absolute -bottom-28 -left-20 h-80 w-80 rounded-full border-[45px] border-white/10" />
          <div className="absolute right-16 top-64 h-20 w-20 rounded-full bg-blue-400/20 blur-xl" />
          <div className="relative z-10">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-white/10 shadow-lg backdrop-blur-sm">
              <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11z" />
                <path d="M12 8v8" />
                <path d="M8 12h8" />
              </svg>
            </div>
            <h1 className="mt-8 text-3xl font-bold tracking-tight xl:text-4xl">DispatchHub</h1>
            <p className="mt-4 max-w-sm text-base leading-7 text-blue-100">
              Emergency Home Services Auto-Dispatch. Connecting people with reliable professionals when they need it most.
            </p>
          </div>
          <div className="relative z-10 mt-auto">
            <h2 className="text-lg font-semibold text-white mb-6">Join thousands of happy customers and skilled professionals.</h2>
            <div className="space-y-4">
              {ROLES.map((r) => (
                <div key={r.value} className="flex items-center gap-4 px-4 py-3 rounded-2xl border border-white/20 bg-white/10">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl">{r.icon}</div>
                  <div>
                    <h3 className="text-white font-semibold">{r.label}</h3>
                    <p className="text-sm text-blue-100">{r.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="relative flex flex-col justify-center p-10 text-slate-900 lg:p-12 xl:p-16">
          <div className="max-w-md mx-auto">
            <div className="mb-8">
              <h2 className="text-3xl font-bold tracking-tight">Create your account</h2>
              <p className="mt-2 text-slate-600">Join DispatchHub to request or provide emergency home services.</p>
            </div>
            <div className="mb-6">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">I want to</label>
              <div className="grid grid-cols-2 gap-3">
                {ROLES.map((r) => (
                  <button key={r.value} type="button" onClick={() => setRole(r.value)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-semibold transition-all ${role === r.value ? 'bg-blue-50 border-blue-200 text-blue-700' : 'border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50'}`}>
                    <span className="text-lg">{r.icon}</span><span>{r.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Full Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="John Doe" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Email Address</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="you@example.com" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Phone (optional)</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="+1 234 567 8900" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Password</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="••••••••" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">{showPassword ? '🙈' : '👁️'}</button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">At least 6 characters</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Confirm Password</label>
                <div className="relative">
                  <input type={showConfirm ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="••••••••" />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">{showConfirm ? '🙈' : '👁️'}</button>
                </div>
              </div>
              {!isTechnician && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Address (optional)</label>
                  <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="123 Main St, City" />
                </div>
              )}
              {isTechnician && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Skill Category</label>
                    <select value={skillCategory} onChange={(e) => setSkillCategory(e.target.value)} required className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">Select your specialty</option>
                      <option value="plumbing">🚰 Plumbing & Leak Repair</option>
                      <option value="electrical">⚡ Electrical Repair</option>
                      <option value="ac">❄️ AC & Refrigeration</option>
                      <option value="appliance">🔧 Appliance Repair</option>
                      <option value="pest">🐜 Pest Control</option>
                      <option value="security">🔐 Locksmith & Security</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Current Latitude</label>
                      <input type="number" step="any" value={latitude} onChange={(e) => setLatitude(e.target.value)} required className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="20.2961" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Current Longitude</label>
                      <input type="number" step="any" value={longitude} onChange={(e) => setLongitude(e.target.value)} required className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="85.8245" />
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Your location helps the dispatch engine assign nearby jobs.</p>
                </>
              )}
              <button type="submit" disabled={busy} className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 text-sm disabled:opacity-60 transition-colors">{busy ? 'Creating account…' : 'Create Account'}</button>
            </form>
            <p className="mt-6 text-center text-xs text-slate-500">Already have an account?<a href="/login" className="text-blue-600 hover:text-blue-700 font-medium"> Sign in</a></p>
          </div>
        </div>
      </div>
    </div>
  );
}
