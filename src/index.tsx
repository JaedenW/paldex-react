import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './Utils/theme'; // applies the saved or device theme straight away
import Providers from './Providers';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Providers>
      <App />
    </Providers>
  </React.StrictMode>
);
