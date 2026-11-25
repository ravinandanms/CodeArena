import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Code2, 
  Trophy, 
  LayoutDashboard, 
  Users, 
  Layers, 
  History, 
  LogOut, 
  Menu, 
  X, 
  ShieldCheck, 
  Sparkles,
  Terminal
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Timer from './Timer';

export default function Navbar() {
  const { user, logout, isAdmin, isTeam, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div className="flex items-center space-x-3">
            <Link to={isAdmin ? '/admin' : '/'} className="flex items-center space-x-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-400 p-0.5 shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-all">
                <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                  <Code2 className="w-5 h-5 text-indigo-400 group-hover:text-emerald-400 transition-colors" />
                </div>
              </div>
              <div>
                <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-300 bg-clip-text text-transparent">
                  Code<span className="text-indigo-400">Arena</span>
                </span>
                <span className="hidden sm:inline-block ml-2 px-1.5 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Sprint '26
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center space-x-1 lg:space-x-2">
            {isAuthenticated ? (
              <>
                {isTeam && (
                  <>
                    <Link
                      to="/"
                      className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive('/')
                          ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      <span>Dashboard</span>
                    </Link>
                  </>
                )}

                {isAdmin && (
                  <>
                    <Link
                      to="/admin"
                      className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive('/admin')
                          ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      <span>Admin Overview</span>
                    </Link>
                    <Link
                      to="/admin/teams"
                      className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive('/admin/teams')
                          ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      <Users className="w-4 h-4" />
                      <span>Manage Teams</span>
                    </Link>
                    <Link
                      to="/admin/problems"
                      className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive('/admin/problems')
                          ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      <Layers className="w-4 h-4" />
                      <span>Problems</span>
                    </Link>
                  </>
                )}

                {/* Shared Leaderboard link */}
                <Link
                  to="/leaderboard"
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/leaderboard')
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span>Leaderboard</span>
                </Link>
              </>
            ) : null}
          </div>

          {/* Right Section: Timer & User Profile */}
          <div className="hidden md:flex items-center space-x-4">
            <Timer compact />

            {isAuthenticated ? (
              <div className="flex items-center space-x-3 pl-2 border-l border-slate-800">
                <div className="text-right">
                  <div className="text-xs font-semibold text-slate-200">
                    {user?.teamName || user?.username}
                  </div>
                  <div className="flex items-center justify-end space-x-1">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded ${
                      isAdmin
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}>
                      {user?.role}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">@{user?.username}</span>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  title="Log out"
                  className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  to="/login"
                  className="px-3 py-1.5 text-sm font-medium text-slate-200 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  className="px-3.5 py-1.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm shadow-indigo-600/30 transition-all"
                >
                  Register Team
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center space-x-2">
            <Timer compact />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 focus:outline-none"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-slate-900/95 backdrop-blur-lg px-4 pt-3 pb-6 space-y-2">
          {isAuthenticated ? (
            <>
              <div className="py-2 px-3 mb-2 rounded-lg bg-slate-800/60 border border-slate-700/50 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-sm text-white">{user?.teamName || user?.username}</div>
                  <div className="text-xs text-slate-400">@{user?.username} • {user?.role}</div>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-1 px-2.5 py-1.5 text-xs text-rose-400 bg-rose-500/10 rounded-md"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              </div>

              {isTeam && (
                <Link
                  to="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 text-sm font-medium rounded-lg text-slate-200 hover:bg-slate-800"
                >
                  Dashboard
                </Link>
              )}

              {isAdmin && (
                <>
                  <Link
                    to="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 text-sm font-medium rounded-lg text-slate-200 hover:bg-slate-800"
                  >
                    Admin Overview
                  </Link>
                  <Link
                    to="/admin/teams"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 text-sm font-medium rounded-lg text-slate-200 hover:bg-slate-800"
                  >
                    Manage Teams
                  </Link>
                  <Link
                    to="/admin/problems"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 text-sm font-medium rounded-lg text-slate-200 hover:bg-slate-800"
                  >
                    Manage Problems
                  </Link>
                </>
              )}

              <Link
                to="/leaderboard"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 text-sm font-medium rounded-lg text-amber-300 hover:bg-slate-800"
              >
                Leaderboard
              </Link>
            </>
          ) : (
            <div className="space-y-2 pt-2">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block w-full py-2 text-center text-sm font-medium text-slate-200 bg-slate-800 rounded-lg"
              >
                Log In
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="block w-full py-2 text-center text-sm font-semibold text-white bg-indigo-600 rounded-lg"
              >
                Register Team
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
