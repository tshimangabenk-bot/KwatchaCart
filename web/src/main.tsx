import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import './index.css';
import { HomePage } from './pages/HomePage';
import { StorefrontPage } from './pages/StorefrontPage';

const router = createBrowserRouter([
  { path: '/', element: <HomePage /> },
  { path: '/s/:slug', element: <StorefrontPage /> },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
