import React from 'react';
import { BrowserRouter as Router } from 'react-router';
import { SearchProvider } from './Utils/SearchContext';

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Router>
      <SearchProvider>{children}</SearchProvider>
    </Router>
  );
}

export default Providers;
