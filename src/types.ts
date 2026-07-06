export type GameState = 'idle' | 'countdown' | 'playing' | 'completed';

export type VehicleType = 'car' | 'rocket' | 'horse' | 'ufo' | 'dragon' | 'skate' | 'unicorn' | 'turtle' | 'plane' | 'moto' | 'train' | 'ship' | 'camel' | 'eagle' | 'alien' | 'dino' | 'ghost' | 'bike' | 'broom' | 'crab';

export interface ScoreEntry {
  id?: string;
  name: string;
  wpm: number;
  errors: number;
  accuracy: number;
  vehicle: VehicleType;
  timestamp: any;
}

export interface Sentence {
  id: string;
  text: string;
  difficulty: 'Хялбар' | 'Дундаж' | 'Хэцүү';
  length: number;
}
