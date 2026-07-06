import React, { useState, useEffect, useRef } from 'react';
import { db, collection, addDoc, serverTimestamp, OperationType, handleFirestoreError, doc, getDoc, setDoc, updateDoc, onSnapshot } from '../firebase';
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
  BookOpen,
  Users,
  Plus,
  LogOut,
  Copy,
  Radio
} from 'lucide-react';

// Helper to get or create a session ID for multiplayer
const getSessionId = (): string => {
  let id = sessionStorage.getItem('typeracer_session_id');
  if (!id) {
    id = 'user_' + Math.random().toString(36).substring(2, 11);
    sessionStorage.setItem('typeracer_session_id', id);
  }
  return id;
};

interface TyperacerGameProps {
  onScoreSaved: () => void; // Callback to notify Leaderboard to refresh
}

const GAME_DURATION_SECS = 300; // 5 minutes in seconds

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
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const [showPageSuccessToast, setShowPageSuccessToast] = useState<boolean>(false);
  
  // Stats tracking
  const [startTime, setStartTime] = useState<number | null>(null);
  const [endTime, setEndTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [previousSentencesCharsCount, setPreviousSentencesCharsCount] = useState<number>(0);
  const [completedSentencesCount, setCompletedSentencesCount] = useState<number>(0);
  const [errors, setErrors] = useState<number>(0);
  const [prevInputLength, setPrevInputLength] = useState<number>(0);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  // Multiplayer State
  const [mySessionId] = useState<string>(getSessionId);
  const [gameMode, setGameMode] = useState<'solo' | 'multiplayer'>('solo');
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [roomState, setRoomState] = useState<any | null>(null);
  const [roomCodeInput, setRoomCodeInput] = useState<string>('');
  const [isCreatingRoom, setIsCreatingRoom] = useState<boolean>(false);
  const [isJoiningRoom, setIsJoiningRoom] = useState<boolean>(false);

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
    setCurrentPageIndex(0);
    setErrors(0);
    setPrevInputLength(0);
    setStartTime(null);
    setEndTime(null);
    setElapsedTime(0);
    setPreviousSentencesCharsCount(0);
    setCompletedSentencesCount(0);
    setSaveSuccess(false);
    setErrorText(null);
    setShowPageSuccessToast(false);
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
    setCurrentPageIndex(0);
    setErrors(0);
    setPrevInputLength(0);
    setStartTime(null);
    setEndTime(null);
    setElapsedTime(0);
    setPreviousSentencesCharsCount(0);
    setCompletedSentencesCount(0);
    setSaveSuccess(false);
    setShowPageSuccessToast(false);

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
      const elapsed = Math.floor((Date.now() - start) / 1000);
      if (elapsed >= GAME_DURATION_SECS) {
        setElapsedTime(GAME_DURATION_SECS);
        finishGame();
      } else {
        setElapsedTime(elapsed);
      }
    }, 1000);
  };

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

  // ==========================================
  // MULTIPLAYER HANDLERS & REAL-TIME SYNC
  // ==========================================

  // Generate a random 4-letter uppercase code
  const generateRoomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 4; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  // 1. Listen for real-time room updates
  useEffect(() => {
    if (!activeRoomId) {
      setRoomState(null);
      return;
    }

    const roomRef = doc(db, 'typeracer_rooms', activeRoomId);
    
    const unsubscribe = onSnapshot(roomRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setRoomState(data);
        
        // Sync sentence from host
        if (data.sentenceId) {
          const match = MON_SENTENCES.find(s => s.id === data.sentenceId);
          if (match && selectedSentence.id !== match.id) {
            setSelectedSentence(match);
          }
        }

        // Sync status: If the room is started/countdown
        if (data.status === 'countdown' && gameState === 'idle') {
          triggerMultiplayerCountdown();
        } else if (data.status === 'waiting' && (gameState === 'playing' || gameState === 'countdown' || gameState === 'completed')) {
          resetGameEngine();
        }
      } else {
        // Room closed
        setActiveRoomId(null);
        setRoomState(null);
        resetGameEngine();
        setErrorText("Room has been closed or does not exist.");
      }
    }, (error) => {
      console.error("Firestore room subscription error:", error);
    });

    return () => unsubscribe();
  }, [activeRoomId, gameState]);

  // Start multiplayer countdown
  const triggerMultiplayerCountdown = () => {
    setInputValue('');
    setCurrentPageIndex(0);
    setErrors(0);
    setPrevInputLength(0);
    setStartTime(null);
    setEndTime(null);
    setElapsedTime(0);
    setPreviousSentencesCharsCount(0);
    setCompletedSentencesCount(0);
    setSaveSuccess(false);
    setShowPageSuccessToast(false);
    
    setGameState('countdown');
    setCountdown(3);

    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownIntervalRef.current!);
          startMultiplayerTyping();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Start multiplayer typing
  const startMultiplayerTyping = () => {
    setGameState('playing');
    const start = Date.now();
    setStartTime(start);

    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 50);

    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - start) / 1000);
      if (elapsed >= GAME_DURATION_SECS) {
        setElapsedTime(GAME_DURATION_SECS);
        finishGame();
      } else {
        setElapsedTime(elapsed);
      }
    }, 1000);
  };

  // Update current player progress to Firestore
  const updateMultiplayerProgress = async (
    currentProgress: number,
    currentWPM: number,
    currentAccuracy: number,
    currentErrors: number,
    currentPage: number,
    isCompleted: boolean,
    lapsCount?: number
  ) => {
    if (!activeRoomId) return;
    try {
      const roomRef = doc(db, 'typeracer_rooms', activeRoomId);
      await updateDoc(roomRef, {
        [`players.${mySessionId}.progress`]: currentProgress,
        [`players.${mySessionId}.wpm`]: currentWPM,
        [`players.${mySessionId}.accuracy`]: currentAccuracy,
        [`players.${mySessionId}.errors`]: currentErrors,
        [`players.${mySessionId}.currentPageIndex`]: currentPage,
        [`players.${mySessionId}.completed`]: isCompleted,
        [`players.${mySessionId}.laps`]: lapsCount !== undefined ? lapsCount : completedSentencesCount,
        ...(isCompleted ? { [`players.${mySessionId}.finishedAt`]: Date.now() } : {})
      });
    } catch (err) {
      console.error("Error updating progress:", err);
    }
  };

  // Host triggers starting the multiplayer race
  const startMultiplayerRace = async () => {
    if (!activeRoomId) return;
    try {
      const roomRef = doc(db, 'typeracer_rooms', activeRoomId);
      await updateDoc(roomRef, {
        status: 'countdown'
      });
    } catch (err) {
      console.error("Error starting multiplayer race:", err);
    }
  };

  // Create room
  const createRoom = async () => {
    if (!name.trim()) {
      setErrorText("Please enter a name first.");
      return;
    }
    setIsCreatingRoom(true);
    setErrorText(null);
    localStorage.setItem('typeracer_player_name', name.trim());

    const code = generateRoomCode();
    try {
      const roomRef = doc(db, 'typeracer_rooms', code);
      const newRoom = {
        roomId: code,
        sentenceId: selectedSentence.id,
        status: 'waiting',
        players: {
          [mySessionId]: {
            id: mySessionId,
            name: name.trim(),
            vehicle: selectedVehicle,
            progress: 0,
            wpm: 0,
            accuracy: 100,
            errors: 0,
            completed: false,
            isHost: true,
            currentPageIndex: 0
          }
        },
        createdAt: serverTimestamp()
      };
      
      await setDoc(roomRef, newRoom);
      setActiveRoomId(code);
      setRoomState(newRoom);
    } catch (err: any) {
      console.error("Error creating room:", err);
      setErrorText("Failed to create room. Please try again.");
      handleFirestoreError(err, OperationType.WRITE, `typeracer_rooms/${code}`);
    } finally {
      setIsCreatingRoom(false);
    }
  };

  // Join room
  const joinRoom = async (codeToJoin?: string) => {
    const code = (codeToJoin || roomCodeInput).trim().toUpperCase();
    if (!name.trim()) {
      setErrorText("Please enter your name first.");
      return;
    }
    if (!code) {
      setErrorText("Please enter a 4-letter room code.");
      return;
    }
    setIsJoiningRoom(true);
    setErrorText(null);
    localStorage.setItem('typeracer_player_name', name.trim());

    try {
      const roomRef = doc(db, 'typeracer_rooms', code);
      const roomSnap = await getDoc(roomRef);
      
      if (!roomSnap.exists()) {
        setErrorText("Room not found. Check the code and try again.");
        setIsJoiningRoom(false);
        return;
      }

      const roomData = roomSnap.data();
      if (roomData.status !== 'waiting') {
        setErrorText("This race has already started or finished.");
        setIsJoiningRoom(false);
        return;
      }

      const updatedPlayers = {
        ...roomData.players,
        [mySessionId]: {
          id: mySessionId,
          name: name.trim(),
          vehicle: selectedVehicle,
          progress: 0,
          wpm: 0,
          accuracy: 100,
          errors: 0,
          completed: false,
          isHost: false,
          currentPageIndex: 0
        }
      };

      await updateDoc(roomRef, {
        players: updatedPlayers
      });

      setActiveRoomId(code);
      setRoomState({
        ...roomData,
        players: updatedPlayers
      });
      
      if (roomData.sentenceId) {
        const match = MON_SENTENCES.find(s => s.id === roomData.sentenceId);
        if (match) setSelectedSentence(match);
      }
    } catch (err: any) {
      console.error("Error joining room:", err);
      setErrorText("Failed to join room. Please try again.");
      handleFirestoreError(err, OperationType.WRITE, `typeracer_rooms/${code}`);
    } finally {
      setIsJoiningRoom(false);
    }
  };

  // Leave room
  const leaveRoom = async () => {
    if (!activeRoomId) return;
    const roomRef = doc(db, 'typeracer_rooms', activeRoomId);
    
    try {
      const isHost = roomState?.players?.[mySessionId]?.isHost;
      if (isHost) {
        await setDoc(roomRef, { ...roomState, status: 'finished', players: {} }, { merge: true });
      } else {
        const players = { ...roomState?.players };
        delete players[mySessionId];
        await updateDoc(roomRef, {
          players: players
        });
      }
    } catch (err) {
      console.error("Error leaving room:", err);
    } finally {
      setActiveRoomId(null);
      setRoomState(null);
      resetGameEngine();
    }
  };

  // Host triggers restart/reset
  const restartMultiplayerRoom = async () => {
    if (!activeRoomId || !roomState) return;
    try {
      const filtered = MON_SENTENCES.filter(
        s => difficultyFilter === 'All' || s.difficulty === difficultyFilter
      );
      const randomIndex = Math.floor(Math.random() * filtered.length);
      const nextSentence = filtered[randomIndex] || MON_SENTENCES[0];
      
      const resetPlayers = { ...roomState.players };
      Object.keys(resetPlayers).forEach((pId) => {
        resetPlayers[pId] = {
          ...resetPlayers[pId],
          progress: 0,
          wpm: 0,
          accuracy: 100,
          errors: 0,
          completed: false,
          currentPageIndex: 0
        };
        delete resetPlayers[pId].finishedAt;
      });

      const roomRef = doc(db, 'typeracer_rooms', activeRoomId);
      await setDoc(roomRef, {
        roomId: activeRoomId,
        sentenceId: nextSentence.id,
        status: 'waiting',
        players: resetPlayers,
        createdAt: serverTimestamp()
      });
      
      setSelectedSentence(nextSentence);
      resetGameEngine();
    } catch (err) {
      console.error("Error restarting room:", err);
    }
  };

  // Helper to verify if everyone has finished
  const checkAndSetRoomFinished = async (currentRoom: any, meId: string) => {
    if (!currentRoom || !activeRoomId) return;
    const playersMap = currentRoom.players || {};
    
    let allFinished = true;
    Object.keys(playersMap).forEach((pId) => {
      if (pId === meId) return;
      if (!playersMap[pId].completed) {
        allFinished = false;
      }
    });

    if (allFinished) {
      try {
        const roomRef = doc(db, 'typeracer_rooms', activeRoomId);
        await updateDoc(roomRef, {
          status: 'finished'
        });
      } catch (err) {
        console.error("Error setting room status to finished:", err);
      }
    }
  };

  // Handle typing input changes and error tracking
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const targetText = selectedSentence.pages[currentPageIndex] || '';

    // Only allow typing up to target sentence length
    if (value.length > targetText.length) return;

    // Track errors: If they typed a new character and it does not match
    let newErrors = errors;
    if (value.length > prevInputLength) {
      const addedCharIndex = value.length - 1;
      if (value[addedCharIndex] !== targetText[addedCharIndex]) {
        newErrors = errors + 1;
        setErrors(newErrors);
      }
    }

    setInputValue(value);
    setPrevInputLength(value.length);

    // Calculate current live stats for sync
    const completedPagesChars = selectedSentence.pages
      .slice(0, currentPageIndex)
      .reduce((acc, p) => acc + p.length, 0);
    const typedLength = previousSentencesCharsCount + completedPagesChars + value.length;
    const totalAttempts = typedLength + newErrors;
    const currentAccuracy = totalAttempts > 0 ? Math.round((typedLength / totalAttempts) * 100) : 100;

    const secs = getElapsedSeconds();
    const currentWPM = secs > 0 ? Math.round((typedLength / 5) / (secs / 60)) : 0;

    const totalChars = selectedSentence.pages.reduce((acc, p) => acc + p.length, 0);
    const currentSentenceTypedLength = completedPagesChars + value.length;
    const progressPercentage = totalChars > 0 ? (currentSentenceTypedLength / totalChars) * 100 : 0;

    // Check if finished and matches 100%
    if (value === targetText) {
      if (currentPageIndex < selectedSentence.pages.length - 1) {
        // Advance to next page
        setShowPageSuccessToast(true);
        setTimeout(() => setShowPageSuccessToast(false), 1500);
        const nextPageIndex = currentPageIndex + 1;
        setCurrentPageIndex(nextPageIndex);
        setInputValue('');
        setPrevInputLength(0);

        // Sync page completion in multiplayer
        if (activeRoomId) {
          const nextTypedLength = selectedSentence.pages
            .slice(0, nextPageIndex)
            .reduce((acc, p) => acc + p.length, 0);
          const nextProgressPercentage = totalChars > 0 ? (nextTypedLength / totalChars) * 100 : 0;
          updateMultiplayerProgress(nextProgressPercentage, currentWPM, currentAccuracy, newErrors, nextPageIndex, false, completedSentencesCount);
        }
      } else {
        // Lap Completed! Load new sentence instead of finishing game.
        setShowPageSuccessToast(true);
        setTimeout(() => setShowPageSuccessToast(false), 1500);

        const nextPreviousSentencesCharsCount = previousSentencesCharsCount + totalChars;
        const nextLaps = completedSentencesCount + 1;

        setPreviousSentencesCharsCount(nextPreviousSentencesCharsCount);
        setCompletedSentencesCount(nextLaps);

        // Pick next random sentence
        const filtered = MON_SENTENCES.filter(
          s => difficultyFilter === 'All' || s.difficulty === difficultyFilter
        );
        const pool = filtered.filter(s => s.id !== selectedSentence.id);
        const nextPool = pool.length > 0 ? pool : filtered;
        const randomIndex = Math.floor(Math.random() * nextPool.length);
        const nextSentence = nextPool[randomIndex] || MON_SENTENCES[0];

        setSelectedSentence(nextSentence);
        setCurrentPageIndex(0);
        setInputValue('');
        setPrevInputLength(0);

        if (activeRoomId) {
          updateMultiplayerProgress(0, currentWPM, currentAccuracy, newErrors, 0, false, nextLaps);
        }
      }
    } else {
      // Stroke sync in multiplayer
      if (activeRoomId) {
        updateMultiplayerProgress(progressPercentage, currentWPM, currentAccuracy, newErrors, currentPageIndex, false, completedSentencesCount);
      }
    }
  };

  // Finish the game
  const finishGame = async (
    finalWPM?: number,
    finalAccuracy?: number,
    finalErrors?: number
  ) => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    const end = Date.now();
    setEndTime(end);
    setGameState('completed');

    if (activeRoomId) {
      const w = finalWPM !== undefined ? finalWPM : getWPM();
      const acc = finalAccuracy !== undefined ? finalAccuracy : getAccuracy();
      const errs = finalErrors !== undefined ? finalErrors : errors;
      
      await updateMultiplayerProgress(100, w, acc, errs, currentPageIndex, true, completedSentencesCount);
      checkAndSetRoomFinished(roomState, mySessionId);
    }
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
    
    const completedPagesChars = selectedSentence.pages
      .slice(0, currentPageIndex)
      .reduce((acc, p) => acc + p.length, 0);
    const chars = previousSentencesCharsCount + completedPagesChars + inputValue.length;
    
    const wpm = (chars / 5) / (secs / 60);
    return Math.round(wpm);
  };

  const getAccuracy = () => {
    const completedPagesChars = selectedSentence.pages
      .slice(0, currentPageIndex)
      .reduce((acc, p) => acc + p.length, 0);
    const typedLength = previousSentencesCharsCount + completedPagesChars + inputValue.length;
    
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
    const text = selectedSentence.pages[currentPageIndex] || '';
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

  // Compute live progress percentage across all pages
  const totalChars = selectedSentence.pages.reduce((acc, p) => acc + p.length, 0);
  const completedPagesChars = selectedSentence.pages
    .slice(0, currentPageIndex)
    .reduce((acc, p) => acc + p.length, 0);
  const progressPercentage = totalChars > 0 
    ? ((completedPagesChars + inputValue.length) / totalChars) * 100 
    : 0;

  return (
    <div className="space-y-6">
      {/* MULTIPLAYER LOBBY (If activeRoomId is set and game has not started yet) */}
      {activeRoomId && roomState && gameState === 'idle' && (
        <div className="bg-white border-4 border-black p-6 md:p-8 shadow-brutal-lg space-y-6 relative overflow-hidden animate-fade-in">
          {/* Lobby Header */}
          <div className="border-b-4 border-black pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <span className="text-[10px] font-black uppercase text-yellow-500 flex items-center gap-1.5 animate-pulse">
                <Radio className="w-3.5 h-3.5" /> LIVE MULTIPLAYER RACE LOBBY
              </span>
              <h2 className="text-2xl md:text-3xl font-black text-black uppercase tracking-tight">RACE ROOM</h2>
            </div>
            
            {/* Room Code Display */}
            <div className="flex items-center gap-2 bg-yellow-400 border-4 border-black px-4 py-2 font-mono shadow-brutal-sm">
              <span className="text-xs font-black text-black uppercase">ROOM CODE:</span>
              <span className="text-xl font-black text-black tracking-widest">{activeRoomId}</span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(activeRoomId);
                  alert("Өрөөний код хуулагдлаа!");
                }}
                className="ml-2 p-1 bg-black text-white hover:bg-neutral-800 border-2 border-black cursor-pointer"
                title="Copy Code"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Players List */}
            <div className="space-y-4">
              <h3 className="text-sm font-black text-black uppercase tracking-wider flex items-center gap-2 border-b-2 border-black pb-1.5">
                <Users className="w-5 h-5 text-black" /> JOINED PLAYERS ({Object.keys(roomState.players || {}).length})
              </h3>
              
              <div className="space-y-3">
                {Object.values(roomState.players || {}).map((player: any) => {
                  const icons: Record<VehicleType, string> = {
                    car: '🚗', rocket: '🚀', horse: '🐎', ufo: '🛸', dragon: '🐉',
                    skate: '🛹', unicorn: '🦄', turtle: '🐢', plane: '✈️', moto: '🏍️',
                    train: '🚂', ship: '🚢', camel: '🐪', eagle: '🦅', alien: '👽',
                    dino: '🦖', ghost: '👻', bike: '🚲', broom: '🧹', crab: '🦀'
                  };
                  return (
                    <div
                      key={player.id}
                      className={`flex items-center justify-between border-4 border-black p-3.5 ${
                        player.id === mySessionId ? 'bg-yellow-50 shadow-brutal-sm' : 'bg-neutral-50 shadow-none'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-3xl filter drop-shadow-[1px_1px_0px_#000]">
                          {icons[player.vehicle as VehicleType] || '🚗'}
                        </span>
                        <div>
                          <span className="font-mono font-black text-black text-sm uppercase flex items-center gap-1.5">
                            {player.name}
                            {player.id === mySessionId && (
                              <span className="text-[9px] bg-yellow-400 text-black px-1.5 py-0.5 border border-black font-sans font-black">YOU</span>
                            )}
                          </span>
                          <span className="text-[10px] font-bold text-neutral-500 uppercase">
                            {player.isHost ? 'Host / Captain' : 'Racer'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {player.isHost ? (
                          <span className="text-[9px] font-black border border-black px-2 py-0.5 bg-black text-white uppercase tracking-tight">HOST</span>
                        ) : (
                          <span className="text-[9px] font-black border border-black px-2 py-0.5 bg-neutral-200 text-neutral-600 uppercase tracking-tight">READY</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Race Text */}
            <div className="space-y-4">
              <h3 className="text-sm font-black text-black uppercase tracking-wider flex items-center gap-2 border-b-2 border-black pb-1.5">
                <BookOpen className="w-5 h-5 text-black" /> SELECTED TEXT DETAILS
              </h3>
              
              <div className="p-4 border-4 border-black bg-neutral-50 space-y-3 shadow-brutal-sm">
                <div className="flex justify-between items-center border-b border-black pb-1.5 gap-2">
                  <span className="text-[10px] font-mono font-black text-black/60 truncate">
                    TITLE: {selectedSentence.title.toUpperCase()}
                  </span>
                  <span className="text-[10px] font-mono font-black text-black/50 shrink-0">
                    PAGES: {selectedSentence.pages.length}
                  </span>
                  <span className={`text-[9px] font-black px-2 py-0.5 uppercase border border-black shrink-0 ${
                    selectedSentence.difficulty === 'Easy' ? 'bg-green-100 text-green-800' :
                    selectedSentence.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {selectedSentence.difficulty}
                  </span>
                </div>
                <p className="text-xs text-black leading-snug italic font-medium">
                  "{selectedSentence.pages[0].slice(0, 110)}..."
                </p>
                
                {roomState?.players?.[mySessionId]?.isHost && (
                  <div className="space-y-2 pt-2">
                    {/* Difficulty choices */}
                    <div className="flex gap-2">
                      {(['All', 'Easy', 'Medium', 'Hard'] as const).map((diff) => (
                        <button
                          key={diff}
                          type="button"
                          onClick={() => handleDifficultyFilterChange(diff)}
                          className={`flex-1 py-1.5 text-[10px] font-black uppercase border-2 border-black transition-all cursor-pointer ${
                            difficultyFilter === diff
                              ? 'bg-yellow-400 text-black shadow-brutal-sm'
                              : 'bg-white text-black/60 hover:bg-neutral-50'
                          }`}
                        >
                          {diff}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => selectRandomSentence()}
                      className="w-full py-2 bg-black hover:bg-neutral-800 text-white font-black uppercase text-[10px] tracking-wider border-2 border-black transition cursor-pointer"
                    >
                      Change Text ↺
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Start Actions */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between border-t-2 border-black gap-4">
            <button
              onClick={leaveRoom}
              className="px-6 py-3 bg-white hover:bg-neutral-50 text-black border-4 border-black font-black text-xs uppercase tracking-wider shadow-brutal-sm transition cursor-pointer flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" /> LEAVE ROOM
            </button>
            
            {roomState?.players?.[mySessionId]?.isHost ? (
              <button
                onClick={startMultiplayerRace}
                className="px-10 py-5 bg-yellow-400 hover:bg-yellow-300 text-black border-4 border-black font-black text-lg uppercase tracking-widest shadow-brutal transition transform hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none duration-150 flex items-center gap-2.5 cursor-pointer"
              >
                <Play className="w-5 h-5 fill-current" /> START THE RACE →
              </button>
            ) : (
              <div className="flex items-center gap-3 bg-neutral-100 border-4 border-black px-6 py-4 font-bold text-sm uppercase">
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 animate-ping" />
                <span>Waiting for Host to start the race...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SOLO & MULTIPLAYER SETUP/SELECTION PANEL (Only if not in a room) */}
      {!activeRoomId && (gameState === 'idle' || gameState === 'completed') && (
        <div className="bg-white border-4 border-black shadow-brutal-lg relative overflow-hidden animate-fade-in">
          {/* Mode Selector Tabs */}
          <div className="flex border-b-4 border-black">
            <button
              type="button"
              onClick={() => {
                setGameMode('solo');
                setErrorText(null);
              }}
              className={`flex-1 py-4 font-black uppercase tracking-wider text-sm transition border-r-4 border-black flex items-center justify-center gap-2 cursor-pointer ${
                gameMode === 'solo'
                  ? 'bg-yellow-400 text-black'
                  : 'bg-neutral-100 text-black/50 hover:bg-neutral-50'
              }`}
            >
              <User className="w-4 h-4" /> SOLO RACE
            </button>
            <button
              type="button"
              onClick={() => {
                setGameMode('multiplayer');
                setErrorText(null);
              }}
              className={`flex-1 py-4 font-black uppercase tracking-wider text-sm transition flex items-center justify-center gap-2 cursor-pointer ${
                gameMode === 'multiplayer'
                  ? 'bg-yellow-400 text-black'
                  : 'bg-neutral-100 text-black/50 hover:bg-neutral-50'
              }`}
            >
              <Users className="w-4 h-4" /> MULTIPLAYER RACE
            </button>
          </div>

          <div className="p-6 md:p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left Column: Player Profile & Vehicle */}
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
                        car: '🚗', rocket: '🚀', horse: '🐎', ufo: '🛸', dragon: '🐉',
                        skate: '🛹', unicorn: '🦄', turtle: '🐢', plane: '✈️', moto: '🏍️',
                        train: '🚂', ship: '🚢', camel: '🐪', eagle: '🦅', alien: '👽',
                        dino: '🦖', ghost: '👻', bike: '🚲', broom: '🧹', crab: '🦀'
                      };
                      const names: Record<VehicleType, string> = {
                        car: 'Car', rocket: 'Rocket', horse: 'Horse', ufo: 'UFO', dragon: 'Dragon',
                        skate: 'Skate', unicorn: 'Unicorn', turtle: 'Turtle', plane: 'Plane', moto: 'Moto',
                        train: 'Train', ship: 'Ship', camel: 'Camel', eagle: 'Eagle', alien: 'Alien',
                        dino: 'Dino', ghost: 'Ghost', bike: 'Bike', broom: 'Broom', crab: 'Crab'
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

              {/* Right Column: Mode Details */}
              <div className="space-y-4">
                {gameMode === 'solo' ? (
                  <>
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
                      <div className="flex justify-between items-center border-b border-black pb-1.5 gap-2">
                        <span className="text-[10px] font-mono font-black text-black/60 truncate">
                          TITLE: {selectedSentence.title.toUpperCase()}
                        </span>
                        <span className="text-[10px] font-mono font-black text-black/50 shrink-0">
                          PAGES: {selectedSentence.pages.length}
                        </span>
                        <span className={`text-[9px] font-black px-2 py-0.5 uppercase border border-black shrink-0 ${
                          selectedSentence.difficulty === 'Easy' ? 'bg-green-100 text-green-800' :
                          selectedSentence.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {selectedSentence.difficulty}
                        </span>
                      </div>
                      <p className="text-xs text-black leading-snug italic font-medium">
                        "{selectedSentence.pages[0].slice(0, 75)}..."
                      </p>
                      <button
                        type="button"
                        onClick={() => selectRandomSentence()}
                        className="w-full py-2 bg-black hover:bg-neutral-800 text-white font-black uppercase text-[10px] tracking-wider border-2 border-black transition cursor-pointer"
                      >
                        Change Text ↺
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-6">
                    <h3 className="text-sm font-black text-black uppercase tracking-wider flex items-center gap-2 border-b-2 border-black pb-1.5">
                      <Users className="w-5 h-5 text-black" /> Multiplayer Lounge
                    </h3>
                    
                    {/* Create Room Option */}
                    <div className="bg-neutral-50 border-4 border-black p-4 space-y-3 shadow-brutal-sm">
                      <h4 className="text-xs font-black uppercase text-black tracking-tight flex items-center gap-1.5">
                        <Plus className="w-4 h-4 text-black" /> Host a New Room
                      </h4>
                      <p className="text-xs text-neutral-600 leading-snug">
                        Create a room, share the code with friends, and race each other in real-time!
                      </p>
                      <button
                        type="button"
                        onClick={createRoom}
                        disabled={isCreatingRoom || !name.trim()}
                        className="w-full py-3 bg-yellow-400 hover:bg-yellow-300 disabled:bg-neutral-200 disabled:text-neutral-500 text-black font-black uppercase text-xs border-2 border-black shadow-brutal-sm transition cursor-pointer"
                      >
                        {isCreatingRoom ? 'CREATING...' : 'CREATE NEW RACE ROOM'}
                      </button>
                    </div>

                    {/* Join Room Option */}
                    <div className="bg-neutral-50 border-4 border-black p-4 space-y-3 shadow-brutal-sm">
                      <h4 className="text-xs font-black uppercase text-black tracking-tight flex items-center gap-1.5">
                        <Radio className="w-4 h-4 text-black" /> Join Existing Room
                      </h4>
                      <p className="text-xs text-neutral-600 leading-snug">
                        Enter the 4-letter room code provided by the host.
                      </p>
                      
                      <div className="flex gap-2">
                        <input
                          type="text"
                          maxLength={4}
                          placeholder="CODE (e.g. AB12)"
                          value={roomCodeInput}
                          onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                          className="flex-1 bg-white border-2 border-black px-3 py-2 font-mono text-center font-black uppercase tracking-widest text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => joinRoom()}
                          disabled={isJoiningRoom || !name.trim() || !roomCodeInput.trim()}
                          className="px-6 bg-black hover:bg-neutral-800 disabled:bg-neutral-200 disabled:text-neutral-500 text-white font-black uppercase text-xs border-2 border-black shadow-brutal-sm transition cursor-pointer"
                        >
                          {isJoiningRoom ? 'JOINING...' : 'JOIN'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Error Display */}
            {errorText && (
              <div className="bg-red-50 border-4 border-black p-4 text-red-600 text-xs font-bold flex items-center gap-2 animate-bounce">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorText.toUpperCase()}</span>
              </div>
            )}

            {/* Solo Mode Start Trigger */}
            {gameMode === 'solo' && (
              <div className="pt-4 flex flex-col items-center border-t-2 border-black">
                <button
                  onClick={startCountdown}
                  disabled={!name.trim()}
                  className="px-10 py-5 bg-yellow-400 hover:bg-yellow-300 disabled:bg-neutral-200 disabled:text-neutral-400 text-black border-4 border-black font-black text-xl uppercase tracking-widest shadow-brutal transition transform hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none duration-150 flex items-center gap-2.5 cursor-pointer"
                >
                  <Play className="w-5 h-5 fill-current" /> START SOLO RACE →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. RACING AREA (Visible when counting down, playing or completed) */}
      {gameState !== 'idle' && (
        <div className="space-y-6 animate-fade-in">
          {/* Real-time Racetrack(s) */}
          {activeRoomId && roomState ? (
            <div className="space-y-4">
              {Object.values(roomState.players || {}).map((player: any) => {
                const isMe = player.id === mySessionId;
                return (
                  <VehicleTrack
                    key={player.id}
                    progress={player.progress || 0}
                    selectedVehicle={player.vehicle}
                    gameState={gameState}
                    playerName={player.name}
                    isMe={isMe}
                    laps={player.laps || 0}
                  />
                );
              })}
            </div>
          ) : (
            <VehicleTrack
              progress={progressPercentage}
              selectedVehicle={selectedVehicle}
              gameState={gameState}
              laps={completedSentencesCount}
            />
          )}

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

                <div className="flex items-center gap-1.5 bg-black text-white border-2 border-black px-4 py-2 font-mono text-sm font-black" title="Time remaining">
                  <Hourglass className="w-4 h-4 text-yellow-400 animate-spin" />
                  <span>
                    {(() => {
                      const rem = Math.max(GAME_DURATION_SECS - elapsedTime, 0);
                      const m = Math.floor(rem / 60);
                      const s = rem % 60;
                      return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
                    })()}
                  </span>
                </div>
              </div>

              {/* Target Sentence Display */}
              <div className="bg-white border-4 border-black p-6 md:p-8 relative min-h-[140px] flex items-center justify-center shadow-inner">
                <div className="absolute top-[-14px] left-6 bg-black text-white px-3 py-1 text-[10px] font-black uppercase tracking-tighter italic border border-black flex items-center gap-2">
                  <span>TYPE NOW // {selectedSentence.title.toUpperCase()}</span>
                  <span className="bg-yellow-400 text-black px-1.5 font-bold font-mono">PAGE {currentPageIndex + 1} OF {selectedSentence.pages.length}</span>
                </div>
                {renderHighlightedSentence()}

                {/* Page Completed Success Toast */}
                {showPageSuccessToast && (
                  <div className="absolute inset-0 bg-yellow-400 border-4 border-black flex flex-col items-center justify-center z-20 animate-fade-in shadow-brutal-sm">
                    <span className="text-2xl font-black text-black tracking-tight uppercase animate-bounce">PAGE COMPLETED! 🎉</span>
                    <span className="text-xs font-mono font-bold text-black/80 mt-1">ADVANCING TO PAGE {currentPageIndex + 1} OF {selectedSentence.pages.length}...</span>
                  </div>
                )}
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
                  className="w-full bg-white border-4 border-black p-6 text-2xl md:text-3xl font-mono font-bold text-black placeholder-neutral-400 focus:outline-none focus:bg-yellow-50 focus:ring-2 focus:ring-yellow-400 shadow-brutal-lg"
                />
                
                {/* Cancel Game Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (activeRoomId) {
                      leaveRoom();
                    } else {
                      resetGameEngine();
                    }
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2.5 bg-black hover:bg-neutral-800 text-white border-2 border-black transition shadow-brutal-sm cursor-pointer flex items-center justify-center"
                  title={activeRoomId ? "Leave race room" : "Cancel race"}
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
                <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-400 border-4 border-black text-black shadow-brutal mb-2 animate-bounce">
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

              {/* MULTIPLAYER RACE STANDINGS */}
              {activeRoomId && roomState && (
                <div className="border-4 border-black p-4 md:p-6 bg-neutral-50 space-y-4 shadow-brutal-sm">
                  <h3 className="text-sm font-black text-black uppercase tracking-wider flex items-center gap-2 border-b-2 border-black pb-1.5">
                    <Award className="w-5 h-5 text-black" /> MULTIPLAYER RACE STANDINGS
                  </h3>
                  
                  <div className="space-y-2">
                    {Object.values(roomState.players || {})
                      .sort((a: any, b: any) => {
                        if (a.completed && !b.completed) return -1;
                        if (!a.completed && b.completed) return 1;
                        if (a.completed && b.completed) {
                          return (a.finishedAt || 0) - (b.finishedAt || 0);
                        }
                        return (b.progress || 0) - (a.progress || 0);
                      })
                      .map((player: any, idx) => {
                        const icons: Record<VehicleType, string> = {
                          car: '🚗', rocket: '🚀', horse: '🐎', ufo: '🛸', dragon: '🐉',
                          skate: '🛹', unicorn: '🦄', turtle: '🐢', plane: '✈️', moto: '🏍️',
                          train: '🚂', ship: '🚢', camel: '🐪', eagle: '🦅', alien: '👽',
                          dino: '🦖', ghost: '👻', bike: '🚲', broom: '🧹', crab: '🦀'
                        };
                        return (
                          <div
                            key={player.id}
                            className={`flex items-center justify-between border-2 border-black p-3.5 font-mono text-xs ${
                              player.id === mySessionId ? 'bg-yellow-100 font-bold border-l-8 border-l-yellow-400' : 'bg-white'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className="font-black text-black w-6">#{idx + 1}</span>
                              <span className="text-2xl">{icons[player.vehicle as VehicleType] || '🚗'}</span>
                              <span className="uppercase truncate max-w-[120px]">{player.name}</span>
                              {player.id === mySessionId && (
                                <span className="text-[8px] font-sans font-black bg-black text-white px-1.5 py-0.5 uppercase tracking-tighter">YOU</span>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-4 sm:gap-8">
                              <div className="text-right">
                                <span className="text-[9px] text-neutral-400 block uppercase">Speed</span>
                                <span className="font-black tabular-nums">{player.wpm || 0} WPM</span>
                              </div>
                              <div className="text-right hidden sm:block">
                                <span className="text-[9px] text-neutral-400 block uppercase">Accuracy</span>
                                <span className="font-black tabular-nums">{player.accuracy || 100}%</span>
                              </div>
                              <div className="text-right">
                                <span className="text-[9px] text-neutral-400 block uppercase">Status</span>
                                <span className={`font-black ${player.completed ? 'text-green-600' : 'text-neutral-500'}`}>
                                  {player.completed ? 'FINISHED' : `${Math.round(player.progress)}%`}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Save Score Action Card (Solo mode only) */}
              {!activeRoomId && (!saveSuccess ? (
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
              ))}

              {/* Play Again Buttons / Room Actions */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4 justify-center border-t-2 border-black/10">
                {activeRoomId ? (
                  <>
                    <button
                      onClick={leaveRoom}
                      className="px-6 py-4 bg-white hover:bg-neutral-50 text-black font-black uppercase text-sm border-4 border-black shadow-brutal transition cursor-pointer flex items-center justify-center gap-2 transform hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none duration-100"
                    >
                      <LogOut className="w-4 h-4" /> LEAVE ROOM
                    </button>
                    {roomState?.players?.[mySessionId]?.isHost ? (
                      <button
                        onClick={restartMultiplayerRoom}
                        className="px-8 py-4 bg-[#FF9F66] hover:bg-[#ff8f50] text-black font-black uppercase text-sm border-4 border-black shadow-brutal transition cursor-pointer flex items-center justify-center gap-2 transform hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none duration-100"
                      >
                        <RotateCcw className="w-4 h-4" /> RESTART ROOM RACE (HOST)
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 bg-neutral-100 border-2 border-black px-4 py-3 font-mono font-black text-xs uppercase text-neutral-500">
                        <span className="w-2.5 h-2.5 bg-yellow-500 rounded-full animate-ping mr-1" />
                        <span>Waiting for Host to restart...</span>
                      </div>
                    )}
                  </>
                ) : (
                  <>
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
                  </>
                )}
              </div>

            </div>
          )}

        </div>
      )}
    </div>
  );
};
