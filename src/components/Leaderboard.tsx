import React, { useEffect, useState } from 'react';
import { db, collection, getDocs, query, orderBy, limit, OperationType, handleFirestoreError } from '../firebase';
import { ScoreEntry } from '../types';
import { Trophy, RefreshCw, Star, Medal, Clock } from 'lucide-react';

interface LeaderboardProps {
  refreshTrigger?: number; // pass a trigger number to force refetch when a new score is added
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ refreshTrigger = 0 }) => {
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchScores = async () => {
    setLoading(true);
    setError(null);
    try {
      const q = query(
        collection(db, 'typeracer_scores'),
        orderBy('wpm', 'desc'),
        limit(10)
      );
      
      const querySnapshot = await getDocs(q);
      const fetchedScores: ScoreEntry[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        fetchedScores.push({
          id: doc.id,
          name: data.name || 'Player',
          wpm: Number(data.wpm) || 0,
          errors: Number(data.errors) ?? 0,
          accuracy: Number(data.accuracy) ?? 100,
          vehicle: data.vehicle || 'car',
          timestamp: data.timestamp,
        });
      });
      setScores(fetchedScores);
    } catch (err: any) {
      console.error("Error fetching scores:", err);
      setError("Error loading leaderboard. Please try again.");
      handleFirestoreError(err, OperationType.GET, 'typeracer_scores');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScores();
  }, [refreshTrigger]);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Just now';
    try {
      // If it is a firestore Timestamp
      if (timestamp.seconds) {
        return new Date(timestamp.seconds * 1000).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      }
      return new Date(timestamp).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Unknown';
    }
  };

  const getRankStyle = (index: number) => {
    switch (index) {
      case 0:
        return 'bg-[#FFDE4D] text-black border-2 border-black shadow-brutal-sm font-black';
      case 1:
        return 'bg-[#E5E5E5] text-black border-2 border-black shadow-brutal-sm font-black';
      case 2:
        return 'bg-[#FF9F66] text-black border-2 border-black shadow-brutal-sm font-black';
      default:
        return 'bg-white text-black border-2 border-black font-black';
    }
  };

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <span className="font-mono text-sm font-black text-black">1st</span>;
      case 1:
        return <span className="font-mono text-sm font-black text-black">2nd</span>;
      case 2:
        return <span className="font-mono text-sm font-black text-black">3rd</span>;
      default:
        return <span className="font-mono text-sm font-bold text-black">{index + 1}</span>;
    }
  };

  const getVehicleEmoji = (v: string) => {
    if (v === 'rocket') return '🚀';
    if (v === 'horse') return '🐎';
    if (v === 'ufo') return '🛸';
    if (v === 'dragon') return '🐉';
    if (v === 'skate') return '🛹';
    if (v === 'unicorn') return '🦄';
    if (v === 'turtle') return '🐢';
    if (v === 'plane') return '✈️';
    if (v === 'moto') return '🏍️';
    if (v === 'train') return '🚂';
    if (v === 'ship') return '🚢';
    if (v === 'camel') return '🐪';
    if (v === 'eagle') return '🦅';
    if (v === 'alien') return '👽';
    if (v === 'dino') return '🦖';
    if (v === 'ghost') return '👻';
    if (v === 'bike') return '🚲';
    if (v === 'broom') return '🧹';
    if (v === 'crab') return '🦀';
    return '🚗';
  };

  return (
    <div className="bg-white border-4 border-black p-5 relative shadow-brutal-lg">
      {/* Title / Header */}
      <div className="flex justify-between items-center mb-6 border-b-2 border-black pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-black text-white flex items-center justify-center border-2 border-black shadow-brutal-sm">
            <Trophy className="w-5 h-5 text-yellow-400" />
          </div>
          <div>
            <h2 className="text-xl font-black text-black tracking-tight uppercase">Top 10 Leaders</h2>
            <p className="text-[10px] font-mono text-black/60 uppercase">// COLLECTION: typeracer_scores</p>
          </div>
        </div>
        <button
          onClick={fetchScores}
          className="p-2 bg-black hover:bg-neutral-800 border-2 border-black text-white hover:text-white transition shadow-brutal-sm cursor-pointer flex items-center justify-center"
          title="Refresh"
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-yellow-400' : ''}`} />
        </button>
      </div>

      {/* Leaderboard Table / List */}
      {loading ? (
        <div className="space-y-3 py-10">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 bg-neutral-50 animate-pulse border-2 border-black/10 flex items-center justify-between px-4">
              <div className="flex items-center gap-3 w-1/3">
                <div className="w-8 h-8 bg-neutral-200" />
                <div className="h-4 bg-neutral-200 rounded w-20" />
              </div>
              <div className="h-4 bg-neutral-200 rounded w-12" />
              <div className="h-4 bg-neutral-200 rounded w-16" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="py-12 text-center">
          <p className="text-red-600 font-mono text-xs font-bold mb-3">{error}</p>
          <button
            onClick={fetchScores}
            className="px-4 py-2 bg-black hover:bg-neutral-800 text-white font-black text-xs uppercase border-2 border-black shadow-brutal transition"
          >
            Retry
          </button>
        </div>
      ) : scores.length === 0 ? (
        <div className="py-16 text-center border-4 border-dashed border-black bg-[#FAFAFA]">
          <Star className="w-12 h-12 text-black/20 mx-auto mb-3" />
          <p className="text-black font-black uppercase text-xs">The leaderboard is currently empty</p>
          <p className="text-[10px] font-mono text-black/50 mt-1">// Race to set the first highscore!</p>
        </div>
      ) : (
        <div className="overflow-hidden border-4 border-black bg-[#FAFAFA]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-4 border-black bg-neutral-100 text-[10px] font-black text-black uppercase tracking-wider">
                  <th className="py-2.5 px-3 text-center w-14 border-r-2 border-black">Rank</th>
                  <th className="py-2.5 px-3 border-r-2 border-black">Player</th>
                  <th className="py-2.5 px-3 text-right border-r-2 border-black">Speed (WPM)</th>
                  <th className="py-2.5 px-3 text-right">Accuracy</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-black/80">
                {scores.map((entry, index) => (
                  <tr
                    key={entry.id || index}
                    className="hover:bg-yellow-50 transition-all duration-150 group bg-white"
                  >
                    <td className="py-3 px-3 text-center border-r-2 border-black">
                      <div className={`w-10 h-6 flex items-center justify-center mx-auto ${getRankStyle(index)}`}>
                        {getRankIcon(index)}
                      </div>
                    </td>
                    <td className="py-3 px-3 border-r-2 border-black font-mono font-bold text-xs text-black">
                      <div className="flex items-center gap-1.5">
                        <span className="text-base select-none" title={entry.vehicle}>
                          {getVehicleEmoji(entry.vehicle)}
                        </span>
                        <span className="truncate max-w-[120px]" title={entry.name}>
                          {entry.name.toUpperCase()}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right border-r-2 border-black font-mono font-black text-base text-black">
                      {entry.wpm} <span className="text-[9px] font-normal opacity-60">WPM</span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-xs text-black">
                      <span className="font-bold">{Math.round(entry.accuracy)}%</span>
                      <span className="block text-[8px] text-red-600/80 font-bold uppercase">
                        {entry.errors} ERRORS
                      </span>
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
};
