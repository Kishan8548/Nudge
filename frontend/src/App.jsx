import { useEffect } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { Toaster } from 'react-hot-toast';
import { api } from './api/client';
import RootLayout from './layouts/RootLayout';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Upload from './pages/Upload';
import MeetingDetail from './pages/MeetingDetail';
import ActionItems from './pages/ActionItems';
import Analytics from './pages/Analytics';
import NotFound from './pages/NotFound';

const router = createBrowserRouter([
  // Landing page — no sidebar
  { path: '/', element: <Landing /> },

  // App — with sidebar layout
  {
    path: '/dashboard',
    element: <RootLayout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'upload', element: <Upload /> },
      { path: 'meetings/:id', element: <MeetingDetail /> },
      { path: 'action-items', element: <ActionItems /> },
      { path: 'analytics', element: <Analytics /> },
    ],
  },

  { path: '*', element: <NotFound /> },
]);

export default function App() {
  // Keep Render backend awake while app is open (ping every 5 minutes)
  useEffect(() => {
    // Immediate warmup ping
    api.health().catch(() => {});

    // Periodic 5-minute ping
    const interval = setInterval(() => {
      api.health().catch(() => {});
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <RouterProvider router={router} />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#1a1a2e',
            color: '#f1f5f9',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px',
            fontSize: '0.9rem',
          },
          success: {
            iconTheme: { primary: '#10b981', secondary: '#1a1a2e' },
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: '#1a1a2e' },
          },
        }}
      />
    </>
  );
}
