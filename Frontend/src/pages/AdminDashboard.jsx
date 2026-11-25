import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  Layers, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Play, 
  Square, 
  Trophy, 
  Settings, 
  Radio, 
  ArrowRight,
  TrendingUp,
  History
} from 'lucide-react';
import api from '../services/api';
import { getSocket } from '../services/socket';
import Timer from '../components/Timer';

export default function AdminDashboard() {
  const [competition, setCompetition] = useState(null);
  const [teams, setTeams] = useState([]);
  const [problems, setProblems] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [durationInput, setDurationInput] = useState(120);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchAdminData = async () => {
    try {
      const [compRes, teamRes, probRes, subRes, leadRes] = await Promise.all([
        api.get('/competition'),
        api.get('/admin/teams'),
        api.get('/problems/admin/all'),
        api.get('/submissions/admin/all?limit=20'),
        api.get('/leaderboard'),
      ]);

      if (compRes.data?.success) {
        setCompetition(compRes.data.data);
        setDurationInput(compRes.data.data.duration || 120);
      }
      if (teamRes.data?.success) setTeams(teamRes.data.data);
      if (probRes.data?.success) setProblems(probRes.data.data);
      if (subRes.data?.success) setSubmissions(subRes.data.data);
      if (leadRes.data?.success) setLeaderboard(leadRes.data.data);
    } catch (err) {
      console.error('Failed to load admin overview:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();

    const socket = getSocket();

    const handleNewSub = (newSub) => {
      setSubmissions((prev) => [newSub, ...prev.slice(0, 19)]);
    };

    const handleTeamReg = () => {
      fetchAdminData();
    };

    const handleLeaderboardUpdate = (updated) => {
      if (Array.isArray(updated)) setLeaderboard(updated);
    };

    const handleCompUpdate = () => {
      fetchAdminData();
    };

    socket.on('new_submission', handleNewSub);
    socket.on('team_registered', handleTeamReg);
    socket.on('team_deleted', handleTeamReg);
    socket.on('leaderboard_update', handleLeaderboardUpdate);
    socket.on('competition_status_update', handleCompUpdate);

    return () => {
      socket.off('new_submission', handleNewSub);
      socket.off('team_registered', handleTeamReg);
      socket.off('team_deleted', handleTeamReg);
      socket.off('leaderboard_update', handleLeaderboardUpdate);
      socket.off('competition_status_update', handleCompUpdate);
    };
  }, []);

  const handleStartCompetition = async () => {
    if (!window.confirm('Start competition now? The countdown timer will begin immediately for all teams.')) return;
    setActionLoading(true);
    try {
      await api.post('/competition/admin/start');
      await fetchAdminData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to start competition');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEndCompetition = async () => {
    if (!window.confirm('End competition now? All further team submissions will be blocked.')) return;
    setActionLoading(true);
    try {
      await api.post('/competition/admin/end');
      await fetchAdminData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to end competition');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateDuration = async () => {
    setActionLoading(true);
    try {
      await api.put('/competition/admin/settings', {
        duration: parseInt(durationInput, 10),
      });
      alert('Competition duration updated.');
      await fetchAdminData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update settings');
    } finally {
      setActionLoading(false);
    }
  };

  const acceptedCount = submissions.filter((s) => s.status === 'ACCEPTED').length;
  const rejectedCount = submissions.filter((s) => s.status !== 'ACCEPTED').length;

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Title & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-purple-400">Control Panel</span>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Competition Administration</h1>
        </div>
        <div className="flex items-center space-x-3">
          <Link
            to="/admin/teams"
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all flex items-center space-x-2"
          >
            <Users className="w-4 h-4 text-indigo-400" />
            <span>Manage Teams</span>
          </Link>
          <Link
            to="/admin/problems"
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/30 transition-all flex items-center space-x-2"
          >
            <Layers className="w-4 h-4" />
            <span>Manage Problems</span>
          </Link>
        </div>
      </div>

      {/* Competition Control Station Card */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center space-x-3">
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                competition?.status === 'ACTIVE'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : competition?.status === 'UPCOMING'
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}>
                {competition?.status || 'UPCOMING'}
              </span>
              <h2 className="text-xl font-bold text-white">{competition?.name || 'CodeSprint 2026'}</h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Authoritative server-side timer ensures fair competition across all registered teams.
            </p>
          </div>

          {/* Timer Display */}
          <Timer />
        </div>

        {/* Action Buttons & Config */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          {/* Duration setter */}
          <div className="flex items-center space-x-3 bg-slate-950 p-3 rounded-2xl border border-slate-800">
            <Clock className="w-5 h-5 text-indigo-400 ml-2" />
            <div className="flex-1">
              <label className="block text-[10px] uppercase font-bold text-slate-400">Duration (Minutes)</label>
              <input
                type="number"
                min="10"
                max="600"
                value={durationInput}
                onChange={(e) => setDurationInput(e.target.value)}
                disabled={competition?.status === 'ACTIVE'}
                className="w-full bg-transparent text-white font-mono text-sm font-bold focus:outline-none disabled:opacity-50"
              />
            </div>
            {competition?.status !== 'ACTIVE' && (
              <button
                onClick={handleUpdateDuration}
                disabled={actionLoading}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
              >
                Save
              </button>
            )}
          </div>

          {/* Start Button */}
          <button
            onClick={handleStartCompetition}
            disabled={actionLoading || competition?.status === 'ACTIVE'}
            className="flex items-center justify-center space-x-2 py-3.5 px-6 rounded-2xl font-bold text-sm text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Start Competition</span>
          </button>

          {/* End Button */}
          <button
            onClick={handleEndCompetition}
            disabled={actionLoading || competition?.status !== 'ACTIVE'}
            className="flex items-center justify-center space-x-2 py-3.5 px-6 rounded-2xl font-bold text-sm text-white bg-rose-600 hover:bg-rose-500 shadow-lg shadow-rose-600/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <Square className="w-4 h-4 fill-white" />
            <span>End Competition</span>
          </button>
        </div>
      </div>

      {/* Dynamic Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Teams (Dynamic) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md">
          <div className="text-slate-400 text-xs font-bold uppercase">Dynamic Teams</div>
          <div className="text-3xl font-extrabold text-white mt-2">{teams.length}</div>
          <div className="text-[11px] text-indigo-400 mt-1">Dynamically registered</div>
        </div>

        {/* Problems */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md">
          <div className="text-slate-400 text-xs font-bold uppercase">Problems</div>
          <div className="text-3xl font-extrabold text-white mt-2">{problems.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">Configured challenges</div>
        </div>

        {/* Submissions */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md">
          <div className="text-slate-400 text-xs font-bold uppercase">Submissions</div>
          <div className="text-3xl font-extrabold text-white mt-2">{submissions.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">Across all teams</div>
        </div>

        {/* Accepted */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md">
          <div className="text-slate-400 text-xs font-bold uppercase">Accepted</div>
          <div className="text-3xl font-extrabold text-emerald-400 mt-2">{acceptedCount}</div>
          <div className="text-[11px] text-emerald-500/80 mt-1">Passed all cases</div>
        </div>

        {/* Rejected */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md">
          <div className="text-slate-400 text-xs font-bold uppercase">Rejected / Errors</div>
          <div className="text-3xl font-extrabold text-rose-400 mt-2">{rejectedCount}</div>
          <div className="text-[11px] text-rose-500/80 mt-1">WA, TLE, or CE</div>
        </div>
      </div>

      {/* Two-Column Grid: Live Submissions Monitor & Live Leaderboard Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Live Submissions Feed */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white tracking-tight flex items-center space-x-2">
              <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span>Live Submission Monitoring</span>
            </h3>
            <span className="text-xs text-slate-400">Updates via Socket.IO</span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/70">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Team</th>
                  <th className="py-3 px-4">Problem</th>
                  <th className="py-3 px-4">Lang</th>
                  <th className="py-3 px-4">Verdict</th>
                  <th className="py-3 px-4">Cases</th>
                  <th className="py-3 px-4">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {submissions.length > 0 ? (
                  submissions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-sans font-bold text-white">
                        {sub.user?.teamName || sub.teamName || 'Team'}
                      </td>
                      <td className="py-3 px-4 font-sans text-slate-300">
                        {sub.problem?.title || sub.problemTitle || 'Problem'}
                      </td>
                      <td className="py-3 px-4 uppercase text-slate-400">{sub.language}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          sub.status === 'ACCEPTED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {sub.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {sub.passedTestCases} / {sub.totalTestCases}
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {sub.executionTime ? `${Number(sub.executionTime).toFixed(3)}s` : '-'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 font-sans">
                      No submissions logged yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Live Leaderboard Snapshot */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white tracking-tight flex items-center space-x-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Current Leaderboard</span>
            </h3>
            <Link to="/leaderboard" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center space-x-1">
              <span>Full View</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 space-y-3">
            {leaderboard.slice(0, 6).map((team) => (
              <div
                key={team.id}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-950/80 border border-slate-800/80"
              >
                <div className="flex items-center space-x-3">
                  <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs ${
                    team.rank === 1
                      ? 'bg-amber-400 text-slate-950'
                      : team.rank === 2
                      ? 'bg-slate-300 text-slate-950'
                      : team.rank === 3
                      ? 'bg-amber-700 text-white'
                      : 'bg-slate-800 text-slate-400'
                  }`}>
                    {team.rank}
                  </span>
                  <div>
                    <div className="text-xs font-bold text-white">{team.teamName}</div>
                    <div className="text-[10px] text-slate-500">{team.solvedCount} solved</div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm font-black text-indigo-400 font-mono">{team.totalPoints} <span className="text-[10px] text-slate-500 font-sans">PTS</span></div>
                  <div className="text-[10px] text-purple-400 font-mono font-semibold">Penalty: {team.penaltyFormatted || '0s'}</div>
                </div>
              </div>
            ))}

            {leaderboard.length === 0 && (
              <div className="p-8 text-center text-xs text-slate-500">
                No registered teams on leaderboard yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
