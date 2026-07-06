export interface Sentence {
  id: string;
  title: string;
  pages: string[];
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

export const MON_SENTENCES: Sentence[] = [
  // --- EASY LEVEL ---
  {
    id: 'easy1',
    title: 'The Forest Trail',
    difficulty: 'Easy',
    pages: [
      'The sun is warm today. A soft wind blows through the trees. We walk on a small path.',
      'We can see pretty blue flowers on the grass. Small birds sing their happy songs from the branches above.',
      'A quiet river flows by the path. The water is clear and cold. This is a very peaceful place to spend the afternoon.'
    ]
  },
  {
    id: 'easy2',
    title: 'The Friendly Cat',
    difficulty: 'Easy',
    pages: [
      'I have a little cat with soft gray fur. He likes to sleep on my lap while I read my favorite books.',
      'When he wakes up, he wants to play with a small red ball. He is a very happy and funny pet.'
    ]
  },
  {
    id: 'easy3',
    title: 'A Sunny Morning',
    difficulty: 'Easy',
    pages: [
      'Morning is a beautiful time of the day. The sky is bright blue and the air feels fresh and clean.',
      'I drink a cup of warm tea and look out the window. It is going to be a wonderful day for everyone.'
    ]
  },

  // --- MEDIUM LEVEL ---
  {
    id: 'medium1',
    title: 'The Spirit of Adventure',
    difficulty: 'Medium',
    pages: [
      'Humans have always possessed a deep and natural urge to explore the unknown. From sailing across uncharted oceans to mapping the distant stars, we constantly strive to push past our boundaries.',
      'This restless curiosity is what drove ancient travelers to cross vast deserts and climb the tallest peaks, facing incredible dangers in search of new horizons and untold stories.',
      'Today, that same spirit continues to guide our scientists and thinkers as they seek to understand the deepest mysteries of nature, the human mind, and the outer limits of space.'
    ]
  },
  {
    id: 'medium2',
    title: 'The Power of Habits',
    difficulty: 'Medium',
    pages: [
      'Our daily habits shape our lives far more than we realize. The small choices we make every single day, from what we eat to how we spend our free time, slowly build up over months and years.',
      'If you focus on making just a tiny improvement of one percent each day, the compound effect over time will lead to extraordinary growth and positive transformation in your life.',
      'The key to success is not a sudden burst of massive action, but rather the quiet consistency of keeping good habits and staying disciplined even when nobody is watching you.'
    ]
  },
  {
    id: 'medium3',
    title: 'The Ocean Depths',
    difficulty: 'Medium',
    pages: [
      'The ocean covers more than seventy percent of our planet, yet it remains one of the least explored and most mysterious environments in the entire solar system.',
      'Deep beneath the surface, where sunlight never reaches, strange and beautiful creatures have adapted to survive under extreme water pressure and freezing temperatures.',
      'Exploring these deep hydrothermal vents and deep trenches helps scientists learn about the origins of life on Earth and search for signs of life on other watery worlds.'
    ]
  },

  // --- HARD LEVEL ---
  {
    id: 'hard1',
    title: 'The Symphony of Code',
    difficulty: 'Hard',
    pages: [
      'Writing clean software requires deep focus; it is a meticulous craft where every semicolon (;) and curly brace ({}) has a distinct purpose. An elegant algorithm balances efficiency and human readability.',
      'Consider the complexity: function processData(items) { return items.filter(x => x.active).map(y => y.value); }. A single misplaced character can instantly cascade into a fatal stack overflow error.',
      'Moreover, modern full-stack systems rely heavily on asynchronous event-loops, distributed databases, and high-performance WebSockets to handle thousands of concurrent queries without blocking runtime threads.',
      'Ultimately, the ultimate goal of a senior software engineer is not merely to write code, but to engineer robust, scalable architectures that stand the test of time under extreme production workloads.'
    ]
  },
  {
    id: 'hard2',
    title: 'The Paradox of Time',
    difficulty: 'Hard',
    pages: [
      'Albert Einstein fundamentally transformed our understanding of the universe with his theory of relativity: space and time are not absolute, but are interwoven into a dynamic four-dimensional fabric.',
      'Under extreme conditions—such as nearing the event horizon of a supermassive black hole—gravitational time dilation causes clock cycles to slow down relative to a distant, stationary observer.',
      'This counter-intuitive reality implies that "now" is merely a subjective construct, and the strict division between the past, present, and future is ultimately a persistent and stubborn illusion.'
    ]
  },
  {
    id: 'hard3',
    title: 'The Digital Frontier',
    difficulty: 'Hard',
    pages: [
      'Modern cryptography secures our digital lives using mathematically rigorous principles, such as RSA encryption (utilizing prime factors) and elliptic-curve digital signature algorithms (ECDSA).',
      'A secure protocol must guarantee three critical pillars: confidentiality, integrity, and authenticity. Without these cryptographic safeguards, online financial systems would instantaneously collapse.',
      'As quantum computing advances rapidly, researchers are urgently developing "post-quantum cryptography" (PQC) standards to defend our global infrastructure against future multi-threaded decryption exploits.'
    ]
  }
];
