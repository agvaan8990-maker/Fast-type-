import React from 'react';
import { VehicleType } from '../types';

interface VehicleTrackProps {
  progress: number; // 0 to 100
  selectedVehicle: VehicleType;
  gameState: 'idle' | 'countdown' | 'playing' | 'completed';
  playerName?: string;
  isMe?: boolean;
  laps?: number;
}

const VEHICLE_EMOJIS: Record<VehicleType, string> = {
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

const VEHICLE_NAMES: Record<VehicleType, string> = {
  car: 'Car',
  rocket: 'Rocket',
  horse: 'Horse',
  ufo: 'UFO',
  dragon: 'Dragon',
  skate: 'Skateboard',
  unicorn: 'Unicorn',
  turtle: 'Turtle',
  plane: 'Airplane',
  moto: 'Motorcycle',
  train: 'Train',
  ship: 'Ship',
  camel: 'Camel',
  eagle: 'Eagle',
  alien: 'Alien',
  dino: 'Dinosaur',
  ghost: 'Ghost',
  bike: 'Bicycle',
  broom: 'Magic Broom',
  crab: 'Crab',
};

export const VehicleTrack: React.FC<VehicleTrackProps> = ({
  progress,
  selectedVehicle,
  gameState,
  playerName,
  isMe,
  laps = 0,
}) => {
  // Ensure progress stays within 0 and 100
  const clampedProgress = Math.min(Math.max(progress, 0), 100);

  return (
    <div className="w-full bg-white border-4 border-black p-5 relative overflow-hidden shadow-brutal">
      {/* Track Background Markings */}
      <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />
      
      {/* Lane Header */}
      <div className="flex justify-between items-center mb-3 relative z-10">
        <span className="text-xs font-black text-black uppercase tracking-wider flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 bg-black text-white font-mono flex items-center justify-center text-[8px] border border-black">🏁</span>
          {isMe ? 'YOUR' : `${playerName?.toUpperCase() || 'PLAYER'}'S`} TRACK ({VEHICLE_NAMES[selectedVehicle]})
          {laps > 0 && (
            <span className="bg-yellow-400 text-black border-2 border-black px-1.5 py-0.5 text-[9px] font-black tracking-tight ml-2 animate-bounce">
              LAP {laps + 1}
            </span>
          )}
        </span>
        <span className="text-xs font-mono font-black bg-black text-white px-2.5 py-0.5 border border-black">
          {Math.round(clampedProgress)}%
        </span>
      </div>

      {/* The Track */}
      <div className="relative h-20 bg-white rounded-none border-4 border-black flex items-center px-4 overflow-hidden">
        {/* Start Line */}
        <div className="absolute left-4 top-0 bottom-0 w-2 bg-black flex flex-col justify-between py-1 z-10" />

        {/* Lane Center Line */}
        <div className="absolute left-6 right-16 top-1/2 -translate-y-1/2 h-1 border-t-4 border-dashed border-black/20" />

        {/* Vehicle Container with Transition */}
        <div
          className="absolute transition-all duration-300 ease-out flex items-center"
          style={{
            left: `calc(1rem + ${clampedProgress * 0.78}%)`, // clamp to leave room for vehicle & finish flag
          }}
        >
          {/* Active effects for the vehicle */}
          <div className="relative flex flex-col items-center">
            {gameState === 'playing' && clampedProgress > 0 && (
              <>
                {/* Flame/dust particles trailing behind */}
                {selectedVehicle === 'rocket' && (
                  <div className="absolute -left-6 top-1/2 -translate-y-1/2 flex gap-1">
                    <span className="w-2.5 h-2.5 bg-orange-500 border border-black animate-ping" />
                    <span className="w-2 h-2 bg-yellow-400 border border-black animate-ping delay-75" />
                  </div>
                )}
                {selectedVehicle === 'car' && (
                  <div className="absolute -left-4 bottom-0 flex gap-0.5">
                    <span className="w-2 h-2 bg-black opacity-60 animate-bounce" />
                  </div>
                )}
                {selectedVehicle === 'horse' && (
                  <div className="absolute -left-4 bottom-0 flex flex-col gap-0.5">
                    <span className="text-[10px] text-black font-black animate-pulse">💨</span>
                  </div>
                )}
                {selectedVehicle === 'ufo' && (
                  <div className="absolute -left-6 top-1/2 -translate-y-1/2 flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-400 border border-black animate-ping" />
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 border border-black animate-ping delay-100" />
                  </div>
                )}
                {selectedVehicle === 'dragon' && (
                  <div className="absolute -left-5 top-1/2 -translate-y-1/2 flex flex-col gap-0.5">
                    <span className="text-[10px] text-red-500 font-black animate-pulse">🔥</span>
                  </div>
                )}
                {selectedVehicle === 'skate' && (
                  <div className="absolute -left-4 bottom-0 flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 opacity-80 animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 opacity-60 animate-bounce delay-75" />
                  </div>
                )}
                {selectedVehicle === 'unicorn' && (
                  <div className="absolute -left-5 top-1/2 -translate-y-1/2 flex gap-0.5">
                    <span className="text-xs animate-ping">✨</span>
                    <span className="text-[10px] animate-ping delay-100">🌈</span>
                  </div>
                )}
                {selectedVehicle === 'turtle' && (
                  <div className="absolute -left-4 bottom-0 flex gap-0.5">
                    <span className="text-[9px] font-mono font-black animate-bounce">...</span>
                  </div>
                )}
                {selectedVehicle === 'plane' && (
                  <div className="absolute -left-6 top-1/2 -translate-y-1/2 flex flex-col gap-0.5">
                    <span className="text-[10px] text-gray-400 animate-pulse">☁️</span>
                  </div>
                )}
                {selectedVehicle === 'moto' && (
                  <div className="absolute -left-4 bottom-0 flex gap-0.5">
                    <span className="w-2 h-2 bg-neutral-600 opacity-80 animate-bounce" />
                    <span className="text-[10px] animate-pulse">💨</span>
                  </div>
                )}
                {selectedVehicle === 'train' && (
                  <div className="absolute -left-6 top-0 flex flex-col gap-0.5">
                    <span className="text-xs animate-bounce">💨</span>
                    <span className="text-[10px] text-gray-500 animate-pulse">☁️</span>
                  </div>
                )}
                {selectedVehicle === 'ship' && (
                  <div className="absolute -left-5 bottom-0 flex gap-0.5">
                    <span className="text-xs animate-bounce">🌊</span>
                  </div>
                )}
                {selectedVehicle === 'camel' && (
                  <div className="absolute -left-4 bottom-0 flex flex-col gap-0.5">
                    <span className="text-[10px] text-yellow-600 font-black animate-pulse">🏜️</span>
                  </div>
                )}
                {selectedVehicle === 'eagle' && (
                  <div className="absolute -left-5 top-1/2 -translate-y-1/2 flex flex-col gap-0.5">
                    <span className="text-[10px] animate-pulse">🪶</span>
                  </div>
                )}
                {selectedVehicle === 'alien' && (
                  <div className="absolute -left-5 top-1/2 -translate-y-1/2 flex gap-0.5">
                    <span className="text-xs text-green-400 animate-ping">✨</span>
                  </div>
                )}
                {selectedVehicle === 'dino' && (
                  <div className="absolute -left-5 bottom-0 flex flex-col gap-0.5">
                    <span className="text-[9px] font-black text-red-500 animate-bounce">💥</span>
                  </div>
                )}
                {selectedVehicle === 'ghost' && (
                  <div className="absolute -left-4 top-1/2 -translate-y-1/2 flex gap-0.5">
                    <span className="text-xs text-indigo-400 animate-pulse">💀</span>
                  </div>
                )}
                {selectedVehicle === 'bike' && (
                  <div className="absolute -left-4 bottom-0 flex gap-0.5">
                    <span className="text-[10px] animate-bounce">💨</span>
                  </div>
                )}
                {selectedVehicle === 'broom' && (
                  <div className="absolute -left-5 top-1/2 -translate-y-1/2 flex gap-0.5">
                    <span className="text-xs text-yellow-300 animate-pulse">✨</span>
                  </div>
                )}
                {selectedVehicle === 'crab' && (
                  <div className="absolute -left-4 bottom-0 flex gap-0.5">
                    <span className="text-xs animate-bounce">🫧</span>
                  </div>
                )}
              </>
            )}

            {/* Vehicle Emoji */}
            <span
              className={`text-4xl select-none filter drop-shadow-[2px_2px_0px_rgba(0,0,0,1)] ${
                gameState === 'playing' ? 'animate-wiggle' : ''
              } ${clampedProgress === 100 ? 'scale-125 duration-500' : ''}`}
            >
              {VEHICLE_EMOJIS[selectedVehicle]}
            </span>

            {/* Indicator label above */}
            {(gameState === 'playing' || gameState === 'completed') && (
              <span className="absolute -top-5 text-[9px] font-mono font-black bg-yellow-400 text-black border border-black px-1.5 py-0.5 shadow-brutal-sm whitespace-nowrap uppercase">
                {isMe ? 'YOU' : playerName?.toUpperCase() || 'PLAYER'}
              </span>
            )}
          </div>
        </div>

        {/* Finish Line Checkered Pattern */}
        <div className="absolute right-4 top-0 bottom-0 w-8 bg-white border-l-4 border-black flex flex-wrap content-start overflow-hidden">
          {Array.from({ length: 18 }).map((_, i) => (
            <div
              key={i}
              className={`w-4 h-4 ${
                (Math.floor(i / 2) + (i % 2)) % 2 === 0
                  ? 'bg-black'
                  : 'bg-white'
              }`}
            />
          ))}
          {/* Finish Line Flag Overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-transparent pointer-events-none">
            <span className="text-xl filter drop-shadow-[1px_1px_0px_#000]">🏁</span>
          </div>
        </div>
      </div>
      
      {/* Decorative Track Guidelines */}
      <div className="flex justify-between mt-2 px-1 text-[10px] font-mono font-bold text-black/60">
        <span>// START_LINE</span>
        <span>// FINISH_LINE</span>
      </div>
    </div>
  );
};
