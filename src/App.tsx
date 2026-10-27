import React from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router';
import ErrorBoundary from './Components/ErrorBoundary';
import Footer from './Components/Footer';
import SearchPalette from './Components/SearchPalette';
import Sidebar from './Components/Sidebar';
import TopBar from './Components/TopBar';
import { Page, SkeletonGrid } from './Components/ui';
import './index.css';

const HomePage = React.lazy(() => import('./Pages/HomePage'));
const PaldexPage = React.lazy(() => import('./Pages/PaldexPage'));
const PalPage = React.lazy(() => import('./Pages/PalPage'));
const ElementsPage = React.lazy(() => import('./Pages/ElementsPage'));
const WorkPage = React.lazy(() => import('./Pages/WorkPage'));
const SkillsPage = React.lazy(() => import('./Pages/SkillsPage'));
const SkillPage = React.lazy(() => import('./Pages/SkillPage'));
const PassivesPage = React.lazy(() => import('./Pages/PassivesPage'));
const BreedingPage = React.lazy(() => import('./Pages/BreedingPage'));
const ItemsPage = React.lazy(() => import('./Pages/ItemsPage'));
const ItemPage = React.lazy(() => import('./Pages/ItemPage'));
const BuildingsPage = React.lazy(() => import('./Pages/BuildingsPage'));
const BuildingPage = React.lazy(() => import('./Pages/BuildingPage'));
const CraftingPage = React.lazy(() => import('./Pages/CraftingPage'));
const TechPage = React.lazy(() => import('./Pages/TechPage'));
const NotFoundPage = React.lazy(() => import('./Pages/NotFoundPage'));

function App() {
  const { pathname } = useLocation();
  const scrollRef = React.useRef<HTMLElement>(null);

  // each route starts at the top of the scroll area
  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <>
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:rounded-full focus:bg-pw-sun focus:px-4 focus:py-2 focus:font-semibold focus:text-pw-deep"
      >
        Skip to content
      </a>
      <Sidebar />
      <TopBar />
      <main
        id="content"
        ref={scrollRef}
        className="fixed inset-x-0 inset-y-0 top-(--header-h) overflow-y-scroll overscroll-contain lg:top-0 lg:left-(--sidebar-w)"
      >
        <ErrorBoundary resetKey={pathname}>
          <React.Suspense
            fallback={
              <Page>
                <div className="mb-6 h-12 w-64 skeleton rounded-xl" />
                <SkeletonGrid />
              </Page>
            }
          >
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/paldex" element={<PaldexPage />} />
              <Route path="/pal/:id" element={<PalPage />} />
              <Route path="/elements" element={<ElementsPage />} />
              <Route path="/work" element={<WorkPage />} />
              <Route path="/work/:type" element={<WorkPage />} />
              <Route path="/skills" element={<SkillsPage />} />
              <Route path="/skill/:id" element={<SkillPage />} />
              <Route path="/passives" element={<PassivesPage />} />
              <Route path="/breeding" element={<BreedingPage />} />
              <Route path="/items" element={<ItemsPage />} />
              <Route path="/item/:id" element={<ItemPage />} />
              <Route path="/buildings" element={<BuildingsPage />} />
              <Route path="/building/:id" element={<BuildingPage />} />
              <Route path="/crafting" element={<CraftingPage />} />
              <Route path="/technology" element={<TechPage />} />
              <Route path="/home" element={<Navigate to="/" replace />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </React.Suspense>
        </ErrorBoundary>
        <Footer />
      </main>
      <SearchPalette />
    </>
  );
}

export default App;
