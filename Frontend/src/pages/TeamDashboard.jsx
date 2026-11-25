import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Trophy, 
  CheckCircle2, 
  Clock, 
  Zap, 
  Flame, 
  Layers, 
  ArrowUpRight, 
  Filter,
  AlertCircle,
  History
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { getSocket } from '../services/socket';
import ProblemCard from '../components/ProblemCard';
import Timer from '../components/Timer';

export default function TeamDashboard() {
  const { user } = useAuth();
  const [competition, setCompetition] = useState(null);
  const [problems, setProblems] = useState([]);
  const [mySubmissions, setMySubmissions] = useState([]);
  const [myStats, setMyStats] = useState({
    rank: '-',
    totalScore: 0,
    solvedCount: 0,
    attemptedCount: 0,
  });
  const [filterDifficulty, setFilterDifficulty] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const [compRes, probRes, subRes, leadRes] = await Promise.all([
        api.get('/competition'),
        api.get('/problems'),
        api.get('/submissions/my'),
        api.get('/leaderboard'),
      ]);

      if (compRes.data?.success) setCompetition(compRes.data.data);
      if (probRes.data?.success) setProblems(probRes.data.data);
      if (subRes.data?.success) setMySubmissions(subRes.data.data);

      if (leadRes.data?.success && user) {
        const leaderboard = leadRes.data.data;
        const currentTeamRank = leaderboard.find((t) => t.id === user.id);
        if (currentTeamRank) {
          setMyStats({
            rank: `#${currentTeamRank.rank}`,
            totalScore: currentTeamRank.totalPoints,
            solvedCount: currentTeamRank.solvedCount,
            attemptedCount: probRes.data.data?.filter((p) => p.isAttempted).length || 0,
          });
        } else {
          // Team has 0 points yet
          const solved = probRes.data.data?.filter((p) => p.isSolved).length || 0;
          const attempted = probRes.data.data?.filter((p) => p.isAttempted).length || 0;
          setMyStats({
            rank: '-',
            totalScore: 0,
            solvedCount: solved,
            attemptedCount: attempted,
          });
        }
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    const socket = getSocket();
    const handleLeaderboardUpdate = (updatedLeaderboard) => {
      if (user && Array.isArray(updatedLeaderboard)) {
        const currentTeam = updatedLeaderboard.find((t) => t.id === user.id);
        if (currentTeam) {
          setMyStats((prev) => ({
            ...prev,
            rank: `#${currentTeam.rank}`,
            totalScore: currentTeam.totalPoints,
            solvedCount: currentTeam.solvedCount,
          }));
        }
      }
    };

    const handleCompUpdate = () => {
      fetchDashboardData();
    };

    socket.on('leaderboard_update', handleLeaderboardUpdate);
    socket.on('competition_status_update', handleCompUpdate);

    return () => {
      socket.off('leaderboard_update', handleLeaderboardUpdate);
      socket.off('competition_status_update', handleCompUpdate);
    };
  }, [user]);

  // Filter problems
  const filteredProblems = problems.filter((prob) => {
    if (filterDifficulty !== 'ALL' && prob.difficulty !== filterDifficulty) return false;
    if (filterStatus === 'SOLVED' && !prob.isSolved) return false;
    if (filterStatus === 'UNSOLVED' && prob.isSolved) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-sm text-slate-400 font-mono">Loading CodeArena arena...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900/60 via-slate-900 to-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>{competition?.name || 'CodeSprint 2026'}</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Welcome, <span className="bg-gradient-to-r from-indigo-400 to-emerald-400 bg-clip-text text-transparent">{user?.teamName || user?.username}</span>!
            </h1>
            <p className="text-sm text-slate-400 max-w-2xl">
              Solve problems in your preferred language, submit test cases, and climb the live college leaderboard.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Timer />
            <Link
              to="/leaderboard"
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 transition-all shadow-md"
            >
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Live Leaderboard</span>
              <ArrowUpRight className="w-4 h-4 text-slate-400" />
            </Link>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Score */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Score</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Zap className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-white tracking-tight">{myStats.totalScore}</span>
            <span className="ml-1 text-xs text-indigo-400 font-semibold">pts</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Points earned from accepted solves</div>
        </div>

        {/* Current Rank */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Current Rank</span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Trophy className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-white tracking-tight">{myStats.rank}</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Live position among all teams</div>
        </div>

        {/* Solved Problems */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Solved Problems</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-white tracking-tight">{myStats.solvedCount}</span>
            <span className="text-slate-500 text-sm font-normal"> / {problems.length}</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            {problems.length > 0 ? `${Math.round((myStats.solvedCount / problems.length) * 100)}% completed` : 'No problems'}
          </div>
        </div>

        {/* Attempted Problems */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Attempted</span>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-white tracking-tight">{myStats.attemptedCount}</span>
            <span className="text-slate-500 text-sm font-normal"> / {problems.length}</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">{mySubmissions.length} total submissions made</div>
        </div>
      </div>

      {/* Problems Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
              <Layers className="w-5 h-5 text-indigo-400" />
              <span>Competition Problems</span>
            </h2>
            <p className="text-xs text-slate-400">Select any problem below to launch the online code editor.</p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Difficulty Filter */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs">
              {['ALL', 'EASY', 'MEDIUM', 'HARD'].map((diff) => (
                <button
                  key={diff}
                  onClick={() => setFilterDifficulty(diff)}
                  className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                    filterDifficulty === diff
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {diff}
                </button>
              ))}
            </div>

            {/* Solved Status Filter */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs">
              {['ALL', 'SOLVED', 'UNSOLVED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                    filterStatus === st
                      ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Problems Grid */}
        {filteredProblems.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredProblems.map((prob) => (
              <ProblemCard key={prob.id} problem={prob} />
            ))}
          </div>
        ) : (
          <div className="p-12 text-center bg-slate-900/40 rounded-3xl border border-slate-800">
            <AlertCircle className="w-10 h-10 text-slate-500 mx-auto mb-3" />
            <h4 className="text-base font-semibold text-white">No problems found</h4>
            <p className="text-xs text-slate-400 mt-1">Try resetting the difficulty or status filters.</p>
          </div>
        )}
      </div>

      {/* Recent Submissions Feed */}
      {mySubmissions.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center space-x-2">
              <History className="w-5 h-5 text-indigo-400" />
              <span>Your Recent Submissions</span>
            </h2>
            <span className="text-xs text-slate-400">{mySubmissions.length} submissions</span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Problem</th>
                  <th className="py-3 px-4">Language</th>
                  <th className="py-3 px-4">Verdict</th>
                  <th className="py-3 px-4">Passed Cases</th>
                  <th className="py-3 px-4">Time</th>
                  <th className="py-3 px-4">Submitted At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {mySubmissions.slice(0, 5).map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-sans font-semibold text-white">
                      <Link to={`/problem/${sub.problemId}`} className="hover:text-indigo-400 transition-colors">
                        {sub.problem?.title || 'Problem'}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-slate-300 uppercase">{sub.language}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                        sub.status === 'ACCEPTED'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : sub.status === 'WRONG_ANSWER'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : sub.status === 'TIME_LIMIT_EXCEEDED'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                      }`}>
                        {sub.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {sub.passedTestCases} / {sub.totalTestCases}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {sub.executionTime ? `${sub.executionTime.toFixed(3)}s` : '-'}
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-sans">
                      {new Date(sub.createdAt).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
