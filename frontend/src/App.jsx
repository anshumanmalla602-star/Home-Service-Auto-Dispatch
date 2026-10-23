import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import Signup from './pages/Signup';
import Customer from './pages/Customer';
import Technician from './pages/Technician';
import Admin from './pages/Admin';
import Profile from './pages/Profile';
import PastRecords from './pages/PastRecords';
import EditPassword from './pages/EditPassword';

// Guard: redirect unauthenticated users to login.
function RequireRole({ role, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) {
    return <Navigate to={`/${user.role}`} replace />;
  }
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/customer" element={<RequireRole role="customer"><Customer /></RequireRole>} />
        <Route path="/technician" element={<RequireRole role="technician"><Technician /></RequireRole>} />
        <Route path="/admin" element={<RequireRole role="admin"><Admin /></RequireRole>} />
        <Route path="/account/profile" element={<RequireRole><Profile /></RequireRole>} />
        <Route path="/account/records" element={<RequireRole><PastRecords /></RequireRole>} />
        <Route path="/account/password" element={<RequireRole><EditPassword /></RequireRole>} />
        <Route path="/" element={<HomeRedirect />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}

function HomeRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  const portal = user.role === 'customer' ? '/customer' : user.role === 'technician' ? '/technician' : '/admin';
  return <Navigate to={portal} replace />;
}