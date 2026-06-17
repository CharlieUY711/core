import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import AdminLayout    from './components/AdminLayout';
import AdminDashboard from './pages/AdminDashboard';
import AdminOrders    from './pages/AdminOrders';
import AdminProducts  from './pages/AdminProducts';
import AdminAnalytics from './pages/AdminAnalytics';
import AdminML        from './pages/AdminML';
import LoginPage      from './pages/LoginPage';

const router = createBrowserRouter([
  { path: '/login', Component: LoginPage },
  {
    path: '/admin',
    Component: AdminLayout,
    children: [
      { index: true,          Component: AdminDashboard },
      { path: 'orders',       Component: AdminOrders    },
      { path: 'products',     Component: AdminProducts  },
      { path: 'analytics',    Component: AdminAnalytics },
      { path: 'ml',           Component: AdminML        },
    ],
  },
  { path: '*', element: <Navigate to="/admin" replace /> },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
