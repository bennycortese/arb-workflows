import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { useUser } from '@clerk/react';
import LandingPage from './LandingPage';
import Dashboard from './Dashboard';
import WorkflowBuilder from './WorkflowBuilder';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useUser();
  if (!isLoaded) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-5 h-5 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
    </div>
  );
  if (!isSignedIn) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={
          <ProtectedRoute><Dashboard /></ProtectedRoute>
        } />
        <Route path="/workflow/:id" element={
          <ProtectedRoute><WorkflowBuilder /></ProtectedRoute>
        } />
        <Route path="/workflow/new" element={
          <ProtectedRoute><WorkflowBuilder /></ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
