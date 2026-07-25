import { createBrowserRouter, RouterProvider } from 'react-router';
import { Toaster } from 'react-hot-toast';
import RootLayout from './layouts/RootLayout';
import Dashboard from './pages/Dashboard';
import Upload from './pages/Upload';
import MeetingDetail from './pages/MeetingDetail';
import ActionItems from './pages/ActionItems';
import NotFound from './pages/NotFound';

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'upload', element: <Upload /> },
      { path: 'meetings/:id', element: <MeetingDetail /> },
      { path: 'action-items', element: <ActionItems /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]);

export default function App() {
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
