import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import TeamDashboard from './pages/TeamDashboard';
import ProblemPage from './pages/ProblemPage';
import LeaderboardPage from './pages/LeaderboardPage';
import AdminDashboard from './pages/AdminDashboard';
import ManageTeams from './pages/ManageTeams';
import ManageProblems from './pages/ManageProblems';

// Protected Route for Authenticated Users (Team or Admin)
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Protected Route specifically for Administrator
const AdminRoute = ({ children }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
};

// Root Route handler (directs Admin to /admin, Team to TeamDashboard)
const RootRoute = () => {
  const { user, isAdmin, isAuthenticated, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (isAdmin) return <Navigate to="/admin" replace />;
  return <TeamDashboard />;
};

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
          <Navbar />
          <main className="flex-1">
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/leaderboard" element={<LeaderboardPage />} />

              {/* Team Root */}
              <Route path="/" element={<RootRoute />} />

              {/* Problem Solving Workspace */}
              <Route
                path="/problem/:id"
                element={
                  <ProtectedRoute>
                    <ProblemPage />
                  </ProtectedRoute>
                }
              />

              {/* Admin Portal Routes */}
              <Route
                path="/admin"
                element={
                  <AdminRoute>
                    <AdminDashboard />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/teams"
                element={
                  <AdminRoute>
                    <ManageTeams />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/problems"
                element={
                  <AdminRoute>
                    <ManageProblems />
                  </AdminRoute>
                }
              />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}
