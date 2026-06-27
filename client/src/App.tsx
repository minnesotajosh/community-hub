import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './auth';
import Layout from './pages/Layout';
import Login from './pages/Login';
import Community from './pages/Community';
import Admin from './pages/Admin';
import { Toaster } from '@/components/ui/sonner';

export default function App() {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-10 text-center text-slate-500">Loading…</div>;
  if (!user) return <><Login /><Toaster richColors /></>;

  return (
    <>
    <Toaster richColors />
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/community" />} />
        <Route path="/community/*" element={<Community />} />
        {/* legacy redirects */}
        <Route path="/concerns/*" element={<Navigate to="/community/concerns" replace />} />
        <Route path="/forums/*" element={<Navigate to="/community/forums" replace />} />
        <Route path="/admin/*" element={<Admin />} />
        <Route path="*" element={<Navigate to="/community" />} />
      </Routes>
    </Layout>
    </>
  );
}
