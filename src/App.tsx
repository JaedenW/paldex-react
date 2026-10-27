import React from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router';
import Navbar from './Components/Navbar';
import BottomTabs from './Components/BottomTabs';
import ErrorBoundary from './Components/ErrorBoundary';
import Footer from './Components/Footer';
import SearchPalette from './Components/SearchPalette';
import './index.css';

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
      <Navbar />
      <main
        ref={scrollRef}
        className="fixed inset-x-0 top-(--header-h) bottom-(--tabbar-h) overflow-y-scroll overscroll-contain lg:bottom-0"
      >
        <ErrorBoundary resetKey={pathname}>
          <React.Suspense
            fallback={
              <div className="flex h-[60vh] items-center justify-center text-pw-muted">
                Loading…
              </div>
            }
          >
            <Routes>
              <Route path="/" element={<Navigate to="/paldex" replace />} />
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
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </React.Suspense>
        </ErrorBoundary>
        <Footer />
      </main>
      <BottomTabs />
      <SearchPalette />
    </>
  );
}

export default App;
