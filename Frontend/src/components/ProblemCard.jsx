import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Clock, Zap, ArrowRight, AlertCircle } from 'lucide-react';

export default function ProblemCard({ problem }) {
  const getDifficultyBadge = (difficulty) => {
    switch (difficulty?.toUpperCase()) {
      case 'EASY':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'MEDIUM':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'HARD':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      default:
        return 'bg-slate-700 text-slate-300 border-slate-600';
    }
  };

  return (
    <div className={`group relative rounded-2xl border p-5 transition-all duration-200 hover:shadow-xl ${
      problem.isSolved
        ? 'bg-slate-900/80 border-emerald-500/30 hover:border-emerald-500/60 shadow-emerald-950/20'
        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 shadow-slate-950/40 hover:bg-slate-900/90'
    }`}>
      {/* Top row: Status & Points */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${getDifficultyBadge(problem.difficulty)}`}>
            {problem.difficulty}
          </span>
          <span className="flex items-center space-x-1 text-xs font-semibold text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
            <Zap className="w-3 h-3" />
            <span>{problem.points} pts</span>
          </span>
        </div>

        {problem.isSolved ? (
          <span className="flex items-center space-x-1 text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Solved</span>
          </span>
        ) : problem.isAttempted ? (
          <span className="flex items-center space-x-1 text-xs font-medium text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Attempted</span>
          </span>
        ) : null}
      </div>

      {/* Title */}
      <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-1 mb-2">
        {problem.order ? `${problem.order}. ` : ''}{problem.title}
      </h3>

      {/* Problem limits */}
      <div className="flex items-center space-x-4 text-xs text-slate-400 mb-5">
        <span className="flex items-center space-x-1">
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          <span>{problem.timeLimit || 2.0}s limit</span>
        </span>
        {problem.totalSolves !== undefined && (
          <span>{problem.totalSolves} team{problem.totalSolves === 1 ? '' : 's'} solved</span>
        )}
      </div>

      {/* Action button */}
      <Link
        to={`/problem/${problem.id}`}
        className={`w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all ${
          problem.isSolved
            ? 'bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/20'
            : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25 group-hover:shadow-indigo-600/40'
        }`}
      >
        <span>{problem.isSolved ? 'Review Solution' : 'Solve Challenge'}</span>
        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </Link>
    </div>
  );
}
