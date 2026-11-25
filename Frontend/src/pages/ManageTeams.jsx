import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Edit2, 
  KeyRound, 
  Trash2, 
  Power, 
  Search, 
  History, 
  X, 
  AlertCircle, 
  CheckCircle,
  Eye
} from 'lucide-react';
import api from '../services/api';

export default function ManageTeams() {
  const [teams, setTeams] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teamHistory, setTeamHistory] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    teamName: '',
    username: '',
    password: '',
  });
  const [newPassword, setNewPassword] = useState('');
  const [modalError, setModalError] = useState('');
  const [modalSuccess, setModalSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchTeams = async () => {
    try {
      const res = await api.get('/admin/teams');
      if (res.data?.success) {
        setTeams(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load teams:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  // Open Edit Modal
  const handleOpenEdit = (team) => {
    setSelectedTeam(team);
    setFormData({
      teamName: team.teamName,
      username: team.username,
      password: '',
    });
    setModalError('');
    setEditModalOpen(true);
  };

  // Open Reset Password Modal
  const handleOpenReset = (team) => {
    setSelectedTeam(team);
    setNewPassword('');
    setModalError('');
    setResetModalOpen(true);
  };

  // Open View History Modal
  const handleOpenHistory = async (team) => {
    setSelectedTeam(team);
    setHistoryModalOpen(true);
    try {
      const res = await api.get(`/admin/teams/${team.id}`);
      if (res.data?.success) {
        setTeamHistory(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch team details:', err);
    }
  };

  // Toggle Team Active / Disabled
  const handleToggleStatus = async (team) => {
    try {
      await api.patch(`/admin/teams/${team.id}/toggle-status`);
      await fetchTeams();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to toggle status');
    }
  };

  // Delete Team
  const handleDeleteTeam = async (team) => {
    if (!window.confirm(`Are you sure you want to delete team "${team.teamName}"? This will permanently remove their submissions and solves.`)) {
      return;
    }
    try {
      await api.delete(`/admin/teams/${team.id}`);
      await fetchTeams();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete team');
    }
  };

  // Submit Create Team
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setModalError('');
    setSubmitting(true);

    try {
      await api.post('/admin/teams', formData);
      setCreateModalOpen(false);
      setFormData({ teamName: '', username: '', password: '' });
      await fetchTeams();
    } catch (err) {
      setModalError(err.response?.data?.message || 'Failed to create team');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Edit Team
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setModalError('');
    setSubmitting(true);

    try {
      await api.put(`/admin/teams/${selectedTeam.id}`, {
        teamName: formData.teamName,
        username: formData.username,
      });
      setEditModalOpen(false);
      await fetchTeams();
    } catch (err) {
      setModalError(err.response?.data?.message || 'Failed to update team');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Reset Password
  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setModalError('');
    if (newPassword.length < 6) {
      setModalError('Password must be at least 6 characters.');
      return;
    }
    setSubmitting(true);

    try {
      await api.put(`/admin/teams/${selectedTeam.id}/reset-password`, {
        newPassword,
      });
      alert('Password reset successfully.');
      setResetModalOpen(false);
    } catch (err) {
      setModalError(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredTeams = teams.filter((t) =>
    t.teamName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-purple-400">Team Directory</span>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center space-x-2">
            <Users className="w-8 h-8 text-indigo-400" />
            <span>Manage Registered Teams</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Dynamically view, register, edit, disable, or reset passwords for participating teams.
          </p>
        </div>

        <button
          onClick={() => {
            setFormData({ teamName: '', username: '', password: '' });
            setModalError('');
            setCreateModalOpen(true);
          }}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 transition-all self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add Team Manually</span>
        </button>
      </div>

      {/* Filter and Count Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900 p-4 rounded-2xl border border-slate-800">
        <div className="relative w-full sm:w-80">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search teams by name or username..."
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs"
          />
        </div>

        <div className="text-xs text-slate-300 font-semibold">
          Total Teams: <span className="text-indigo-400 font-bold">{teams.length}</span> (No hardcoded limit)
        </div>
      </div>

      {/* Teams Table */}
      <div className="overflow-x-auto rounded-3xl border border-slate-800 bg-slate-900/70 shadow-2xl">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
            <tr>
              <th className="py-4 px-6">Team Name</th>
              <th className="py-4 px-6">Username</th>
              <th className="py-4 px-6 text-center">Score</th>
              <th className="py-4 px-6 text-center text-purple-400">Penalty Time</th>
              <th className="py-4 px-6 text-center">Solves</th>
              <th className="py-4 px-6 text-center">Status</th>
              <th className="py-4 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-sans">
            {filteredTeams.length > 0 ? (
              filteredTeams.map((team) => (
                <tr key={team.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-4 px-6">
                    <div className="font-bold text-white text-sm">{team.teamName}</div>
                    <div className="text-[10px] text-slate-500">Registered {new Date(team.createdAt).toLocaleDateString()}</div>
                  </td>
                  <td className="py-4 px-6 font-mono text-slate-300">
                    @{team.username}
                  </td>
                  <td className="py-4 px-6 text-center font-mono font-bold text-indigo-400 text-sm">
                    {team.totalPoints}
                  </td>
                  <td className="py-4 px-6 text-center font-mono text-xs">
                    <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 font-bold">
                      {team.penaltyFormatted || '0s'}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-center font-semibold text-slate-300">
                    {team.solvedCount}
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      team.isActive
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}>
                      {team.isActive ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right space-x-2">
                    <button
                      onClick={() => handleOpenHistory(team)}
                      title="View Submission History"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 border border-transparent hover:border-indigo-500/20"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleOpenEdit(team)}
                      title="Edit Team"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent hover:border-slate-700"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleOpenReset(team)}
                      title="Reset Password"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 border border-transparent hover:border-amber-500/20"
                    >
                      <KeyRound className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggleStatus(team)}
                      title={team.isActive ? 'Disable Account' : 'Enable Account'}
                      className={`p-1.5 rounded-lg border border-transparent ${
                        team.isActive
                          ? 'text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/20'
                          : 'text-rose-400 hover:text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/20'
                      }`}
                    >
                      <Power className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteTeam(team)}
                      title="Delete Team"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-500">
                  No teams registered or matching search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* CREATE TEAM MODAL */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Add Team Manually</h3>
              <button onClick={() => setCreateModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 rounded-xl bg-rose-500/10 text-rose-300 text-xs border border-rose-500/20">
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block uppercase font-bold text-slate-400 mb-1">Team Name</label>
                <input
                  type="text"
                  required
                  value={formData.teamName}
                  onChange={(e) => setFormData({ ...formData, teamName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  placeholder="e.g. CodeWarriors"
                />
              </div>

              <div>
                <label className="block uppercase font-bold text-slate-400 mb-1">Username</label>
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  placeholder="e.g. codewarriors"
                />
              </div>

              <div>
                <label className="block uppercase font-bold text-slate-400 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  placeholder="Minimum 6 characters"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
                >
                  Create Team
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT TEAM MODAL */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Edit Team Details</h3>
              <button onClick={() => setEditModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 rounded-xl bg-rose-500/10 text-rose-300 text-xs border border-rose-500/20">
                {modalError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block uppercase font-bold text-slate-400 mb-1">Team Name</label>
                <input
                  type="text"
                  required
                  value={formData.teamName}
                  onChange={(e) => setFormData({ ...formData, teamName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block uppercase font-bold text-slate-400 mb-1">Username</label>
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {resetModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Reset Password for {selectedTeam?.teamName}</h3>
              <button onClick={() => setResetModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 rounded-xl bg-rose-500/10 text-rose-300 text-xs border border-rose-500/20">
                {modalError}
              </div>
            )}

            <form onSubmit={handleResetSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block uppercase font-bold text-slate-400 mb-1">New Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  placeholder="Enter new password (min 6 chars)"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResetModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold"
                >
                  Confirm Reset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TEAM HISTORY MODAL */}
      {historyModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full p-6 space-y-4 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-white">{selectedTeam?.teamName}</h3>
                <p className="text-xs text-slate-400">Submission History & Solves</p>
              </div>
              <button onClick={() => setHistoryModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 text-xs font-mono">
              <h4 className="font-sans font-bold text-slate-300">All Submissions ({teamHistory?.submissions?.length || 0})</h4>
              {teamHistory?.submissions?.length > 0 ? (
                <div className="space-y-2">
                  {teamHistory.submissions.map((sub) => (
                    <div key={sub.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                      <div>
                        <div className="font-sans font-semibold text-white">{sub.problem?.title}</div>
                        <div className="text-slate-500 text-[11px]">{sub.passedTestCases}/{sub.totalTestCases} cases • {sub.executionTime}s • {new Date(sub.createdAt).toLocaleTimeString()}</div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        sub.status === 'ACCEPTED' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                      }`}>
                        {sub.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-slate-500 italic p-4 text-center">No submissions recorded for this team yet.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
