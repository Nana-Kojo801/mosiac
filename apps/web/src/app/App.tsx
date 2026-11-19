import { createBrowserRouter, RouterProvider } from 'react-router';
import { AppLayout } from './Layout';
import { AppProvider } from './store';
import { Landing } from './screens/Landing';
import { Device } from './screens/Device';
import { Workspaces } from './screens/Workspaces';
import { Overview } from './screens/Overview';
import { Import } from './screens/Import';
import { DocumentReview } from './screens/DocumentReview';
import { Findings } from './screens/Findings';
import { Rewrite } from './screens/Rewrite';
import { Journal } from './screens/Journal';
import { Settings } from './screens/Settings';
import { NotFound } from './screens/NotFound';
import { MapScreen } from './screens/Map';
import { Tests } from './screens/Tests';
import { Release } from './screens/Release';
import { History } from './screens/History';
import { Export } from './screens/Export';
import { Benchmark } from './screens/Benchmark';


const router = createBrowserRouter([{ element: <AppLayout />, children: [
  { path: '/', element: <Landing /> },
  { path: '/device', element: <Device /> },
  { path: '/workspaces', element: <Workspaces /> },
  { path: '/w/:id', element: <Overview /> },
  { path: '/w/:id/import', element: <Import /> },
  { path: '/w/:id/document', element: <DocumentReview /> },
  { path: '/w/:id/findings', element: <Findings /> },
  { path: '/w/:id/rewrite', element: <Rewrite /> },
  { path: '/w/:id/map', element: <MapScreen /> },
  { path: '/w/:id/release', element: <Release /> },
  { path: '/w/:id/history', element: <History /> },
  { path: '/w/:id/export', element: <Export /> },
  { path: '/tests', element: <Tests /> },
  { path: '/benchmark', element: <Benchmark /> },
  { path: '/journal', element: <Journal /> },
  { path: '/settings', element: <Settings /> },
  { path: '*', element: <NotFound /> },
] }]);

export function App() { return <AppProvider><RouterProvider router={router} /></AppProvider>; }
