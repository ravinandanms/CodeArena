import React, { useState, useEffect } from 'react';
import { Clock, PlayCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import api from '../services/api';
import { getSocket } from '../services/socket';

export default function Timer({ onStatusChange, compact = false }) {
  const [competition, setCompetition] = useState(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  const fetchCompetition = async () => {
    try {
      const res = await api.get('/competition');
      if (res.data?.success) {
        const comp = res.data.data;
        setCompetition(comp);
        setRemainingSeconds(comp.remainingSeconds || 0);
        if (onStatusChange) onStatusChange(comp.status);
      }
    } catch (err) {
      console.warn('Failed to fetch competition status:', err.message);
    }
  };

  useEffect(() => {
    fetchCompetition();

    const socket = getSocket();
    const handleStatusUpdate = () => {
      fetchCompetition();
    };

    socket.on('competition_status_update', handleStatusUpdate);
    socket.on('competition_settings_update', handleStatusUpdate);

    return () => {
      socket.off('competition_status_update', handleStatusUpdate);
      socket.off('competition_settings_update', handleStatusUpdate);
    };
  }, []);

  // Local second-by-second countdown
  useEffect(() => {
    if (!competition || competition.status !== 'ACTIVE' || remainingSeconds <= 0) return;

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          fetchCompetition(); // re-sync with server
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [competition?.status, remainingSeconds]);

  const formatTime = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  if (!competition) return null;

  const isLowTime = competition.status === 'ACTIVE' && remainingSeconds < 300 && remainingSeconds > 0;

  if (compact) {
    return (
      <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border text-xs font-mono font-medium ${
        competition.status === 'ACTIVE'
          ? isLowTime
            ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 animate-pulse'
            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
          : competition.status === 'UPCOMING'
          ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
          : 'bg-slate-800 border-slate-700 text-slate-400'
      }`}>
        <span className={`w-2 h-2 rounded-full ${
          competition.status === 'ACTIVE' ? 'bg-emerald-400 animate-ping' : competition.status === 'UPCOMING' ? 'bg-amber-400' : 'bg-slate-500'
        }`} />
        <span>{competition.status}</span>
        {competition.status === 'ACTIVE' && (
          <span className="font-bold tracking-wider">{formatTime(remainingSeconds)}</span>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-3 px-4 py-2 rounded-xl border backdrop-blur-md shadow-sm transition-all ${
      competition.status === 'ACTIVE'
        ? isLowTime
          ? 'bg-rose-950/40 border-rose-600/40 text-rose-300 ring-1 ring-rose-500/30 animate-pulse'
          : 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
        : competition.status === 'UPCOMING'
        ? 'bg-amber-950/30 border-amber-500/30 text-amber-300'
        : 'bg-slate-900/60 border-slate-800 text-slate-400'
    }`}>
      {competition.status === 'ACTIVE' ? (
        <Clock className={`w-5 h-5 ${isLowTime ? 'text-rose-400' : 'text-emerald-400 animate-spin-slow'}`} />
      ) : competition.status === 'UPCOMING' ? (
        <AlertTriangle className="w-5 h-5 text-amber-400" />
      ) : (
        <CheckCircle className="w-5 h-5 text-slate-400" />
      )}

      <div>
        <div className="text-[10px] uppercase font-bold tracking-wider opacity-75">
          {competition.status === 'ACTIVE' ? 'Remaining Time' : competition.status === 'UPCOMING' ? 'Competition Status' : 'Event Concluded'}
        </div>
        <div className="font-mono text-base font-bold tracking-widest">
          {competition.status === 'ACTIVE' ? (
            formatTime(remainingSeconds)
          ) : competition.status === 'UPCOMING' ? (
            'STARTING SOON'
          ) : (
            'COMPLETED'
          )}
        </div>
      </div>
    </div>
  );
}
