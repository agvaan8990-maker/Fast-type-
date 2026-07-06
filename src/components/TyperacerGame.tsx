import React, { useState, useEffect, useRef } from 'react';
import { db, collection, addDoc, serverTimestamp, OperationType, handleFirestoreError } from '../firebase';
import { MON_SENTENCES, Sentence } from '../data/sentences';
import { VehicleType, GameState } from '../types';
import { VehicleTrack } from './VehicleTrack';
import { 
  Flame, 
  RotateCcw, 
  Play, 
  User, 
  Award, 
  Keyboard, 
  AlertTriangle, 
  Check, 
  Hourglass,
  Gauge,
  Sparkles,
  BookOpen
} from 'lucide-react';

interface TyperacerGameProps {
  onScoreSaved: () => void; // Callback to notify Leaderboard to refresh
}

export const TyperacerGame: React.FC<TyperacerGameProps> = ({ onScoreSaved }) => {
  // Game Configuration State
  const [name, setName] = useState<string>(() => {
    return localStorage.getItem('typeracer_player_name') || '';
  });
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleType>('car');
  const [selectedSentence, setSelectedSentence] = useState<Sentence>(MON_SENTENCES[0]);
  const [difficultyFilter, setDifficultyFilter] = useState<'All' | 'Easy' | 'Medium' | 'Hard'>('All');

  // Game Engine State
  const [gameState, setGameState] = useState<GameState>('idle');
  const [countdown, setCountdown] = useState<number>(3);
  const [inputValue, setInputValue] = useState<string>('');
  
  // Stats tracking
  const [startTime, setStartTime] = useState<number | null>(null);
  const [endTime, setEndTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [errors, setErrors] = useState<number>(0);
  const [prevInputLength, setPrevInputLength] = useState<number>(0);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  // References
  const inputRef = useRef<HTMLInputElement>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load a random sentence based on difficulty filter
  const selectRandomSentence = (filter: 'All' | 'Easy' | 'Medium' | 'Hard' = difficultyFilter) => {
    const filtered = MON_SENTENCES.filter(
      s => filter === 'All' || s.difficulty === filter
    );
    const randomIndex = Math.floor(Math.random() * filtered.length);
    setSelectedSentence(filtered[randomIndex] || MON_SENTENCES[0]);
    resetGameEngine();
  };

  // Reset engine states
  const resetGameEngine = () => {
    setGameState('idle');
    setInputValue('');
    setErrors(0);
    setPrevInputLength(0);
    setStartTime(null);
    setEndTime(null);
    setElapsedTime(0);
    setSaveSuccess(false);
    setErrorText(null);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
  };

  // Handle countdown before game starts
  const startCountdown = () => {
    if (!name.trim()) {
      setErrorText("Please enter your name to start playing.");
      return;
    }
    // Save name in localStorage
    localStorage.setItem('typeracer_player_name', name.trim());
    setErrorText(null);
    setGameState('countdown');
    setCountdown(3);
    setInputValue('');
    setErrors(0);
    setPrevInputLength(0);
    setStartTime(null);
    setEndTime(null);
    setElapsedTime(0);
    setSaveSuccess(false);

    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownIntervalRef.current!);
          startGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Start the actual typing game
  const startGame = () => {
    setGameState('playing');
    const start = Date.now();
    setStartTime(start);
    
    // Focus the input automatically
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 50);

    // Live timer
    timerIntervalRef.current = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - start) / 1000));
    }, 1000);
  };

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

  // Handle typing input changes and error tracking
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const targetText = selectedSentence.text;

    // Only allow typing up to target sentence length
    if (value.length > targetText.length) return;

    // Track errors: If they typed a new character and it does not match
    if (value.length > prevInputLength) {
      const addedCharIndex = value.length - 1;
      if (value[addedCharIndex] !== targetText[addedCharIndex]) {
        setErrors((prev) => prev + 1);
      }
    }

    setInputValue(value);
    setPrevInputLength(value.length);

    // Check if finished and matches 100%
    if (value === targetText) {
      finishGame();
    }
  };

  // Finish the game
  const finishGame = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    const end = Date.now();
    setEndTime(end);
    setGameState('completed');
  };

  // Game stats calculations
  const getElapsedSeconds = () => {
    if (gameState === 'completed' && startTime && endTime) {
      return (endTime - startTime) / 1000;
    }
    return elapsedTime;
  };

  const getWPM = () => {
    const secs = getElapsedSeconds();
    if (secs === 0) return 0;
    const chars = inputValue.length;
    const wpm = (chars / 5) / (secs / 60);
    return Math.round(wpm);
  };

  const getAccuracy = () => {
    const typedLength = inputValue.length;
    if (typedLength === 0) return 100;
    const totalAttempts = typedLength + errors;
    const accuracy = (typedLength / totalAttempts) * 100;
    return Math.round(accuracy);
  };

  // Submit score to Firestore
  const submitScore = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    setErrorText(null);

    const wpm = getWPM();
    const accuracy = getAccuracy();

    try {
      await addDoc(collection(db, 'typeracer_scores'), {
        name: name.trim(),
        wpm: wpm,
        errors: errors,
        accuracy: accuracy,
        vehicle: selectedVehicle,
        sentenceId: selectedSentence.id,
        timestamp: serverTimestamp()
      });
      setSaveSuccess(true);
      onScoreSaved(); // trigger leaderboard reload
    } catch (err: any) {
      console.error("Error saving score:", err);
      setErrorText("Error saving score. Please try again.");
      handleFirestoreError(err, OperationType.CREATE, 'typeracer_scores');
    } finally {
      setIsSaving(false);
    }
  };

  // Highlight character logic
  const renderHighlightedSentence = () => {
    const text = selectedSentence.text;
    const typed = inputValue;

    return (
      <div className="text-2xl md:text-3xl leading-relaxed font-sans font-bold tracking-tight text-black transition-all duration-300 select-none">
        {text.split('').map((char, index) => {
          let charClass = 'text-black opacity-30'; // untouched / future characters
          let bgClass = '';

          if (index < typed.length) {
            if (typed[index] === char) {
              charClass = 'text-green-600 font-extrabold';
              bgClass = 'bg-green-50';
            } else {
              charClass = 'text-red-600 font-extrabold underline decoration-red-600 decoration-4';
              bgClass = 'bg-red-100';
            }
          } else if (index === typed.length) {
            // Current cursor character
            charClass = 'text-black font-black bg-yellow-300 underline decoration-black decoration-4 underline-offset-4';
            bgClass = gameState === 'playing' ? 'animate-pulse' : '';
          }

          return (
            <span
              key={index}
              className={`inline-block px-[1px] transition-all duration-150 rounded-none ${charClass} ${bgClass}`}
            >
              {char === ' ' ? '\u00A0' : char}
            </span>
          );
        })}
      </div>
    );
  };

  // Filter change helper
  const handleDifficultyFilterChange = (filter: 'All' | 'Easy' | 'Medium' | 'Hard') => {
    setDifficultyFilter(filter);
    selectRandomSentence(filter);
  };

  // Compute live progress percentage
  const progressPercentage = selectedSentence.text.length > 0 
    ? (inputValue.length / selectedSentence.text.length) * 100 
    : 0;

  return (
    <div className="space-y-6">
      {/* 1. SETUP BAR / MODE SELECTOR (Only visible when idle or completed) */}
      {(gameState === 'idle' || gameState === 'completed') && (
        <div className="bg-white border-4 border-black p-6 md:p-8 shadow-brutal-lg space-y-6 relative overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Player Profile & Vehicle */}
            <div className="space-y-4">
              <h3 className="text-sm font-black text-black uppercase tracking-wider flex items-center gap-2">
                <User className="w-5 h-5 text-black" /> Player Configuration
              </h3>
              
              {/* Name Input */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="PLAYER NAME..."
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errorText) setErrorText(null);
                  }}
                  maxLength={15}
                  className="w-full bg-white border-4 border-black px-5 py-4 pl-12 text-black font-mono font-bold uppercase tracking-tight placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:bg-yellow-50 shadow-brutal-sm"
                />
                <User className="w-5 h-5 text-black absolute left-4 top-1/2 -translate-y-1/2" />
              </div>

              {/* Vehicle Picker */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-black tracking-tight">Choose your vehicle:</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2">
                  {(['car', 'rocket', 'horse', 'ufo', 'dragon', 'skate', 'unicorn', 'turtle', 'plane', 'moto', 'train', 'ship', 'camel', 'eagle', 'alien', 'dino', 'ghost', 'bike', 'broom', 'crab'] as VehicleType[]).map((v) => {
                    const icons: Record<VehicleType, string> = {
                      car: '🚗',
                      rocket: '🚀',
                      horse: '🐎',
                      ufo: '🛸',
                      dragon: '🐉',
                      skate: '🛹',
                      unicorn: '🦄',
                      turtle: '🐢',
                      plane: '✈️',
                      moto: '🏍️',
                      train: '🚂',
                      ship: '🚢',
                      camel: '🐪',
                      eagle: '🦅',
                      alien: '👽',
                      dino: '🦖',
                      ghost: '👻',
                      bike: '🚲',
                      broom: '🧹',
                      crab: '🦀',
                    };
                    const names: Record<VehicleType, string> = {
                      car: 'Car',
                      rocket: 'Rocket',
                      horse: 'Horse',
                      ufo: 'UFO',
                      dragon: 'Dragon',
                      skate: 'Skate',
                      unicorn: 'Unicorn',
                      turtle: 'Turtle',
                      plane: 'Plane',
                      moto: 'Moto',
                      train: 'Train',
                      ship: 'Ship',
                      camel: 'Camel',
                      eagle: 'Eagle',
                      alien: 'Alien',
                      dino: 'Dino',
                      ghost: 'Ghost',
                      bike: 'Bike',
                      broom: 'Broom',
                      crab: 'Crab',
                    };
                    const isSelected = selectedVehicle === v;
                    return (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setSelectedVehicle(v)}
                        className={`py-2 px-1 border-4 border-black flex flex-col items-center justify-center gap-1 transition-all duration-150 cursor-pointer ${
                          isSelected
                            ? 'bg-yellow-400 text-black shadow-brutal font-black scale-105'
                            : 'bg-white text-black/60 hover:bg-neutral-50 shadow-brutal-sm'
                        }`}
                      >
                        <span className="text-2xl filter drop-shadow-[1px_1px_0px_#000]">{icons[v]}</span>
                        <span className="text-[10px] uppercase font-black tracking-tight">{names[v]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Sentence selection */}
            <div className="space-y-4">
              <h3 className="text-sm font-black text-black uppercase tracking-wider flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-black" /> Sentence Selection
              </h3>

              {/* Difficulty Level Selector */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-black tracking-tight">Difficulty Level:</label>
                <div className="flex gap-2">
                  {(['All', 'Easy', 'Medium', 'Hard'] as const).map((diff) => (
                    <button
                      key={diff}
                      type="button"
                      onClick={() => handleDifficultyFilterChange(diff)}
                      className={`flex-1 py-2 text-xs font-black uppercase border-2 border-black transition-all cursor-pointer ${
                        difficultyFilter === diff
                          ? 'bg-yellow-400 text-black shadow-brutal-sm'
                          : 'bg-white text-black/60 hover:bg-neutral-50'
                      }`}
                    >
                      {diff}
                    </button>
                  ))}
                </div>
              </div>

              {/* Randomizer Card */}
              <div className="p-4 border-4 border-black bg-neutral-50 space-y-3 shadow-brutal-sm">
                <div className="flex justify-between items-center border-b border-black pb-1.5">
                  <span className="text-[10px] font-mono font-black text-black/50">
                    LENGTH: {selectedSentence.text.length} CHARS
                  </span>
                  <span className={`text-[9px] font-black px-2 py-0.5 uppercase border border-black ${
                    selectedSentence.difficulty === 'Easy' ? 'bg-green-100 text-green-800' :
                    selectedSentence.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {selectedSentence.difficulty}
                  </span>
                </div>
                <p className="text-xs text-black leading-snug italic font-medium">
                  "{selectedSentence.text}"
                </p>
                <button
                  type="button"
                  onClick={() => selectRandomSentence()}
                  className="w-full py-2 bg-black hover:bg-neutral-800 text-white font-black uppercase text-[10px] tracking-wider border-2 border-black transition cursor-pointer"
                >
                  Change Sentence ↺
                </button>
              </div>
            </div>

          </div>

          {/* Action Trigger */}
          <div className="pt-4 flex flex-col items-center border-t-2 border-black">
            {errorText && (
              <p className="text-red-600 text-xs font-bold flex items-center gap-1.5 mb-4">
                <AlertTriangle className="w-4 h-4" /> {errorText.toUpperCase()}
              </p>
            )}
            <button
              onClick={startCountdown}
              disabled={!name.trim()}
              className="px-10 py-5 bg-yellow-400 hover:bg-yellow-300 disabled:bg-neutral-200 disabled:text-neutral-400 text-black border-4 border-black font-black text-xl uppercase tracking-widest shadow-brutal transition-all transform hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none duration-150 flex items-center gap-2.5 cursor-pointer"
            >
              <Play className="w-5 h-5 fill-current" /> START THE RACE →
            </button>
          </div>
        </div>
      )}

      {/* 2. RACING AREA (Visible when counting down, playing or completed) */}
      {gameState !== 'idle' && (
        <div className="space-y-6">
          {/* Real-time Racetrack */}
          <VehicleTrack
            progress={progressPercentage}
            selectedVehicle={selectedVehicle}
            gameState={gameState}
          />

          {/* Countdown Overlay or Active Board */}
          {gameState === 'countdown' && (
            <div className="bg-white border-4 border-black p-12 shadow-brutal-lg flex flex-col items-center justify-center min-h-[220px]">
              <span className="text-xs font-black text-black uppercase tracking-widest mb-3">// GET READY //</span>
              <div className="text-8xl font-black text-black animate-bounce font-mono">
                {countdown > 0 ? countdown : 'GO!'}
              </div>
              <p className="text-xs font-bold text-neutral-500 mt-4 uppercase">Get ready, prepare your fingers!</p>
            </div>
          )}

          {/* Active Typing Screen */}
          {gameState === 'playing' && (
            <div className="bg-white border-4 border-black p-6 md:p-8 shadow-brutal-lg space-y-6">
              
              {/* Dynamic Stats Row */}
              <div className="flex justify-between items-center border-b-4 border-black pb-4">
                <div className="flex gap-6 md:gap-12">
                  <div className="flex items-center gap-2">
                    <Gauge className="w-5 h-5 text-black" />
                    <div>
                      <span className="block text-[9px] text-neutral-500 font-black uppercase tracking-tight">Speed</span>
                      <span className="font-mono text-2xl font-black text-black tabular-nums">{getWPM()} <span className="text-xs">WPM</span></span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Flame className="w-5 h-5 text-black" />
                    <div>
                      <span className="block text-[9px] text-neutral-500 font-black uppercase tracking-tight">Accuracy</span>
                      <span className="font-mono text-2xl font-black text-black tabular-nums">{getAccuracy()}%</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <div>
                      <span className="block text-[9px] text-neutral-500 font-black uppercase tracking-tight">Errors</span>
                      <span className="font-mono text-2xl font-black text-red-600 tabular-nums">{errors}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 bg-black text-white border-2 border-black px-4 py-2 font-mono text-sm font-black">
                  <Hourglass className="w-4 h-4 text-yellow-400 animate-spin" />
                  <span>{elapsedTime}S</span>
                </div>
              </div>

              {/* Target Sentence Display */}
              <div className="bg-white border-4 border-black p-6 md:p-8 relative min-h-[140px] flex items-center justify-center shadow-inner">
                <div className="absolute top-[-14px] left-6 bg-black text-white px-3 py-1 text-[10px] font-black uppercase tracking-tighter italic border border-black">
                  TYPE NOW // CURRENT SENTENCE
                </div>
                {renderHighlightedSentence()}
              </div>

              {/* Interactive Input Field */}
              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={handleInputChange}
                  placeholder="START TYPING HERE..."
                  autoComplete="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  className="w-full bg-white border-4 border-black p-6 text-2xl md:text-3xl font-mono font-bold text-black placeholder-neutral-400 focus:outline-none focus:bg-yellow-50 focus:ring-2 focus:ring-yellow-400 shadow-brutal-lg uppercase"
                />
                
                {/* Cancel Game Button */}
                <button
                  type="button"
                  onClick={resetGameEngine}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2.5 bg-black hover:bg-neutral-800 text-white border-2 border-black transition shadow-brutal-sm cursor-pointer"
                  title="Cancel race"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* 3. GAME COMPLETED SUMMARY & ACTIONS */}
          {gameState === 'completed' && (
            <div className="bg-white border-4 border-black p-6 md:p-8 shadow-brutal-lg space-y-6">
              
              {/* Completed Message Header */}
              <div className="text-center space-y-2 border-b-4 border-black pb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-400 border-4 border-black text-black shadow-brutal mb-2">
                  <Sparkles className="w-8 h-8" />
                </div>
                <h2 className="text-3xl md:text-5xl font-black text-black tracking-tighter uppercase leading-none">RACE FINISHED! 🏁</h2>
                <p className="text-xs font-mono text-neutral-500 uppercase tracking-tight mt-2">// COMPLETED SUCCESSFULLY</p>
              </div>

              {/* Stats Card Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white border-4 border-black p-4 text-center shadow-brutal-sm">
                  <span className="block text-[10px] text-neutral-500 font-black uppercase tracking-wider mb-1">Typing Speed</span>
                  <span className="block font-mono text-4xl font-black text-black">{getWPM()}</span>
                  <span className="text-[10px] font-black uppercase text-black/60">Words / Minute (WPM)</span>
                </div>
                <div className="bg-white border-4 border-black p-4 text-center shadow-brutal-sm">
                  <span className="block text-[10px] text-neutral-500 font-black uppercase tracking-wider mb-1">Accuracy</span>
                  <span className="block font-mono text-4xl font-black text-black">{getAccuracy()}%</span>
                  <span className="text-[10px] font-black uppercase text-black/60">CORRECT KEYS</span>
                </div>
                <div className="bg-white border-4 border-black p-4 text-center shadow-brutal-sm">
                  <span className="block text-[10px] text-neutral-500 font-black uppercase tracking-wider mb-1">Errors</span>
                  <span className="block font-mono text-4xl font-black text-red-600">{errors}</span>
                  <span className="text-[10px] font-black uppercase text-red-600/80">TOTAL ERRORS</span>
                </div>
                <div className="bg-white border-4 border-black p-4 text-center shadow-brutal-sm">
                  <span className="block text-[10px] text-neutral-500 font-black uppercase tracking-wider mb-1">Time</span>
                  <span className="block font-mono text-4xl font-black text-black">{getElapsedSeconds().toFixed(1)}s</span>
                  <span className="text-[10px] font-black uppercase text-black/60">ELAPSED TIME</span>
                </div>
              </div>

              {/* Save Score Action Card */}
              {!saveSuccess ? (
                <div className="bg-[#FFDE4D] border-4 border-black p-5 md:p-6 shadow-brutal space-y-4 text-black">
                  <div className="flex items-center gap-3">
                    <Award className="w-6 h-6 text-black" />
                    <div>
                      <h4 className="text-base font-black uppercase tracking-tight">Save Score to Leaderboard</h4>
                      <p className="text-xs font-bold text-black/70">Compete with top typists with this performance.</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        placeholder="ENTER YOUR NAME..."
                        value={name}
                        onChange={(e) => {
                          setName(e.target.value);
                          if (errorText) setErrorText(null);
                        }}
                        maxLength={15}
                        className="w-full bg-white border-4 border-black px-4 py-3 pl-10 text-black font-mono font-bold uppercase tracking-tight text-sm focus:outline-none"
                      />
                      <User className="w-4 h-4 text-black absolute left-3.5 top-1/2 -translate-y-1/2" />
                    </div>
                    
                    <button
                      onClick={submitScore}
                      disabled={isSaving || !name.trim()}
                      className="px-6 py-3 bg-black hover:bg-neutral-800 disabled:bg-neutral-200 disabled:text-neutral-500 text-white font-black text-xs uppercase border-4 border-black shadow-brutal-sm transition cursor-pointer flex items-center justify-center gap-2 shrink-0"
                    >
                      {isSaving ? 'SAVING...' : 'SAVE SCORE'}
                    </button>
                  </div>
                  
                  {errorText && (
                    <p className="text-red-600 text-xs font-black flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4" /> {errorText.toUpperCase()}
                    </p>
                  )}
                </div>
              ) : (
                <div className="bg-green-100 border-4 border-black p-4 flex items-center gap-3 shadow-brutal-sm">
                  <div className="w-10 h-10 bg-green-500 text-white border-2 border-black flex items-center justify-center shadow-brutal-sm">
                    <Check className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black uppercase text-green-950">SCORE SAVED SUCCESSFULLY!</h4>
                    <p className="text-xs font-bold text-green-800">Check your ranking on the live leaderboard below.</p>
                  </div>
                </div>
              )}

              {/* Play Again Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4 justify-center border-t-2 border-black/10">
                <button
                  onClick={() => selectRandomSentence()}
                  className="px-6 py-4 bg-white hover:bg-neutral-50 text-black font-black uppercase text-sm border-4 border-black shadow-brutal transition cursor-pointer flex items-center justify-center gap-2 transform hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none duration-100"
                >
                  <RotateCcw className="w-4 h-4" /> PLAY WITH NEW SENTENCE
                </button>
                <button
                  onClick={startCountdown}
                  className="px-8 py-4 bg-[#FF9F66] hover:bg-[#ff8f50] text-black font-black uppercase text-sm border-4 border-black shadow-brutal transition cursor-pointer flex items-center justify-center gap-2 transform hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none duration-100"
                >
                  <Play className="w-4 h-4 fill-current" /> REPLAY THIS SENTENCE
                </button>
              </div>

            </div>
          )}

        </div>
      )}
    </div>
  );
};
