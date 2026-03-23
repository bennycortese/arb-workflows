import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { ClerkProvider } from '@clerk/react';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

root.render(
  // @ts-ignore — Clerk v6 types strip all ClerkProvider props
  <ClerkProvider publishableKey={process.env.REACT_APP_CLERK_PUBLISHABLE_KEY ?? ''}>
    <App />
  </ClerkProvider>
);
