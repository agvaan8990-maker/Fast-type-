import { useState } from 'react';
import { TyperacerGame } from './components/TyperacerGame';
import { Leaderboard } from './components/Leaderboard';
import { Zap } from 'lucide-react';

export default function App() {
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  const handleScoreSaved = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#1A1A1A] font-sans flex flex-col border-[12px] border-black selection:bg-yellow-300 selection:text-black">
      {/* Decorative top tiny status strip */}
      <div className="bg-black text-white px-6 md:px-8 py-2 text-[10px] font-mono tracking-widest flex justify-between items-center border-b-2 border-black overflow-hidden whitespace-nowrap">
        <span>ХЭСГИЙН ДУГААР: TR-8842-XQ // FIRESTORE РЕАЛ-ТАЙМ СИНК</span>
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> СЕРВЕР ИДЭВХТЭЙ
        </span>
      </div>

      {/* Main Container Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12">
        
        {/* Left Side: Game Console Area */}
        <section className="lg:col-span-8 p-6 md:p-8 flex flex-col justify-between gap-8 border-b-4 lg:border-b-0 lg:border-r-4 border-black bg-[#FAFAFA] relative">
          <div className="absolute inset-0 bg-grid-pattern opacity-40 pointer-events-none" />
          
          <div className="relative z-10 space-y-6">
            {/* Header / Brand */}
            <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b-4 border-black pb-6">
              <div>
                <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-none uppercase text-black">
                  TYPE<br />RACER
                </h1>
                <p className="mt-2 font-mono text-xs font-bold text-neutral-600 tracking-tight">// МОНГОЛ ХЭЛНИЙ БИЧИХ ХУРДНЫ УРАЛДААН</p>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                <span className="bg-yellow-400 text-black border-2 border-black font-mono text-xs font-black px-3 py-1 uppercase tracking-wider shadow-brutal-sm">
                  ⚡ ХУРДНЫ УРАЛДААН
                </span>
                <span className="bg-black text-white border-2 border-black font-mono text-xs font-black px-3 py-1 uppercase tracking-wider">
                  МОНГОЛ ХУВИЛБАР
                </span>
              </div>
            </header>

            {/* Game Panel itself */}
            <TyperacerGame onScoreSaved={handleScoreSaved} />
          </div>
        </section>

        {/* Right Side: Sidebar with Leaderboard and info */}
        <aside className="lg:col-span-4 bg-yellow-400 p-6 md:p-8 flex flex-col justify-between border-black relative">
          <div className="space-y-6">
            <Leaderboard refreshTrigger={refreshTrigger} />
          </div>

          {/* Quick tips & Stats info at the bottom of sidebar */}
          <div className="mt-8 pt-6 border-t-4 border-black font-mono text-xs space-y-3 text-black">
            <div className="flex justify-between items-center font-bold">
              <span>СИСТЕМИЙН БАЙДАЛ:</span>
              <span className="text-emerald-950 bg-emerald-400 border border-black font-black px-1.5 py-0.5 text-[10px]">ХОЛБОГДСОН</span>
            </div>
            <div className="flex justify-between items-center font-bold">
              <span>ӨГӨГДЛИЙН САН:</span>
              <span className="font-bold">FIRESTORE ҮҮЛЭН САН</span>
            </div>
            <div className="bg-white p-4 border-4 border-black font-sans text-xs text-black space-y-1.5 shadow-brutal">
              <span className="font-black text-black uppercase tracking-wider block">💡 Бичих зөвлөмж:</span>
              <p className="leading-snug text-neutral-800">
                Зөвхөн одоо бичиж буй үсэгтээ бус, дараагийн үгс рүү урьдчилан харах нь таны хурдыг нэмэгдүүлнэ. Алдаа гарвал Backspace дараарай!
              </p>
            </div>
          </div>
        </aside>
      </div>

      {/* Footer Status Bar */}
      <footer className="bg-black text-white p-4 flex flex-col sm:flex-row justify-between px-6 md:px-8 text-[11px] font-mono tracking-widest uppercase border-t-4 border-black">
        <div>FIRESTORE ӨГӨГДЛИЙН САНД ХОЛБОГДСОН // АЗИ-ЗҮҮН СЕРВЕР</div>
        <div className="flex gap-6 mt-2 sm:mt-0">
          <span>ХОЦРОЛТ: 14МС</span>
          <span>© {new Date().getFullYear()} ТАЙПРАСЕР МН // STABLE_2.0</span>
        </div>
      </footer>
    </div>
  );
}
