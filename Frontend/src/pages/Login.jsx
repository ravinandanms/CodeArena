import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Users, Lock, User, ArrowRight, AlertCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isExpired = searchParams.get('expired') === 'true';

  const [activeTab, setActiveTab] = useState('team'); // 'team' or 'admin'
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(isExpired ? 'Your session expired. Please log in again.' : '');

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    if (error) setError('');
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setError('');
    setFormData({ username: '', password: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.username.trim() || !formData.password) {
      setError('Username and password are required.');
      return;
    }

    setLoading(true);

    try {
      const user = await login(formData.username.trim(), formData.password);
      if (user.role === 'ADMIN') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8 bg-slate-950">
      <div className="max-w-md w-full space-y-6 bg-slate-900/80 p-8 sm:p-10 rounded-3xl border border-slate-800 shadow-2xl backdrop-blur-xl">
        {/* Toggle Login Mode Tabs */}
        <div className="grid grid-cols-2 p-1 bg-slate-950 rounded-2xl border border-slate-800">
          <button
            type="button"
            onClick={() => handleTabChange('team')}
            className={`flex items-center justify-center space-x-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'team'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Team Account</span>
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('admin')}
            className={`flex items-center justify-center space-x-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'admin'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Administrator</span>
          </button>
        </div>

        {/* Header */}
        <div className="text-center">
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            {activeTab === 'team' ? 'Team Sign In' : 'Admin Portal Login'}
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            {activeTab === 'team'
              ? 'Enter your shared team credentials to access the sprint'
              : 'Sign in to manage problems, teams, and competition timer'}
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="flex items-center space-x-2 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form className="mt-6 space-y-4" onSubmit={handleSubmit} autoComplete="off">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <User className="w-5 h-5" />
              </div>
              <input
                name="username"
                type="text"
                required
                autoComplete="off"
                value={formData.username}
                onChange={handleChange}
                placeholder={activeTab === 'team' ? 'Your team username' : 'Administrator username'}
                className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-sm transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-5 h-5" />
              </div>
              <input
                name="password"
                type="password"
                required
                autoComplete="new-password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-sm transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full flex items-center justify-center space-x-2 py-3.5 px-4 rounded-xl text-sm font-bold text-white shadow-lg focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all ${
              activeTab === 'team'
                ? 'bg-indigo-600 hover:bg-indigo-500 focus:ring-indigo-500/50 shadow-indigo-600/30'
                : 'bg-purple-600 hover:bg-purple-500 focus:ring-purple-500/50 shadow-purple-600/30'
            }`}
          >
            {loading ? (
              <span className="inline-block w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Sign In as {activeTab === 'team' ? 'Team' : 'Administrator'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {activeTab === 'team' && (
          <div className="text-center pt-2 border-t border-slate-800/80">
            <p className="text-sm text-slate-400">
              New team?{' '}
              <Link to="/register" className="font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">
                Register team account
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
