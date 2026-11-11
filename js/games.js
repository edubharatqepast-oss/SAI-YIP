export const GAMES = [
  {
    id: "2048",
    name: "2048",
    category: "Number Logic",
    icon: "🔢",
    description: "Slide matching powers of 2 to merge tiles and reach 2048. Trains strategic forethought and mental arithmetic.",
    skill: "Logic",
    difficulty: "Medium",
    iframeUrl: "/games/2048/index.html",
    embeddable: true,
    license: "MIT",
    tags: ["numbers", "strategy", "arithmetic"]
  },
  {
    id: "hextris",
    name: "Hextris",
    category: "Spatial Puzzle",
    icon: "🔶",
    description: "Rotate a hexagon to match falling colored blocks. Fast pattern recognition and geometry skills.",
    skill: "Observation",
    difficulty: "Hard",
    iframeUrl: null,
    embeddable: false,
    license: "GPL-3.0",
    tags: ["reflexes", "geometry", "patterns"]
  },
  {
    id: "darkroom",
    name: "A Dark Room",
    category: "Text Adventure",
    icon: "🕯️",
    description: "Minimalist text adventure that grows into a deep survival simulation. Cognitive deduction and long-term planning.",
    skill: "Problem Solving",
    difficulty: "Hard",
    iframeUrl: null,
    embeddable: false,
    license: "MPL-2.0",
    tags: ["text", "survival", "deduction"]
  },
  {
    id: "sandboxels",
    name: "Sandboxels",
    category: "Physics Sim",
    icon: "🧪",
    description: "Falling-sand simulation with 500+ elements. Heat, electricity, chemistry and dynamic reactions.",
    skill: "Problem Solving",
    difficulty: "Medium",
    iframeUrl: null,
    embeddable: false,
    license: "Other",
    tags: ["physics", "chemistry", "simulation"]
  },
  {
    id: "connect4",
    name: "Connect Four",
    category: "Strategy",
    icon: "🔴",
    description: "Drop discs to connect four in a row. Read ahead multiple turns, block opponents, build your path.",
    skill: "Logic",
    difficulty: "Easy",
    iframeUrl: null,
    embeddable: false,
    license: "MIT",
    tags: ["strategy", "minimax", "two-player"]
  },
  {
    id: "fifteen",
    name: "Fifteen Puzzle",
    category: "Sliding Puzzle",
    icon: "🧩",
    description: "Rebuild a picture by sliding tiles into the empty slot. Spatial visualization and sequential tracking.",
    skill: "Observation",
    difficulty: "Easy",
    iframeUrl: "/games/fifteen/index.html",
    embeddable: true,
    license: "MIT",
    tags: ["sliding", "spatial", "image"]
  },
  {
    id: "worldguessr",
    name: "WorldGuessr",
    category: "Geography",
    icon: "🌍",
    description: "Dropped into a random Street View location. Analyze architecture, language, flora to guess where you are.",
    skill: "Observation",
    difficulty: "Hard",
    iframeUrl: null,
    embeddable: false,
    license: "PolyForm Noncommercial",
    tags: ["geography", "deduction", "memory"]
  },
  {
    id: "shapez",
    name: "Shapez.io",
    category: "Automation",
    icon: "⚙️",
    description: "Factory automation puzzle. Cut, rotate, merge and paint shapes through production lines. Abstract logic.",
    skill: "Logic",
    difficulty: "Hard",
    iframeUrl: null,
    embeddable: false,
    license: "GPL-3.0",
    tags: ["automation", "factory", "engineering"]
  },
  {
    id: "blitztactics",
    name: "Blitz Tactics",
    category: "Chess Tactics",
    icon: "♟️",
    description: "Fast-paced chess puzzle trainer. Timed modes expand working memory and quick deduction.",
    skill: "Reasoning",
    difficulty: "Hard",
    iframeUrl: null,
    embeddable: false,
    license: "GPL-3.0",
    tags: ["chess", "tactics", "timed"]
  },
  {
    id: "hexagame",
    name: "Hexagame",
    category: "Word Puzzle",
    icon: "🔤",
    description: "Drag adjoining hexagonal letters to form words under time pressure. Fast semantic processing.",
    skill: "Reasoning",
    difficulty: "Medium",
    iframeUrl: null,
    embeddable: false,
    license: "MIT",
    tags: ["words", "vocabulary", "speed"]
  },
  {
    id: "memory-match",
    name: "Memory Match",
    category: "Memory",
    icon: "🧠",
    description: "Flip cards to find matching pairs. Trains visual memory and concentration.",
    skill: "Observation",
    difficulty: "Easy",
    iframeUrl: "/games/memory-match/memory-match.html",
    embeddable: true,
    license: "MIT",
    tags: ["memory", "concentration", "pairs"]
  },
  {
    id: "reaction-time",
    name: "Reaction Time",
    category: "Reflexes",
    icon: "⚡",
    description: "Click when the color changes. Measures your reflex speed in milliseconds.",
    skill: "Reasoning",
    difficulty: "Easy",
    iframeUrl: "/games/reaction-time/reaction-time.html",
    embeddable: true,
    license: "MIT",
    tags: ["reflexes", "reaction", "speed"]
  },
  {
    id: "simon-says",
    name: "Simon Says",
    category: "Memory",
    icon: "🔴",
    description: "Repeat the growing color sequence. Trains short-term memory and pattern recall.",
    skill: "Problem Solving",
    difficulty: "Medium",
    iframeUrl: "/games/simon-says/simon-says.html",
    embeddable: true,
    license: "MIT",
    tags: ["memory", "sequence", "pattern"]
  },
  {
    id: "typing-test",
    name: "Typing Test",
    category: "Coding",
    icon: "⌨️",
    description: "Type words as fast as you can. Measures WPM and accuracy.",
    skill: "Coding",
    difficulty: "Medium",
    iframeUrl: "/games/typing-test/typing-test.html",
    embeddable: true,
    license: "MIT",
    tags: ["typing", "wpm", "accuracy"]
  }
];

export function getGame(id) {
  return GAMES.find((g) => g.id === id) || null;
}

export function getGamesBySkill(skill) {
  return GAMES.filter((g) => g.skill === skill);
}
