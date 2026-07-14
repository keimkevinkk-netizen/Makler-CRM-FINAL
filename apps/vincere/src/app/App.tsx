import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AppShell } from './AppShell';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { TodayPage } from '../features/today/TodayPage';
import { ContactsPage } from '../features/contacts/ContactsPage';
import { PipelinePage } from '../features/pipeline/PipelinePage';
import { PhonePage } from '../features/phone/PhonePage';
import { PropertiesPage } from '../features/properties/PropertiesPage';
import { ValuationsPage } from '../features/valuations/ValuationsPage';
import { NetworkPage } from '../features/network/NetworkPage';
import { CampaignsPage } from '../features/campaigns/CampaignsPage';
import { KnowledgePage } from '../features/knowledge/KnowledgePage';
import { ConflictCenterPage } from '../features/conflicts/ConflictCenterPage';
import { TeamPage } from '../features/team/TeamPage';
import { SettingsPage } from '../features/settings/SettingsPage';

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'today', element: <TodayPage /> },
      { path: 'contacts', element: <ContactsPage /> },
      { path: 'pipeline', element: <PipelinePage /> },
      { path: 'phone', element: <PhonePage /> },
      { path: 'properties', element: <PropertiesPage /> },
      { path: 'valuations', element: <ValuationsPage /> },
      { path: 'network', element: <NetworkPage /> },
      { path: 'campaigns', element: <CampaignsPage /> },
      { path: 'knowledge', element: <KnowledgePage /> },
      { path: 'conflicts', element: <ConflictCenterPage /> },
      { path: 'team', element: <TeamPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
]);

export function App() { return <RouterProvider router={router} />; }
