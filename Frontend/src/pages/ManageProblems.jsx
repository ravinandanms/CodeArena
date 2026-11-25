import React, { useState, useEffect } from 'react';
import { 
  Layers, 
  Plus, 
  Edit, 
  Trash2, 
  X, 
  PlusCircle, 
  Clock, 
  Zap, 
  Eye, 
  EyeOff,
  AlertCircle
} from 'lucide-react';
import api from '../services/api';

export default function ManageProblems() {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Problem Editor Form State
  const [formData, setFormData] = useState({
    title: '',
    difficulty: 'EASY',
    points: 100,
    timeLimit: 2.0,
    memoryLimit: 256,
    order: 1,
    description: '',
    inputFormat: '',
    outputFormat: '',
    constraints: '',
    testCases: [
      { input: '', expectedOutput: '', isHidden: false, order: 1 },
      { input: '', expectedOutput: '', isHidden: true, order: 2 },
    ],
  });

  const [modalError, setModalError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchProblems = async () => {
    try {
      const res = await api.get('/problems/admin/all');
      if (res.data?.success) {
        setProblems(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load admin problems:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProblems();
  }, []);

  // Open Create Problem Modal
  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({
      title: '',
      difficulty: 'EASY',
      points: 100,
      timeLimit: 2.0,
      memoryLimit: 256,
      order: problems.length + 1,
      description: '',
      inputFormat: '',
      outputFormat: '',
      constraints: '',
      testCases: [
        { input: '', expectedOutput: '', isHidden: false, order: 1 },
        { input: '', expectedOutput: '', isHidden: true, order: 2 },
      ],
    });
    setModalError('');
    setModalOpen(true);
  };

  // Open Edit Problem Modal
  const handleOpenEdit = async (prob) => {
    setEditingId(prob.id);
    setModalError('');
    try {
      const res = await api.get(`/problems/admin/${prob.id}`);
      if (res.data?.success) {
        const fullProb = res.data.data;
        setFormData({
          title: fullProb.title,
          difficulty: fullProb.difficulty,
          points: fullProb.points,
          timeLimit: fullProb.timeLimit,
          memoryLimit: fullProb.memoryLimit,
          order: fullProb.order,
          description: fullProb.description,
          inputFormat: fullProb.inputFormat || '',
          outputFormat: fullProb.outputFormat || '',
          constraints: fullProb.constraints || '',
          testCases: fullProb.testCases || [],
        });
        setModalOpen(true);
      }
    } catch (err) {
      alert('Failed to load problem details for editing');
    }
  };

  // Delete Problem
  const handleDeleteProblem = async (prob) => {
    if (!window.confirm(`Delete problem "${prob.title}"? All submissions and test cases will be deleted.`)) return;
    try {
      await api.delete(`/problems/admin/${prob.id}`);
      await fetchProblems();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete problem');
    }
  };

  // Add Test Case row
  const handleAddTestCase = (isHidden = false) => {
    setFormData((prev) => ({
      ...prev,
      testCases: [
        ...prev.testCases,
        {
          input: '',
          expectedOutput: '',
          isHidden,
          order: prev.testCases.length + 1,
        },
      ],
    }));
  };

  // Remove Test Case row
  const handleRemoveTestCase = (index) => {
    setFormData((prev) => ({
      ...prev,
      testCases: prev.testCases.filter((_, i) => i !== index),
    }));
  };

  // Update Test Case field
  const handleTestCaseChange = (index, field, value) => {
    setFormData((prev) => {
      const updated = [...prev.testCases];
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
      return { ...prev, testCases: updated };
    });
  };

  // Submit Problem Form (Create or Edit)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setModalError('');

    if (!formData.title.trim() || !formData.description.trim()) {
      setModalError('Title and description are required.');
      return;
    }

    if (formData.testCases.length === 0) {
      setModalError('Please add at least one test case.');
      return;
    }

    setSubmitting(true);

    try {
      if (editingId) {
        await api.put(`/problems/admin/${editingId}`, formData);
      } else {
        await api.post('/problems/admin', formData);
      }
      setModalOpen(false);
      await fetchProblems();
    } catch (err) {
      setModalError(err.response?.data?.message || 'Failed to save problem');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-purple-400">Problem Bank</span>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center space-x-2">
            <Layers className="w-8 h-8 text-indigo-400" />
            <span>Manage Problems & Test Cases</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure challenges, sample inputs, and hidden grading test cases for the sprint.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Problem</span>
        </button>
      </div>

      {/* Problems Table */}
      <div className="overflow-x-auto rounded-3xl border border-slate-800 bg-slate-900/70 shadow-2xl">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
            <tr>
              <th className="py-4 px-6">#</th>
              <th className="py-4 px-6">Title</th>
              <th className="py-4 px-6">Difficulty</th>
              <th className="py-4 px-6 text-center">Points</th>
              <th className="py-4 px-6 text-center">Test Cases</th>
              <th className="py-4 px-6 text-center">Solves</th>
              <th className="py-4 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-sans">
            {problems.map((prob) => (
              <tr key={prob.id} className="hover:bg-slate-800/40 transition-colors">
                <td className="py-4 px-6 font-mono text-slate-500">{prob.order || '-'}</td>
                <td className="py-4 px-6">
                  <div className="font-bold text-white text-sm">{prob.title}</div>
                  <div className="text-[11px] text-slate-400">{prob.timeLimit}s limit • {prob.memoryLimit}MB</div>
                </td>
                <td className="py-4 px-6">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    prob.difficulty === 'EASY'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : prob.difficulty === 'MEDIUM'
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}>
                    {prob.difficulty}
                  </span>
                </td>
                <td className="py-4 px-6 text-center font-mono font-bold text-indigo-400">
                  {prob.points}
                </td>
                <td className="py-4 px-6 text-center font-mono">
                  <span className="text-emerald-400">{prob.stats?.sampleTestCases || 0} sample</span>
                  <span className="text-slate-500"> / </span>
                  <span className="text-indigo-400">{prob.stats?.hiddenTestCases || 0} hidden</span>
                </td>
                <td className="py-4 px-6 text-center font-mono text-slate-300">
                  {prob.stats?.totalSolves || 0}
                </td>
                <td className="py-4 px-6 text-right space-x-2">
                  <button
                    onClick={() => handleOpenEdit(prob)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                    title="Edit Problem"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteProblem(prob)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
                    title="Delete Problem"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* CREATE / EDIT PROBLEM MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white">
                {editingId ? 'Edit Problem' : 'Create New Competition Problem'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 rounded-xl bg-rose-500/10 text-rose-300 text-xs border border-rose-500/20">
                {modalError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 text-xs pr-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block uppercase font-bold text-slate-400 mb-1">Title</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                    placeholder="e.g. Valid Anagram"
                  />
                </div>
                <div>
                  <label className="block uppercase font-bold text-slate-400 mb-1">Difficulty</label>
                  <select
                    value={formData.difficulty}
                    onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="EASY">EASY (100 pts)</option>
                    <option value="MEDIUM">MEDIUM (200 pts)</option>
                    <option value="HARD">HARD (300 pts)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block uppercase font-bold text-slate-400 mb-1">Points</label>
                  <input
                    type="number"
                    value={formData.points}
                    onChange={(e) => setFormData({ ...formData, points: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block uppercase font-bold text-slate-400 mb-1">Time Limit (Sec)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.timeLimit}
                    onChange={(e) => setFormData({ ...formData, timeLimit: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block uppercase font-bold text-slate-400 mb-1">Order #</label>
                  <input
                    type="number"
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block uppercase font-bold text-slate-400 mb-1">Description (Markdown supported)</label>
                <textarea
                  rows="4"
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-mono text-xs"
                  placeholder="Problem statement, details, background..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block uppercase font-bold text-slate-400 mb-1">Input Format</label>
                  <textarea
                    rows="2"
                    value={formData.inputFormat}
                    onChange={(e) => setFormData({ ...formData, inputFormat: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block uppercase font-bold text-slate-400 mb-1">Output Format</label>
                  <textarea
                    rows="2"
                    value={formData.outputFormat}
                    onChange={(e) => setFormData({ ...formData, outputFormat: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block uppercase font-bold text-slate-400 mb-1">Constraints</label>
                <input
                  type="text"
                  value={formData.constraints}
                  onChange={(e) => setFormData({ ...formData, constraints: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-xs"
                  placeholder="e.g. 1 <= N <= 10^5"
                />
              </div>

              {/* TEST CASES SECTION */}
              <div className="space-y-3 pt-3 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white">Test Cases & Evaluation Suites</h4>
                    <p className="text-[11px] text-slate-400">Mark cases as Sample (visible to teams) or Hidden (grading only).</p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => handleAddTestCase(false)}
                      className="px-2.5 py-1 rounded-lg text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
                    >
                      + Sample Case
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddTestCase(true)}
                      className="px-2.5 py-1 rounded-lg text-xs bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20"
                    >
                      + Hidden Case
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {formData.testCases.map((tc, index) => (
                    <div key={index} className="p-3 bg-slate-950 rounded-2xl border border-slate-800/90 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-400">#{index + 1}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            tc.isHidden ? 'bg-indigo-500/10 text-indigo-400' : 'bg-emerald-500/10 text-emerald-400'
                          }`}>
                            {tc.isHidden ? 'Hidden Test Case' : 'Sample Test Case'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <label className="flex items-center space-x-1 text-slate-400 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={tc.isHidden}
                              onChange={(e) => handleTestCaseChange(index, 'isHidden', e.target.checked)}
                              className="rounded bg-slate-900 border-slate-700 text-indigo-600"
                            />
                            <span className="text-[11px]">Hidden</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => handleRemoveTestCase(index)}
                            className="text-slate-500 hover:text-rose-400 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] text-slate-500 uppercase font-bold mb-0.5">Input (stdin):</label>
                          <textarea
                            rows="2"
                            value={tc.input}
                            onChange={(e) => handleTestCaseChange(index, 'input', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 font-mono text-[11px] text-slate-200"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 uppercase font-bold mb-0.5">Expected Output (stdout):</label>
                          <textarea
                            rows="2"
                            value={tc.expectedOutput}
                            onChange={(e) => handleTestCaseChange(index, 'expectedOutput', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 font-mono text-[11px] text-emerald-400"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
                >
                  {submitting ? 'Saving...' : 'Save Problem'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
