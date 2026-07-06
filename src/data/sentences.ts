export interface Sentence {
  id: string;
  text: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  length: number;
}

export const MON_SENTENCES: Sentence[] = [
  {
    id: '1',
    text: "The quick brown fox jumps over the lazy dog.",
    difficulty: 'Easy',
    length: 44
  },
  {
    id: '2',
    text: "Do not put off until tomorrow what you can do today.",
    difficulty: 'Easy',
    length: 52
  },
  {
    id: '3',
    text: "Success is not final, failure is not fatal: it is the courage to continue that counts.",
    difficulty: 'Medium',
    length: 86
  },
  {
    id: '4',
    text: "Do not go where the path may lead, go instead where there is no path and leave a trail.",
    difficulty: 'Medium',
    length: 88
  },
  {
    id: '5',
    text: "The only limit to our realization of tomorrow will be our doubts of today.",
    difficulty: 'Easy',
    length: 74
  },
  {
    id: '6',
    text: "To be yourself in a world that is constantly trying to make you something else is the greatest accomplishment.",
    difficulty: 'Hard',
    length: 110
  },
  {
    id: '7',
    text: "In the end, we will remember not the words of our enemies, but the silence of our friends.",
    difficulty: 'Medium',
    length: 91
  },
  {
    id: '8',
    text: "The greatest glory in living lies not in never falling, but in rising every time we fall.",
    difficulty: 'Hard',
    length: 89
  },
  {
    id: '9',
    text: "Spread love everywhere you go. Let no one ever come to you without leaving happier.",
    difficulty: 'Easy',
    length: 83
  },
  {
    id: '10',
    text: "It is during our darkest moments that we must focus to see the light.",
    difficulty: 'Easy',
    length: 69
  },
  {
    id: '11',
    text: "The future belongs to those who believe in the beauty of their dreams.",
    difficulty: 'Medium',
    length: 70
  },
  {
    id: '12',
    text: "Many of life's failures are people who did not realize how close they were to success when they gave up.",
    difficulty: 'Hard',
    length: 104
  },
  {
    id: '13',
    text: "If you set your goals ridiculously high and it's a failure, you will fail above everyone else's success.",
    difficulty: 'Hard',
    length: 104
  },
  {
    id: '14',
    text: "If you look at what you have in life, you'll always have more. If you look at what you don't have, you will never have enough.",
    difficulty: 'Hard',
    length: 126
  },
  {
    id: '15',
    text: "You have brains in your head. You have feet in your shoes. You can steer yourself any direction you choose.",
    difficulty: 'Medium',
    length: 107
  },
  {
    id: '16',
    text: "Artificial intelligence is growing at an unprecedented rate, transforming the way we work, communicate, and solve some of the world's most complex challenges.",
    difficulty: 'Hard',
    length: 158
  },
  {
    id: '17',
    text: "Programming is not just about writing lines of code; it is about logical thinking, solving intricate problems, and building tools that can change human lives for the better.",
    difficulty: 'Hard',
    length: 174
  },
  {
    id: '18',
    text: "The majestic mountains and vast oceans of our beautiful planet remind us of the incredible wonders of nature and the vital importance of preserving our environment for future generations.",
    difficulty: 'Hard',
    length: 188
  },
  {
    id: '19',
    text: "Learning to type quickly and accurately requires consistent daily practice, proper finger positioning on the home row, and focusing on accuracy first before building up your speed.",
    difficulty: 'Hard',
    length: 180
  },
  {
    id: '20',
    text: "When we work together with empathy and respect, we can overcome any obstacle, bridge cultural divides, and build a more inclusive and harmonious society for everyone.",
    difficulty: 'Hard',
    length: 165
  },
  {
    id: '21',
    text: "Space exploration has always captured the human imagination, pushing the boundaries of science and technology as we venture into the unknown depths of the cosmos to discover new worlds.",
    difficulty: 'Hard',
    length: 185
  }
];
