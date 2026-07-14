import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AppShell } from './AppShell';

const DashboardPage = lazy(() => import('../features/dashboard/DashboardPage').then((module) => ({ default: module.DashboardPage })));
const TodayPage = lazy(() => import('../features/today/TodayPage').then((module) => ({ default: module.TodayPage })));
const ContactsPage = lazy(() => import('../features/contacts/ContactsPage').then((module) => ({ default: module.ContactsPage })));
const PipelinePage = lazy(() => import('../features/pipeline/PipelinePage').then((module) => ({ default: module.PipelinePage })));
const PhonePage = lazy(() => import('../features/phone/PhonePage').then((module) => ({ default: module.PhonePage })));
const PropertiesPage = lazy(() => import('../features/properties/PropertiesPage').then((module) => ({ default: module.PropertiesPage })));
const ValuationsPage = lazy(() => import('../features/valuations/ValuationsPage').then((module) => ({ default: module.ValuationsPage })));
const NetworkPage = lazy(() => import('../features/network/NetworkPage').then((module) => ({ default: module.NetworkPage })));
const CampaignsPage = lazy(() => import('../features/campaigns/CampaignsPage').then((module) => ({ default: module.CampaignsPage })));
const KnowledgePage = lazy(() => import('../features/knowledge/KnowledgePage').then((module) => ({ default: module.KnowledgePage })));
const SettingsPage = lazy(() => import('../features/settings/SettingsPage').then((module) => ({ default: module.SettingsPage })));

function RouteLoader() {
  return <div className="route-loading" role="status" aria-live="polite">Bereich wird geladen …</div>;
}

const withSuspense = (element: ReactNode) => <Suspense fallback={<RouteLoader />}>{element}</Suspense>;

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: withSuspense(<DashboardPage />) },
      { path: 'today', element: withSuspense(<TodayPage />) },
      { path: 'contacts', element: withSuspense(<ContactsPage />) },
      { path: 'pipeline', element: withSuspense(<PipelinePage />) },
      { path: 'phone', element: withSuspense(<PhonePage />) },
      { path: 'properties', element: withSuspense(<PropertiesPage />) },
      { path: 'valuations', element: withSuspense(<ValuationsPage />) },
      { path: 'network', element: withSuspense(<NetworkPage />) },
      { path: 'campaigns', element: withSuspense(<CampaignsPage />) },
      { path: 'knowledge', element: withSuspense(<KnowledgePage />) },
      { path: 'settings', element: withSuspense(<SettingsPage />) },
    ],
  },
]);

export function App() { return <RouterProvider router={router} />; }
