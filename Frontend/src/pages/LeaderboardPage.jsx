import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Medal, 
  Award, 
  Clock, 
  Search, 
  Zap, 
  Radio, 
  Flame, 
  CheckCircle2,
  Users
} from 'lucide-react';
import api from '../services/api';
import { getSocket } from '../services/socket';
import { useAuth } from '../context/AuthContext';
import Timer from '../components/Timer';

export default function LeaderboardPage() {
  const { isAdmin } = useAuth();
  const [leaderboard, setLeaderboard] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [recentAlert, setRecentAlert] = useState(null);

  const fetchLeaderboard = async () => {
    try {
      const res = await api.get('/leaderboard');
      if (res.data?.success) {
        setLeaderboard(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();

    const socket = getSocket();

    const handleUpdate = (updatedData) => {
      if (Array.isArray(updatedData)) {
        setLeaderboard(updatedData);
      } else {
        fetchLeaderboard();
      }
    };

    const handleFirstSolveAlert = (alertData) => {
      setRecentAlert(alertData);
      setTimeout(() => setRecentAlert(null), 6000);
    };

    socket.on('leaderboard_update', handleUpdate);
    socket.on('first_solve_alert', handleFirstSolveAlert);

    return () => {
      socket.off('leaderboard_update', handleUpdate);
      socket.off('first_solve_alert', handleFirstSolveAlert);
    };
  }, []);

  const filtered = leaderboard.filter((team) =>
    team.teamName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    team.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const top3 = leaderboard.slice(0, 3);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Live Alert Toast */}
      {recentAlert && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-emerald-500/40 text-white p-4 rounded-2xl shadow-2xl flex items-center space-x-3 animate-bounce">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Flame className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider">First Solve Alert!</div>
            <div className="text-sm font-extrabold text-white">
              {recentAlert.teamName} solved <span className="text-indigo-400">"{recentAlert.problemTitle}"</span>
            </div>
            <div className="text-[11px] text-slate-400">+{recentAlert.points} points awarded</div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold mb-2">
            <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
            <span>Live Standings</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center space-x-3">
            <Trophy className="w-8 h-8 text-amber-400" />
            <span>CodeSprint Leaderboard</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Ranked by total score. When scores are equal, ties are broken automatically by penalty time (fastest solves win).
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Timer />
        </div>
      </div>

      {/* Top 3 Podium */}
      {top3.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {/* Rank 2 (Silver) */}
          {top3[1] ? (
            <div className="relative order-2 md:order-1 rounded-3xl bg-slate-900/60 border border-slate-700/60 p-6 flex flex-col items-center text-center shadow-xl backdrop-blur-md">
              <div className="w-14 h-14 rounded-2xl bg-slate-800 border-2 border-slate-400 flex items-center justify-center text-slate-200 mb-3 shadow-lg">
                <Medal className="w-8 h-8 text-slate-300" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Rank #2</span>
              <h3 className="text-xl font-bold text-white mt-1 line-clamp-1">{top3[1].teamName}</h3>
              <p className="text-xs text-slate-500 font-mono">@{top3[1].username}</p>
              <div className="mt-4 flex items-center space-x-2">
                <span className="text-3xl font-black text-white">{top3[1].totalPoints}</span>
                <span className="text-xs font-bold text-indigo-400">PTS</span>
              </div>
              <div className="mt-2 text-xs text-slate-400">
                {top3[1].solvedCount} problems solved
              </div>
            </div>
          ) : <div className="order-2 md:order-1" />}

          {/* Rank 1 (Gold) */}
          {top3[0] && (
            <div className="relative order-1 md:order-2 rounded-3xl bg-gradient-to-b from-amber-500/10 via-slate-900/90 to-slate-900 border-2 border-amber-500/40 p-7 flex flex-col items-center text-center shadow-2xl shadow-amber-500/10 backdrop-blur-md md:-translate-y-2">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-amber-400 mb-3 shadow-lg shadow-amber-500/20">
                <Trophy className="w-9 h-9 text-amber-400" />
              </div>
              <span className="text-xs font-extrabold uppercase tracking-widest text-amber-400">Tournament Leader #1</span>
              <h3 className="text-2xl font-black text-white mt-1 line-clamp-1">{top3[0].teamName}</h3>
              <p className="text-xs text-amber-300/80 font-mono">@{top3[0].username}</p>
              <div className="mt-4 flex items-center space-x-2">
                <span className="text-4xl font-black text-amber-300">{top3[0].totalPoints}</span>
                <span className="text-sm font-bold text-amber-400">PTS</span>
              </div>
              <div className="mt-2 text-xs text-slate-300 font-semibold flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>{top3[0].solvedCount} problems solved</span>
              </div>
            </div>
          )}

          {/* Rank 3 (Bronze) */}
          {top3[2] ? (
            <div className="relative order-3 rounded-3xl bg-slate-900/60 border border-amber-900/50 p-6 flex flex-col items-center text-center shadow-xl backdrop-blur-md">
              <div className="w-14 h-14 rounded-2xl bg-amber-950/40 border-2 border-amber-700 flex items-center justify-center text-amber-600 mb-3 shadow-lg">
                <Award className="w-8 h-8 text-amber-600" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-600">Rank #3</span>
              <h3 className="text-xl font-bold text-white mt-1 line-clamp-1">{top3[2].teamName}</h3>
              <p className="text-xs text-slate-500 font-mono">@{top3[2].username}</p>
              <div className="mt-4 flex items-center space-x-2">
                <span className="text-3xl font-black text-white">{top3[2].totalPoints}</span>
                <span className="text-xs font-bold text-indigo-400">PTS</span>
              </div>
              <div className="mt-2 text-xs text-slate-400">
                {top3[2].solvedCount} problems solved
              </div>
            </div>
          ) : <div className="order-3" />}
        </div>
      )}

      {/* Search & Stats Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search teams..."
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs"
          />
        </div>

        <div className="text-xs text-slate-400 flex items-center space-x-2">
          <Users className="w-4 h-4 text-indigo-400" />
          <span>{leaderboard.length} dynamic teams registered</span>
        </div>
      </div>

      {/* Main Leaderboard Table */}
      <div className="overflow-x-auto rounded-3xl border border-slate-800 bg-slate-900/70 shadow-2xl">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
            <tr>
              <th className="py-4 px-6 text-center w-16">Rank</th>
              <th className="py-4 px-6">Team Name</th>
              <th className="py-4 px-6 text-center">Score</th>
              <th className="py-4 px-6 text-center">Solved</th>
              {isAdmin && <th className="py-4 px-6 text-center text-purple-400">Penalty Time (Admin)</th>}
              <th className="py-4 px-6">Problem Breakdown</th>
              <th className="py-4 px-6 text-right">Last Solved At</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {filtered.length > 0 ? (
              filtered.map((team) => (
                <tr
                  key={team.id}
                  className={`hover:bg-slate-800/40 transition-colors ${
                    team.rank === 1
                      ? 'bg-amber-500/5'
                      : team.rank === 2
                      ? 'bg-slate-500/5'
                      : team.rank === 3
                      ? 'bg-amber-900/5'
                      : ''
                  }`}
                >
                  {/* Rank */}
                  <td className="py-4 px-6 text-center font-sans">
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-xl font-black text-xs ${
                      team.rank === 1
                        ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                        : team.rank === 2
                        ? 'bg-slate-300 text-slate-950'
                        : team.rank === 3
                        ? 'bg-amber-700 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {team.rank}
                    </span>
                  </td>

                  {/* Team */}
                  <td className="py-4 px-6 font-sans">
                    <div className="font-bold text-white text-sm">{team.teamName}</div>
                    <div className="text-[11px] text-slate-500 font-mono">@{team.username}</div>
                  </td>

                  {/* Score */}
                  <td className="py-4 px-6 text-center">
                    <span className="text-base font-extrabold text-indigo-400">{team.totalPoints}</span>
                  </td>

                  {/* Solved Count */}
                  <td className="py-4 px-6 text-center font-sans font-semibold text-slate-300">
                    {team.solvedCount}
                  </td>

                  {/* Penalty Time (Hidden from contestants, visible only to Admin!) */}
                  {isAdmin && (
                    <td className="py-4 px-6 text-center">
                      <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 font-mono text-[11px] font-bold">
                        {team.penaltyFormatted || '0s'}
                      </span>
                    </td>
                  )}

                  {/* Problems Breakdown */}
                  <td className="py-4 px-6">
                    <div className="flex flex-wrap gap-1.5 max-w-md">
                      {team.solvedProblems && team.solvedProblems.length > 0 ? (
                        team.solvedProblems.map((sp, idx) => (
                          <span
                            key={idx}
                            title={`${sp.title} (+${sp.points} pts)`}
                            className={`px-2 py-0.5 rounded text-[10px] font-sans font-bold flex items-center space-x-1 ${
                              sp.difficulty === 'EASY'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : sp.difficulty === 'MEDIUM'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}
                          >
                            <span>{sp.title}</span>
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-600 font-sans text-xs italic">No solves yet</span>
                      )}
                    </div>
                  </td>

                  {/* Last Solved At */}
                  <td className="py-4 px-6 text-right text-slate-400 font-sans text-xs">
                    {team.lastSolvedAt ? (
                      <span className="flex items-center justify-end space-x-1">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>{new Date(team.lastSolvedAt).toLocaleTimeString()}</span>
                      </span>
                    ) : (
                      <span className="text-slate-600">-</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-500 font-sans">
                  No teams registered or matching search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
