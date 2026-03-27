(function () {
  "use strict";

  const CATEGORY_LABELS = {
    random: "Random Mix",
    general: "General Knowledge",
    science: "Science",
    history: "History",
    entertainment: "Entertainment",
    sports: "Sports"
  };

  const CATEGORY_IDS = {
    general: 9,
    science: 17,
    history: 23,
    entertainment: 11,
    sports: 21
  };

  const CPU_PROFILES = {
    easy: {
      label: "Easy CPU",
      accuracy: 0.56,
      delayMin: 2400,
      delayMax: 6200
    },
    medium: {
      label: "Medium CPU",
      accuracy: 0.75,
      delayMin: 1700,
      delayMax: 4300
    },
    hard: {
      label: "Hard CPU",
      accuracy: 0.89,
      delayMin: 900,
      delayMax: 2800
    }
  };

  const CPU_ARCHETYPES = [
    {
      id: "sniper",
      name: "The Sniper",
      description: "Takes longer to lock, then gets sharper fast when trailing.",
      decide(profile, game, round) {
        const trailing = game.right.score < game.left.score;
        const accuracy = profile.accuracy + 0.05 + (trailing ? 0.08 : 0);
        const min = profile.delayMin + 180;
        const max = profile.delayMax + 420;
        return { accuracy, delayMin: min, delayMax: max };
      }
    },
    {
      id: "gambler",
      name: "The Gambler",
      description: "Locks quickly, guesses more often, and swings hard with momentum.",
      decide(profile, game) {
        const leading = game.right.score > game.left.score;
        const accuracy = profile.accuracy - 0.08 + (leading ? -0.03 : 0.03);
        const min = profile.delayMin * 0.68;
        const max = profile.delayMax * 0.8;
        return { accuracy, delayMin: min, delayMax: max };
      }
    },
    {
      id: "closer",
      name: "The Closer",
      description: "Starts measured, then speeds up and cleans up when behind.",
      decide(profile, game) {
        const scoreGap = game.left.score - game.right.score;
        const urgency = clamp(scoreGap / 8, 0, 1);
        const accuracy = profile.accuracy + 0.02 + urgency * 0.08;
        const min = profile.delayMin * (1 - urgency * 0.22);
        const max = profile.delayMax * (1 - urgency * 0.16);
        return { accuracy, delayMin: min, delayMax: max };
      }
    },
    {
      id: "counter",
      name: "Counter-Puller",
      description: "Targets player hot streaks with faster, more accurate answers.",
      decide(profile, game) {
        const againstStreak = Math.max(game.left.streak - game.right.streak, 0);
        const burst = clamp(againstStreak / 3, 0, 1);
        const accuracy = profile.accuracy + burst * 0.07;
        const min = profile.delayMin * (1 - burst * 0.18);
        const max = profile.delayMax * (1 - burst * 0.14);
        return { accuracy, delayMin: min, delayMax: max };
      }
    },
    {
      id: "sprinter",
      name: "The Sprinter",
      description: "Explodes out early with the fastest locks, but accuracy is shakier.",
      decide(profile, game) {
        const totalRounds = Math.max(game.questions.length - 1, 1);
        const earlyFactor = clamp(1 - game.currentIndex / totalRounds, 0, 1);
        const accuracy = profile.accuracy - 0.11 + earlyFactor * 0.05;
        const min = profile.delayMin * (1 - earlyFactor * 0.34);
        const max = profile.delayMax * (1 - earlyFactor * 0.28);
        return { accuracy, delayMin: min, delayMax: max };
      }
    },
    {
      id: "bulldog",
      name: "The Bulldog",
      description: "Plays steady and sturdy, with solid timing and few wild swings.",
      decide(profile) {
        const accuracy = profile.accuracy + 0.03;
        const min = profile.delayMin * 0.94;
        const max = profile.delayMax * 0.95;
        return { accuracy, delayMin: min, delayMax: max };
      }
    },
    {
      id: "showboat",
      name: "The Showboat",
      description: "Gets flashy with a lead, but can unravel when the pressure flips.",
      decide(profile, game) {
        const leading = game.right.score > game.left.score;
        const accuracy = profile.accuracy + (leading ? 0.02 : -0.06);
        const min = profile.delayMin * (leading ? 0.76 : 0.92);
        const max = profile.delayMax * (leading ? 0.78 : 0.96);
        return { accuracy, delayMin: min, delayMax: max };
      }
    },
    {
      id: "grinder",
      name: "The Grinder",
      description: "Slow and patient at first, then tougher and cleaner in long matches.",
      decide(profile, game) {
        const totalRounds = Math.max(game.questions.length - 1, 1);
        const lateFactor = clamp(game.currentIndex / totalRounds, 0, 1);
        const accuracy = profile.accuracy + 0.01 + lateFactor * 0.08;
        const min = profile.delayMin * (1 - lateFactor * 0.12);
        const max = profile.delayMax * (1 - lateFactor * 0.18);
        return { accuracy, delayMin: min, delayMax: max };
      }
    }
  ];

  const CPU_ARCHETYPE_POOLS = {
    easy: ["gambler", "sprinter", "closer", "counter", "showboat", "gambler", "sprinter"],
    medium: ["counter", "closer", "sniper", "gambler", "bulldog", "grinder", "showboat", "sprinter", "counter"],
    hard: ["sniper", "counter", "closer", "bulldog", "grinder", "sniper", "grinder", "counter", "sprinter"]
  };

  const DEFAULT_CPU_ARCHETYPE_OPTIONS = CPU_ARCHETYPES.reduce((allEnabled, archetype) => {
    allEnabled[archetype.id] = true;
    return allEnabled;
  }, {});

  const MATCH_MODIFIERS = {
    doublePull: {
      label: "Double Pull",
      summary: "Every tug lands twice as hard.",
      chanceWeight: 1
    },
    lightningRound: {
      label: "Lightning Round",
      summary: "Short clock. Snap answers only.",
      chanceWeight: 1
    },
    slipperyRope: {
      label: "Slippery Rope",
      summary: "Wrong locks slip for a penalty.",
      chanceWeight: 0.8
    }
  };

  const QUESTION_REVEAL_OPTIONS = {
    instant: {
      label: "Instant",
      msPerWord: 0,
      minMs: 0,
      maxMs: 0
    },
    average: {
      label: "Average",
      msPerWord: 260,
      minMs: 1500,
      maxMs: 4400
    },
    relaxed: {
      label: "Relaxed",
      msPerWord: 330,
      minMs: 2300,
      maxMs: 6200
    }
  };

  const TOURNAMENT_TEMPLATE = [
    { stage: "Semifinal 1", left: "Brain Bolts", right: "Quiz Comets", winner: null },
    { stage: "Semifinal 2", left: "Neon Owls", right: "Turbo Foxes", winner: null },
    { stage: "Championship", left: null, right: null, winner: null }
  ];

  const DEFAULT_PLAYER_SETUP = {
    pvp: {
      left: "Player One",
      right: "Player Two"
    },
    cpu: {
      human: "Player One"
    },
    tournament: ["Brain Bolts", "Quiz Comets", "Neon Owls", "Turbo Foxes"]
  };

  const STORAGE_KEYS = {
    options: "tugotrivia-options",
    token: "tugotrivia-token",
    lastMode: "tugotrivia-last-mode",
    lastCategory: "tugotrivia-last-category",
    lastDifficulty: "tugotrivia-last-difficulty",
    playerSetup: "tugotrivia-player-setup",
    triviaCache: "tugotrivia-trivia-cache",
    recentPrompts: "tugotrivia-recent-prompts"
  };

  const LOCAL_QUESTION_BANK = [
    { category: "general", question: "Which planet is known as the Red Planet?", correct: "Mars", incorrect: ["Venus", "Jupiter", "Mercury"] },
    { category: "general", question: "What is the largest ocean on Earth?", correct: "Pacific Ocean", incorrect: ["Atlantic Ocean", "Indian Ocean", "Arctic Ocean"] },
    { category: "general", question: "Which language has the most native speakers worldwide?", correct: "Mandarin Chinese", incorrect: ["English", "Spanish", "Hindi"] },
    { category: "general", question: "What is the capital city of Australia?", correct: "Canberra", incorrect: ["Sydney", "Melbourne", "Perth"] },
    { category: "general", question: "Which metal is liquid at room temperature?", correct: "Mercury", incorrect: ["Silver", "Aluminum", "Tin"] },
    { category: "science", question: "What part of the cell contains most of its genetic material?", correct: "The nucleus", incorrect: ["The membrane", "The ribosome", "The vacuole"] },
    { category: "science", question: "What gas do plants absorb from the atmosphere during photosynthesis?", correct: "Carbon dioxide", incorrect: ["Oxygen", "Nitrogen", "Hydrogen"] },
    { category: "science", question: "Which scientist proposed the three laws of motion?", correct: "Isaac Newton", incorrect: ["Albert Einstein", "Galileo Galilei", "Niels Bohr"] },
    { category: "science", question: "What is the chemical symbol for sodium?", correct: "Na", incorrect: ["So", "Sd", "Sn"] },
    { category: "science", question: "How many bones are in a typical adult human body?", correct: "206", incorrect: ["198", "212", "220"] },
    { category: "history", question: "Which wall came down in 1989, symbolizing the end of the Cold War division in Germany?", correct: "The Berlin Wall", incorrect: ["Hadrian's Wall", "The Great Wall", "The Wailing Wall"] },
    { category: "history", question: "Who was the first President of the United States?", correct: "George Washington", incorrect: ["Thomas Jefferson", "John Adams", "James Madison"] },
    { category: "history", question: "The ancient city of Machu Picchu was built by which civilization?", correct: "The Inca", incorrect: ["The Maya", "The Aztec", "The Romans"] },
    { category: "history", question: "In which country did the Renaissance begin?", correct: "Italy", incorrect: ["France", "Spain", "Greece"] },
    { category: "history", question: "Which ship famously sank on its maiden voyage in 1912?", correct: "Titanic", incorrect: ["Britannic", "Lusitania", "Olympic"] },
    { category: "entertainment", question: "Which video game franchise features the hero Link?", correct: "The Legend of Zelda", incorrect: ["Final Fantasy", "Metroid", "Fire Emblem"] },
    { category: "entertainment", question: "Who directed the movie Jaws?", correct: "Steven Spielberg", incorrect: ["George Lucas", "James Cameron", "Ridley Scott"] },
    { category: "entertainment", question: "Which animated studio created Spirited Away?", correct: "Studio Ghibli", incorrect: ["Pixar", "DreamWorks", "Laika"] },
    { category: "entertainment", question: "In television, what does the abbreviation TV stand for?", correct: "Television", incorrect: ["Teleview", "Transvision", "Tune Vision"] },
    { category: "entertainment", question: "Which singer is known as the Material Girl?", correct: "Madonna", incorrect: ["Cyndi Lauper", "Janet Jackson", "Whitney Houston"] },
    { category: "sports", question: "How many players from one team are on the court at the same time in basketball?", correct: "5", incorrect: ["4", "6", "7"] },
    { category: "sports", question: "Which country won the first FIFA World Cup in 1930?", correct: "Uruguay", incorrect: ["Brazil", "Argentina", "Italy"] },
    { category: "sports", question: "In tennis, what is the term for a score of zero?", correct: "Love", incorrect: ["Blank", "Nil", "Duck"] },
    { category: "sports", question: "Which sport uses the terms strike, spare, and gutter?", correct: "Bowling", incorrect: ["Baseball", "Darts", "Cricket"] },
    { category: "sports", question: "How long is an Olympic swimming pool?", correct: "50 meters", incorrect: ["25 meters", "60 meters", "100 meters"] },
    { category: "general", question: "Which instrument measures temperature?", correct: "Thermometer", incorrect: ["Barometer", "Seismograph", "Caliper"] },
    { category: "science", question: "What is the nearest star to Earth besides the Sun?", correct: "Proxima Centauri", incorrect: ["Sirius", "Betelgeuse", "Alpha Centauri B"] },
    { category: "history", question: "Who was known as the Maid of Orleans?", correct: "Joan of Arc", incorrect: ["Catherine de Medici", "Marie Curie", "Eleanor of Aquitaine"] },
    { category: "entertainment", question: "What color pill does Neo take in The Matrix?", correct: "Red", incorrect: ["Blue", "Green", "Gold"] },
    { category: "sports", question: "Which racing series is most closely associated with the Indy 500?", correct: "IndyCar", incorrect: ["Formula One", "NASCAR Cup Series", "MotoGP"] }
  ];

  const defaultOptions = {
    music: true,
    sfx: true,
    ropeLength: "standard",
    questionReveal: "average",
    timer: "standard",
    motion: "full",
    contrast: "standard",
    textSize: "normal",
    cpuArchetypes: { ...DEFAULT_CPU_ARCHETYPE_OPTIONS },
    modifiers: {
      doublePull: true,
      lightningRound: true,
      slipperyRope: false
    }
  };

  const state = {
    screen: "title",
    options: loadOptions(),
    selections: {
      mode: localStorage.getItem(STORAGE_KEYS.lastMode) || "pvp",
      difficulty: localStorage.getItem(STORAGE_KEYS.lastDifficulty) || "medium",
      category: localStorage.getItem(STORAGE_KEYS.lastCategory) || "random",
      setup: loadPlayerSetup()
    },
    api: {
      token: localStorage.getItem(STORAGE_KEYS.token) || "",
      lastRequestAt: 0
    },
    tournament: null,
    game: createFreshGameState(),
    ui: {
      toastTimer: null,
      titleTick: 0
    }
  };

  const el = {};

  const audio = {
    context: null,
    master: null,
    musicGain: null,
    sfxGain: null,
    compressor: null,
    started: false,
    loopHandle: null,
    nextMusicAt: 0,
    beatIndex: 0,
    barIndex: 0,

    async unlock() {
      if (this.context) {
        if (this.context.state === "suspended") {
          await this.context.resume();
        }
        this.syncGains();
        if (!this.started && state.options.music) {
          this.startMusicLoop();
        }
        return;
      }

      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        return;
      }

      this.context = new AudioContextClass();
      this.master = this.context.createGain();
      this.musicGain = this.context.createGain();
      this.sfxGain = this.context.createGain();
      this.compressor = this.context.createDynamicsCompressor();

      this.master.gain.value = 0.72;
      this.musicGain.gain.value = 0.05;
      this.sfxGain.gain.value = 0.16;
      this.compressor.threshold.value = -22;
      this.compressor.knee.value = 18;
      this.compressor.ratio.value = 8;

      this.musicGain.connect(this.master);
      this.sfxGain.connect(this.master);
      this.master.connect(this.compressor);
      this.compressor.connect(this.context.destination);

      await this.context.resume();
      this.syncGains();

      if (state.options.music) {
        this.startMusicLoop();
      }
    },

    syncGains() {
      if (!this.musicGain || !this.sfxGain) {
        return;
      }
      this.musicGain.gain.setTargetAtTime(state.options.music ? 0.07 : 0.0001, this.context.currentTime, 0.06);
      this.sfxGain.gain.setTargetAtTime(state.options.sfx ? 0.19 : 0.0001, this.context.currentTime, 0.04);
    },

    startMusicLoop() {
      if (!this.context || this.started) {
        return;
      }
      this.started = true;
      this.nextMusicAt = this.context.currentTime + 0.05;
      this.beatIndex = 0;
      this.barIndex = 0;
      this.scheduleMusicBar();
      this.loopHandle = window.setInterval(() => {
        if (!state.options.music) {
          return;
        }
        this.scheduleMusicBar();
      }, 1900);
    },

    stopMusicLoop() {
      if (this.loopHandle) {
        window.clearInterval(this.loopHandle);
        this.loopHandle = null;
      }
      this.started = false;
    },

    scheduleMusicBar() {
      if (!this.context || !state.options.music) {
        return;
      }

      const beat = 0.29;
      const phrase = [
        { root: 196.0, lead: [7, 9, 11, 14, 11, 9, 7, 4], bass: [0, 0, -12, 0, 0, 0, -12, 0], accent: [0, 4, 7] },
        { root: 220.0, lead: [9, 11, 12, 16, 14, 11, 9, 7], bass: [0, -12, 0, -12, 0, -12, 0, -12], accent: [0, 3, 7] },
        { root: 174.61, lead: [4, 7, 9, 11, 9, 7, 4, 2], bass: [0, 0, -12, 0, 0, -12, 0, 0], accent: [0, 3, 7] },
        { root: 196.0, lead: [7, 11, 14, 16, 14, 11, 9, 7], bass: [0, -12, 0, -12, 0, -12, 0, -12], accent: [0, 4, 9] }
      ];
      const bar = phrase[this.barIndex % phrase.length];
      const sparkleOffsets = this.barIndex % 2 === 0 ? [19, 16, 14, 16] : [16, 14, 12, 11];

      for (let i = 0; i < 8; i += 1) {
        const when = this.nextMusicAt + beat * i;
        const leadNote = frequencyFromSemitones(bar.root, bar.lead[i]);
        const bassNote = frequencyFromSemitones(bar.root / 2, bar.bass[i]);
        this.playSynth("triangle", leadNote, when, 0.2, 0.017, this.musicGain);
        this.playSynth("square", leadNote * 2, when + 0.035, 0.08, 0.008, this.musicGain);

        if (i % 2 === 0) {
          this.playSynth("square", bassNote, when, 0.16, 0.03, this.musicGain);
          this.playSynth("sine", bassNote / 2, when, 0.24, 0.02, this.musicGain);
        } else {
          this.playSynth("triangle", frequencyFromSemitones(bar.root, sparkleOffsets[(i - 1) / 2]), when, 0.11, 0.008, this.musicGain);
        }

        if (i === 0 || i === 4) {
          bar.accent.forEach((offset, chordIndex) => {
            this.playSynth("sine", frequencyFromSemitones(bar.root, offset), when, 0.42, 0.012 - chordIndex * 0.002, this.musicGain);
          });
        }

        if (i === 2 || i === 6) {
          this.playSynth("square", 980, when, 0.05, 0.006, this.musicGain);
        } else {
          this.playSynth("square", 1320, when, 0.03, 0.004, this.musicGain);
        }
      }

      this.nextMusicAt += beat * 8;
      this.barIndex += 1;
    },

    playSynth(type, frequency, when, duration, volume, bus) {
      if (!this.context || !bus) {
        return;
      }

      const osc = this.context.createOscillator();
      const gain = this.context.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(frequency, when);
      gain.gain.setValueAtTime(0.0001, when);
      gain.gain.linearRampToValueAtTime(volume, when + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
      osc.connect(gain);
      gain.connect(bus);
      osc.start(when);
      osc.stop(when + duration + 0.02);
    },

    blip(type, frequency, duration, volume, detune = 0) {
      if (!this.context || !state.options.sfx) {
        return;
      }

      const when = this.context.currentTime;
      const osc = this.context.createOscillator();
      const gain = this.context.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(frequency, when);
      osc.detune.setValueAtTime(detune, when);
      gain.gain.setValueAtTime(0.0001, when);
      gain.gain.linearRampToValueAtTime(volume, when + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(when);
      osc.stop(when + duration + 0.03);
    },

    click() {
      this.blip("square", 420, 0.09, 0.08);
    },

    confirm() {
      this.blip("triangle", 560, 0.16, 0.11);
      this.blip("square", 720, 0.12, 0.07, 5);
    },

    correct() {
      this.blip("triangle", 640, 0.13, 0.12);
      this.blip("triangle", 860, 0.18, 0.1);
    },

    wrong() {
      this.blip("sawtooth", 210, 0.18, 0.1);
      this.blip("triangle", 160, 0.22, 0.07);
    },

    tension() {
      this.blip("sawtooth", 190, 0.2, 0.05, -50);
    },

    impact(power) {
      this.blip("square", 120 + power * 30, 0.16, 0.15);
      this.blip("triangle", 210 + power * 36, 0.2, 0.1);
    },

    urgent() {
      this.blip("square", 880, 0.06, 0.055);
    },

    victory() {
      this.blip("triangle", 660, 0.14, 0.11);
      this.blip("triangle", 880, 0.18, 0.1);
      this.blip("triangle", 1046, 0.24, 0.1);
    }
  };

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    cacheElements();
    renderCpuPersonalityOptions();
    bindEvents();
    applyOptionsToUi();
    syncSetupInputs();
    showScreen("title");
    renderSelectionState();
  }

  function cacheElements() {
    el.shell = document.getElementById("game-shell");
    el.toast = document.getElementById("toast");
    el.musicToggleText = document.getElementById("music-toggle-text");
    el.sfxToggleText = document.getElementById("sfx-toggle-text");
    el.screens = Array.from(document.querySelectorAll(".screen"));
    el.loadingOverlay = document.getElementById("loading-overlay");
    el.pauseOverlay = document.getElementById("pause-overlay");
    el.winOverlay = document.getElementById("win-overlay");
    el.loadingMessage = document.getElementById("loading-message");
    el.answersGrid = document.getElementById("answers-grid");
    el.answerButtons = Array.from(document.querySelectorAll(".answer-card"));
    el.answerCopies = el.answerButtons.map((button) => button.querySelector(".answer-copy"));
    el.answerHints = [
      document.getElementById("answer-hint-0"),
      document.getElementById("answer-hint-1"),
      document.getElementById("answer-hint-2"),
      document.getElementById("answer-hint-3")
    ];
    el.roundDisplay = document.getElementById("round-display");
    el.timerDisplay = document.getElementById("timer-display");
    el.timerBar = document.getElementById("timer-bar");
    el.categoryDisplay = document.getElementById("category-display");
    el.modeDisplay = document.getElementById("mode-display");
    el.difficultyDisplay = document.getElementById("difficulty-display");
    el.questionText = document.getElementById("question-text");
    el.modifierDisplay = document.getElementById("modifier-display");
    el.sourceDisplay = document.getElementById("source-display");
    el.announcerText = document.getElementById("announcer-text");
    el.leftScore = document.getElementById("left-score");
    el.rightScore = document.getElementById("right-score");
    el.leftStreak = document.getElementById("left-streak");
    el.rightStreak = document.getElementById("right-streak");
    el.leftLockStatus = document.getElementById("left-lock-status");
    el.rightLockStatus = document.getElementById("right-lock-status");
    el.lastResult = document.getElementById("last-result");
    el.controlsDisplay = document.getElementById("controls-display");
    el.impactBurst = document.getElementById("impact-burst");
    el.particleLayer = document.getElementById("particle-layer");
    el.arenaShell = document.getElementById("arena-shell");
    el.leftPanel = document.getElementById("left-team-panel");
    el.rightPanel = document.getElementById("right-team-panel");
    el.leftTeamName = document.getElementById("left-team-name");
    el.rightTeamName = document.getElementById("right-team-name");
    el.leftRoleLabel = document.getElementById("left-role-label");
    el.rightRoleLabel = document.getElementById("right-role-label");
    el.winTitle = document.getElementById("win-title");
    el.winSubtitle = document.getElementById("win-subtitle");
    el.tournamentProgress = document.getElementById("tournament-progress");
    el.winRounds = document.getElementById("win-rounds");
    el.winPull = document.getElementById("win-pull");
    el.winStreak = document.getElementById("win-streak");
    el.winAccuracy = document.getElementById("win-accuracy");
    el.continueTournamentButton = document.getElementById("continue-tournament-button");
    el.modeSetupTitle = document.getElementById("mode-setup-title");
    el.modeSetupSubtitle = document.getElementById("mode-setup-subtitle");
    el.modeContinueButton = document.getElementById("mode-continue-button");
    el.modeSetupPanels = Array.from(document.querySelectorAll("[data-setup-mode]"));
    el.setupInputs = {
      pvpLeft: document.getElementById("pvp-left-name"),
      pvpRight: document.getElementById("pvp-right-name"),
      cpuHuman: document.getElementById("cpu-human-name"),
      tournament: [
        document.getElementById("tournament-team-1"),
        document.getElementById("tournament-team-2"),
        document.getElementById("tournament-team-3"),
        document.getElementById("tournament-team-4")
      ]
    };
    el.bracketSubtitle = document.getElementById("bracket-subtitle");
    el.bracketCurrentMatch = document.getElementById("bracket-current-match");
    el.bracketRuleset = document.getElementById("bracket-ruleset");
    el.bracketFieldSummary = document.getElementById("bracket-field-summary");
    el.startBracketButton = document.getElementById("start-bracket-button");
    el.bracketChampion = document.getElementById("bracket-champion");
    el.bracketMatchCards = [
      document.getElementById("bracket-match-0"),
      document.getElementById("bracket-match-1"),
      document.getElementById("bracket-match-2")
    ];
    el.bracketSlots = {
      sf1Left: document.getElementById("bracket-sf1-left"),
      sf1Right: document.getElementById("bracket-sf1-right"),
      sf2Left: document.getElementById("bracket-sf2-left"),
      sf2Right: document.getElementById("bracket-sf2-right"),
      finalLeft: document.getElementById("bracket-final-left"),
      finalRight: document.getElementById("bracket-final-right")
    };
    el.optionButtons = Array.from(document.querySelectorAll("[data-action='set-option']"));
    el.modifierButtons = Array.from(document.querySelectorAll("[data-action='toggle-modifier']"));
    el.cpuPersonalityList = document.getElementById("cpu-personality-list");
    el.cpuArchetypeButtons = [];
  }

  function renderCpuPersonalityOptions() {
    if (!el.cpuPersonalityList) {
      return;
    }

    el.cpuPersonalityList.innerHTML = CPU_ARCHETYPES.map((archetype) => `
      <button
        class="option-pill cpu-archetype-toggle"
        data-action="toggle-cpu-archetype"
        data-cpu-archetype="${archetype.id}"
        type="button"
        title="${archetype.description}"
        aria-label="${archetype.name}: ${archetype.description}"
      >${archetype.name}</button>
    `).join("");

    el.cpuArchetypeButtons = Array.from(document.querySelectorAll("[data-action='toggle-cpu-archetype']"));
  }

  function bindEvents() {
    document.addEventListener("click", async (event) => {
      const control = event.target.closest("[data-action]");
      if (!control) {
        return;
      }

      await audio.unlock();
      const action = control.dataset.action;

      if (action !== "pause-game" && action !== "resume-game") {
        audio.click();
      }

      switch (action) {
        case "goto":
          showScreen(control.dataset.target);
          break;
        case "toggle-music":
          setOption("music", state.options.music ? "off" : "on");
          break;
        case "toggle-sfx":
          setOption("sfx", state.options.sfx ? "off" : "on");
          break;
        case "set-mode":
          setMode(control.dataset.mode);
          break;
        case "continue-from-mode":
          continueFromMode();
          break;
        case "set-difficulty":
          setDifficulty(control.dataset.difficulty);
          break;
        case "set-category":
          setCategory(control.dataset.category);
          if (state.selections.mode === "tournament") {
            state.tournament = null;
            showTournamentBracketScreen(true);
          } else {
            await startMatch();
          }
          break;
        case "back-from-category":
          showScreen(state.selections.mode === "cpu" ? "difficulty" : "mode");
          break;
        case "back-from-bracket":
          state.tournament = null;
          showScreen("category");
          break;
        case "start-tournament-match":
          await startMatch();
          break;
        case "set-option":
          setOption(control.dataset.option, control.dataset.value);
          break;
        case "toggle-modifier":
          toggleModifier(control.dataset.modifier);
          break;
        case "toggle-cpu-archetype":
          toggleCpuArchetype(control.dataset.cpuArchetype);
          break;
        case "pause-game":
          pauseGame();
          break;
        case "resume-game":
          resumeGame();
          break;
        case "restart-match":
          closeOverlays();
          if (state.tournament && state.tournament.active && state.game.phase === "complete" && state.tournament.currentMatchIndex === 2) {
            state.tournament = null;
          }
          await startMatch();
          break;
        case "return-title":
          closeOverlays();
          abandonGameToTitle();
          break;
        case "continue-tournament":
          closeOverlays();
          await continueTournament();
          break;
        default:
          break;
      }
    });

    el.answerButtons.forEach((button) => {
      button.addEventListener("click", async () => {
        if (state.game.mode !== "cpu" || state.game.phase !== "question" || state.game.paused) {
          return;
        }
        await audio.unlock();
        handleAnswer("left", Number(button.dataset.answerIndex));
      });
    });

    document.addEventListener("keydown", async (event) => {
      if (event.repeat) {
        return;
      }

      if (event.key === "Escape" && state.screen === "gameplay") {
        event.preventDefault();
        await audio.unlock();
        if (state.game.paused) {
          resumeGame();
        } else if (el.winOverlay.classList.contains("hidden")) {
          pauseGame();
        }
        return;
      }

      if (state.screen !== "gameplay" || state.game.phase !== "question" || state.game.paused) {
        return;
      }

      await audio.unlock();

      const key = event.key.toLowerCase();
      const leftMap = { a: 0, s: 1, d: 2, f: 3 };
      const rightMap = { j: 0, k: 1, l: 2, ";": 3 };
      const numberMap = { "1": 0, "2": 1, "3": 2, "4": 3 };

      if (state.game.mode !== "cpu") {
        if (key in leftMap) {
          handleAnswer("left", leftMap[key]);
        } else if (key in rightMap) {
          handleAnswer("right", rightMap[key]);
        }
      } else if (key in numberMap) {
        handleAnswer("left", numberMap[key]);
      }
    });

    document.addEventListener("input", (event) => {
      const input = event.target.closest("[data-setup-input]");
      if (!input) {
        return;
      }
      updatePlayerSetup(input.dataset.setupInput, input.value);
    });

    document.addEventListener("change", (event) => {
      const input = event.target.closest("[data-setup-input]");
      if (!input) {
        return;
      }
      syncSetupInputs();
    });
  }

  function createFreshGameState() {
    return {
      mode: "pvp",
      difficulty: "medium",
      category: "random",
      questions: [],
      questionCount: 18,
      currentIndex: -1,
      phase: "idle",
      paused: false,
      roundTimerId: null,
      roundTimeoutId: null,
      resultTimeoutId: null,
      revealTimeoutId: null,
      timerDurationMs: 8000,
      roundStartTime: 0,
      roundEndTime: 0,
      roundRemainingMs: 0,
      revealWords: [],
      revealIndex: 0,
      revealStepMs: 0,
      revealRemainingMs: 0,
      revealNextAt: 0,
      cpuPending: null,
      cpuPersona: null,
      ropeGoal: 15,
      ropePosition: 0,
      roundDurationMs: 8000,
      sourceLabel: "Fresh API Batch",
      teamNames: {
        left: "Left Team",
        right: "Right Team"
      },
      stageLabel: "",
      currentModifier: null,
      left: createTeamState(),
      right: createTeamState(),
      currentRound: null,
      usedFallbackBank: false,
      usedCachedQuestions: false,
      fallbackToRandomCategory: false,
      subtleNotice: ""
    };
  }

  function createTeamState() {
    return {
      score: 0,
      streak: 0,
      bestStreak: 0,
      correct: 0,
      answered: 0,
      powerHistory: []
    };
  }

  function createTournamentState(teamNames = DEFAULT_PLAYER_SETUP.tournament) {
    return {
      active: true,
      currentMatchIndex: 0,
      matches: [
        { ...TOURNAMENT_TEMPLATE[0], left: teamNames[0], right: teamNames[1], winner: null },
        { ...TOURNAMENT_TEMPLATE[1], left: teamNames[2], right: teamNames[3], winner: null },
        { ...TOURNAMENT_TEMPLATE[2], left: null, right: null, winner: null }
      ],
      champion: null,
      questionPool: [],
      sourceLabel: "Tournament Pool"
    };
  }

  function showScreen(screenName) {
    closeOverlays();
    state.screen = screenName;
    el.shell.dataset.screen = screenName;
    el.screens.forEach((screen) => {
      screen.classList.toggle("active", screen.dataset.screen === screenName);
    });
    if (screenName === "mode") {
      syncSetupInputs();
    }
    renderSelectionState();
  }

  function renderSelectionState() {
    document.querySelectorAll("[data-action='set-mode']").forEach((button) => {
      button.classList.toggle("selected", button.dataset.mode === state.selections.mode);
    });
    document.querySelectorAll("[data-action='set-difficulty']").forEach((button) => {
      button.classList.toggle("selected", button.dataset.difficulty === state.selections.difficulty);
    });
    document.querySelectorAll("[data-action='set-category']").forEach((button) => {
      button.classList.toggle("selected", button.dataset.category === state.selections.category);
    });
    renderModeSetupUi();
  }

  function setMode(mode) {
    state.selections.mode = mode;
    state.tournament = null;
    localStorage.setItem(STORAGE_KEYS.lastMode, mode);
    renderSelectionState();
    audio.confirm();
  }

  function continueFromMode() {
    audio.confirm();
    showScreen(state.selections.mode === "cpu" ? "difficulty" : "category");
  }

  function setDifficulty(difficulty) {
    state.selections.difficulty = difficulty;
    localStorage.setItem(STORAGE_KEYS.lastDifficulty, difficulty);
    renderSelectionState();
    audio.confirm();
    showScreen("category");
  }

  function setCategory(category) {
    state.selections.category = category;
    localStorage.setItem(STORAGE_KEYS.lastCategory, category);
    renderSelectionState();
    audio.confirm();
  }

  function renderModeSetupUi() {
    const mode = state.selections.mode;
    const copy = mode === "cpu"
      ? {
          title: "Solo Setup",
          subtitle: "Name the human challenger. Difficulty and CPU personality are chosen on the next step.",
          button: "Continue to Difficulty"
        }
      : mode === "tournament"
        ? {
            title: "Bracket Setup",
            subtitle: "Name all four teams. After category select, you will review the bracket before the first semifinal.",
            button: "Continue to Category"
          }
        : {
            title: "Local Duel Names",
            subtitle: "Name both local players. These names appear during the match and on the win screen.",
            button: "Continue to Category"
          };

    el.modeSetupTitle.textContent = copy.title;
    el.modeSetupSubtitle.textContent = copy.subtitle;
    el.modeContinueButton.textContent = copy.button;
    el.modeSetupPanels.forEach((panel) => {
      panel.classList.toggle("active", panel.dataset.setupMode === mode);
    });
  }

  function syncSetupInputs() {
    if (!el.setupInputs.pvpLeft) {
      return;
    }
    el.setupInputs.pvpLeft.value = state.selections.setup.pvp.left;
    el.setupInputs.pvpRight.value = state.selections.setup.pvp.right;
    el.setupInputs.cpuHuman.value = state.selections.setup.cpu.human;
    el.setupInputs.tournament.forEach((input, index) => {
      input.value = state.selections.setup.tournament[index];
    });
  }

  function updatePlayerSetup(key, rawValue) {
    const value = normalizeName(rawValue, getFallbackNameForSetupKey(key));
    switch (key) {
      case "pvp-left":
        state.selections.setup.pvp.left = value;
        break;
      case "pvp-right":
        state.selections.setup.pvp.right = value;
        break;
      case "cpu-human":
        state.selections.setup.cpu.human = value;
        break;
      default:
        if (key.startsWith("tournament-")) {
          const index = Number(key.split("-")[1]);
          if (!Number.isNaN(index) && state.selections.setup.tournament[index] !== undefined) {
            state.selections.setup.tournament[index] = value;
            state.tournament = null;
          }
        }
        break;
    }
    savePlayerSetup();
  }

  function getFallbackNameForSetupKey(key) {
    switch (key) {
      case "pvp-left":
        return DEFAULT_PLAYER_SETUP.pvp.left;
      case "pvp-right":
        return DEFAULT_PLAYER_SETUP.pvp.right;
      case "cpu-human":
        return DEFAULT_PLAYER_SETUP.cpu.human;
      default:
        if (key.startsWith("tournament-")) {
          const index = Number(key.split("-")[1]);
          return DEFAULT_PLAYER_SETUP.tournament[index] || "Team";
        }
        return "Player";
    }
  }

  function savePlayerSetup() {
    localStorage.setItem(STORAGE_KEYS.playerSetup, JSON.stringify(state.selections.setup));
  }

  function setOption(option, rawValue) {
    const value = rawValue === "on" ? true : rawValue === "off" ? false : rawValue;
    state.options[option] = value;
    saveOptions();
    applyOptionsToUi();
    if (option === "music" || option === "sfx") {
      audio.syncGains();
      if (option === "music") {
        if (state.options.music) {
          audio.startMusicLoop();
        } else {
          audio.stopMusicLoop();
        }
      }
    }
    audio.confirm();
  }

  function toggleModifier(modifierId) {
    state.options.modifiers[modifierId] = !state.options.modifiers[modifierId];
    saveOptions();
    applyOptionsToUi();
    audio.confirm();
  }

  function toggleCpuArchetype(archetypeId) {
    if (!(archetypeId in state.options.cpuArchetypes)) {
      return;
    }

    const enabledIds = Object.keys(state.options.cpuArchetypes).filter((id) => state.options.cpuArchetypes[id]);
    if (state.options.cpuArchetypes[archetypeId] && enabledIds.length === 1) {
      showToast("Leave at least one CPU personality enabled.");
      audio.wrong();
      return;
    }

    state.options.cpuArchetypes[archetypeId] = !state.options.cpuArchetypes[archetypeId];
    saveOptions();
    applyOptionsToUi();
    audio.confirm();
  }

  function saveOptions() {
    localStorage.setItem(STORAGE_KEYS.options, JSON.stringify(state.options));
  }

  function applyOptionsToUi() {
    el.musicToggleText.textContent = state.options.music ? "On" : "Off";
    el.sfxToggleText.textContent = state.options.sfx ? "On" : "Off";
    document.querySelector("[data-action='toggle-music']").setAttribute("aria-pressed", String(state.options.music));
    document.querySelector("[data-action='toggle-sfx']").setAttribute("aria-pressed", String(state.options.sfx));
    el.shell.classList.toggle("reduced-motion", state.options.motion === "reduced");
    el.shell.classList.toggle("high-contrast", state.options.contrast === "high");
    el.shell.classList.toggle("large-text", state.options.textSize === "large");

    el.optionButtons.forEach((button) => {
      const option = button.dataset.option;
      const value = button.dataset.value;
      const current = state.options[option];
      button.classList.toggle(
        "selected",
        String(current) === value || (current === true && value === "on") || (current === false && value === "off")
      );
    });

    el.modifierButtons.forEach((button) => {
      button.classList.toggle("selected", Boolean(state.options.modifiers[button.dataset.modifier]));
    });

    el.cpuArchetypeButtons.forEach((button) => {
      const enabled = Boolean(state.options.cpuArchetypes[button.dataset.cpuArchetype]);
      button.classList.toggle("selected", enabled);
      button.setAttribute("aria-pressed", String(enabled));
    });
  }

  function loadOptions() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.options) || "null");
      return {
        ...defaultOptions,
        ...(stored || {}),
        questionReveal: QUESTION_REVEAL_OPTIONS[stored && stored.questionReveal] ? stored.questionReveal : defaultOptions.questionReveal,
        cpuArchetypes: normalizeCpuArchetypeOptions(stored && stored.cpuArchetypes),
        modifiers: {
          ...defaultOptions.modifiers,
          ...((stored && stored.modifiers) || {})
        }
      };
    } catch (error) {
      return {
        ...defaultOptions,
        cpuArchetypes: { ...DEFAULT_CPU_ARCHETYPE_OPTIONS },
        modifiers: { ...defaultOptions.modifiers }
      };
    }
  }

  function normalizeCpuArchetypeOptions(storedMap) {
    const normalized = {
      ...DEFAULT_CPU_ARCHETYPE_OPTIONS,
      ...((storedMap && typeof storedMap === "object") ? storedMap : {})
    };
    const validIds = new Set(CPU_ARCHETYPES.map((archetype) => archetype.id));

    Object.keys(normalized).forEach((id) => {
      if (!validIds.has(id)) {
        delete normalized[id];
        return;
      }
      normalized[id] = Boolean(normalized[id]);
    });

    if (!Object.values(normalized).some(Boolean)) {
      return { ...DEFAULT_CPU_ARCHETYPE_OPTIONS };
    }

    return normalized;
  }

  function loadPlayerSetup() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.playerSetup) || "null");
      return {
        pvp: {
          left: normalizeName(stored && stored.pvp && stored.pvp.left, DEFAULT_PLAYER_SETUP.pvp.left),
          right: normalizeName(stored && stored.pvp && stored.pvp.right, DEFAULT_PLAYER_SETUP.pvp.right)
        },
        cpu: {
          human: normalizeName(stored && stored.cpu && stored.cpu.human, DEFAULT_PLAYER_SETUP.cpu.human)
        },
        tournament: DEFAULT_PLAYER_SETUP.tournament.map((fallback, index) => normalizeName(stored && stored.tournament && stored.tournament[index], fallback))
      };
    } catch (error) {
      return {
        pvp: { ...DEFAULT_PLAYER_SETUP.pvp },
        cpu: { ...DEFAULT_PLAYER_SETUP.cpu },
        tournament: [...DEFAULT_PLAYER_SETUP.tournament]
      };
    }
  }

  async function startMatch() {
    resetGameState();
    state.game.mode = state.selections.mode;
    state.game.difficulty = state.selections.difficulty;
    state.game.category = state.selections.category;
    state.game.timerDurationMs = state.options.timer === "rapid" ? 7000 : 8000;

    showOverlay(el.loadingOverlay, true);
    el.loadingMessage.textContent = state.selections.mode === "tournament"
      ? "Building the local tournament bracket and stocking the question pool..."
      : "Fetching a fresh question batch from Open Trivia DB. Local backup questions are ready if needed.";

    if (state.selections.mode === "tournament") {
      await prepareTournamentMatch();
    } else {
      state.tournament = null;
      state.game.ropeGoal = state.options.ropeLength === "showdown" ? 18 : 15;
      state.game.questionCount = 18;
      state.game.teamNames = state.selections.mode === "cpu"
        ? { left: state.selections.setup.cpu.human, right: "CPU Side" }
        : { left: state.selections.setup.pvp.left, right: state.selections.setup.pvp.right };
      state.game.stageLabel = "";
      state.game.cpuPersona = state.selections.mode === "cpu" ? chooseCpuPersona(state.selections.difficulty) : null;

      try {
        const loaded = await loadQuestionBatch(state.game.category, state.game.questionCount);
        hydrateMatchQuestionsFromLoad(loaded, state.game.questionCount);
      } catch (error) {
        hydrateMatchQuestionsFromFallback(state.game.category, state.game.questionCount);
      }
    }

    configureGameplayLabels();
    showOverlay(el.loadingOverlay, false);
    showScreen("gameplay");
    audio.confirm();
    startNextRound();
  }

  function resetGameState() {
    clearTimers();
    state.game = createFreshGameState();
    updateHud();
    updateLockStatuses();
    updateAnswerHints();
    updateRopeVisuals();
    el.answersGrid.classList.remove("is-concealed");
    el.questionText.classList.remove("is-revealing");
    el.lastResult.textContent = "Grab the rope and get ready.";
    el.announcerText.textContent = "The stage lights are up. The crowd wants a clean pull.";
    el.modifierDisplay.textContent = "Classic Round";
    el.sourceDisplay.textContent = "Fresh API Batch";
    el.tournamentProgress.textContent = "";
    el.continueTournamentButton.classList.remove("visible");
  }

  function configureGameplayLabels() {
    const cpuLabel = state.game.cpuPersona
      ? `${CPU_PROFILES[state.game.difficulty].label} | ${state.game.cpuPersona.name}`
      : CPU_PROFILES[state.game.difficulty].label;

    if (state.game.mode === "tournament") {
      el.modeDisplay.textContent = "Local Tournament";
      el.difficultyDisplay.textContent = state.game.stageLabel || "Bracket Match";
      el.leftRoleLabel.textContent = "Local Team";
      el.rightRoleLabel.textContent = "Local Team";
      el.leftTeamName.textContent = state.game.teamNames.left;
      el.rightTeamName.textContent = state.game.teamNames.right;
    } else {
      el.modeDisplay.textContent = state.game.mode === "pvp" ? "Player vs Player" : "Player vs CPU";
      el.difficultyDisplay.textContent = state.game.mode === "cpu" ? cpuLabel : "Local Duel";
      el.leftRoleLabel.textContent = state.game.mode === "cpu" ? "Human Challenger" : "A S D F";
      el.rightRoleLabel.textContent = state.game.mode === "cpu" ? state.game.cpuPersona.name : "J K L ;";
      el.leftTeamName.textContent = state.game.teamNames.left;
      el.rightTeamName.textContent = state.game.teamNames.right;
    }

    el.categoryDisplay.textContent = CATEGORY_LABELS[state.game.category];
    el.controlsDisplay.textContent =
      state.game.mode === "cpu"
        ? "Answer: click or 1 2 3 4 | CPU locks after a delay | Pause: Esc"
        : "Left: A S D F | Right: J K L ; | Pause: Esc";
    el.sourceDisplay.textContent = state.game.sourceLabel;
    updateAnswerHints();
  }

  function updateAnswerHints() {
    const hints = state.game.mode === "cpu"
      ? ["1 / Click", "2 / Click", "3 / Click", "4 / Click"]
      : ["A / J", "S / K", "D / L", "F / ;"];

    el.answerHints.forEach((hintEl, index) => {
      hintEl.textContent = hints[index];
    });
  }

  function startNextRound() {
    clearTimers();
    state.game.currentIndex += 1;

    if (state.game.currentIndex >= state.game.questions.length) {
      finalizeMatch(determinePointsWinner(), "Questions exhausted");
      return;
    }

    const question = state.game.questions[state.game.currentIndex];
    state.game.currentRound = {
      ...question,
      answers: [...question.answers],
      responses: {
        left: null,
        right: null
      }
    };
    state.game.currentModifier = chooseRoundModifier();
    state.game.roundDurationMs = getRoundDurationForModifier(state.game.currentModifier);
    state.game.phase = "revealing";
    state.game.paused = false;
    state.game.roundStartTime = 0;
    state.game.roundEndTime = 0;
    state.game.roundRemainingMs = state.game.roundDurationMs;

    el.answerButtons.forEach((button) => {
      button.disabled = false;
      button.classList.remove("correct", "incorrect", "locked-left", "locked-right", "locked-both");
    });

    el.modifierDisplay.textContent = state.game.currentModifier ? state.game.currentModifier.label : "Classic Round";
    setAnnouncerText(buildRoundAnnouncement());
    el.lastResult.textContent = "Read the prompt. Answers unlock after the final word.";
    updateHud();
    updateLockStatuses();
    beginQuestionReveal();
  }

  function beginQuestionReveal() {
    const question = state.game.currentRound;
    const profile = getQuestionRevealProfile();
    const revealWords = tokenizePromptForReveal(question.prompt);

    state.game.revealWords = revealWords;
    state.game.revealIndex = 0;
    state.game.revealStepMs = getRevealStepMs(revealWords.length, profile);
    state.game.revealRemainingMs = state.game.revealStepMs;
    state.game.revealNextAt = 0;

    el.answersGrid.classList.add("is-concealed");
    el.questionText.classList.remove("is-revealing");
    el.questionText.textContent = "";
    el.answerCopies.forEach((copy) => {
      copy.textContent = "";
    });
    el.answerButtons.forEach((button, index) => {
      button.disabled = true;
      button.setAttribute("aria-label", `Choice ${index + 1}`);
    });
    updateRevealVisuals(0, revealWords.length);

    if (state.options.questionReveal === "instant" || revealWords.length < 2) {
      el.questionText.textContent = question.prompt;
      finishQuestionReveal();
      return;
    }

    el.questionText.classList.add("is-revealing");
    advanceQuestionReveal();
  }

  function advanceQuestionReveal() {
    if (state.game.phase !== "revealing" || state.game.paused) {
      return;
    }

    state.game.revealIndex = Math.min(state.game.revealWords.length, state.game.revealIndex + 1);
    el.questionText.textContent = state.game.revealWords.slice(0, state.game.revealIndex).join(" ");
    updateRevealVisuals(state.game.revealIndex, state.game.revealWords.length);

    if (state.game.revealIndex >= state.game.revealWords.length) {
      finishQuestionReveal();
      return;
    }

    scheduleQuestionRevealStep(state.game.revealStepMs);
  }

  function scheduleQuestionRevealStep(delayMs) {
    clearTimeout(state.game.revealTimeoutId);
    const safeDelay = Math.max(80, Math.round(delayMs || state.game.revealStepMs || 80));
    state.game.revealRemainingMs = safeDelay;
    state.game.revealNextAt = performance.now() + safeDelay;
    state.game.revealTimeoutId = window.setTimeout(() => {
      state.game.revealTimeoutId = null;
      advanceQuestionReveal();
    }, safeDelay);
  }

  function finishQuestionReveal() {
    clearTimeout(state.game.revealTimeoutId);
    state.game.revealTimeoutId = null;
    state.game.revealNextAt = 0;
    state.game.revealRemainingMs = 0;
    state.game.phase = "question";
    el.questionText.classList.remove("is-revealing");
    el.questionText.textContent = state.game.currentRound.prompt;
    populateAnswers(state.game.currentRound);
    el.answersGrid.classList.remove("is-concealed");
    el.lastResult.textContent = "Both sides are live. Faster correct answers hit harder.";
    updateLockStatuses();
    startRoundTimer(state.game.roundDurationMs);
    if (state.game.mode === "cpu") {
      scheduleCpuAnswer();
    }
  }

  function populateAnswers(round) {
    el.answerCopies.forEach((copy, index) => {
      copy.textContent = round.answers[index];
      el.answerButtons[index].setAttribute("aria-label", `Choice ${index + 1}: ${round.answers[index]}`);
    });
    el.answerButtons.forEach((button) => {
      button.disabled = false;
    });
  }

  function startRoundTimer(durationMs) {
    clearInterval(state.game.roundTimerId);
    clearTimeout(state.game.roundTimeoutId);

    state.game.roundStartTime = performance.now();
    state.game.roundEndTime = state.game.roundStartTime + durationMs;
    state.game.roundRemainingMs = durationMs;
    updateTimerVisuals(durationMs);

    state.game.roundTimerId = window.setInterval(() => {
      if (state.game.paused || state.game.phase !== "question") {
        return;
      }

      const remaining = Math.max(0, state.game.roundEndTime - performance.now());
      state.game.roundRemainingMs = remaining;
      updateTimerVisuals(remaining);

      if (remaining <= 1600 && remaining >= 1450) {
        audio.urgent();
      }
      if (remaining <= 900 && remaining >= 720) {
        audio.urgent();
      }
    }, 80);

    state.game.roundTimeoutId = window.setTimeout(() => {
      resolveRound("Time's up.");
    }, durationMs + 10);
  }

  function updateTimerVisuals(remainingMs) {
    const fraction = clamp(remainingMs / state.game.roundDurationMs, 0, 1);
    el.timerBar.style.transform = `scaleX(${fraction})`;
    el.timerBar.classList.toggle("urgent", fraction <= 0.24);
    el.timerDisplay.textContent = (remainingMs / 1000).toFixed(1);
  }

  function updateRevealVisuals(revealedWords, totalWords) {
    el.timerBar.style.transform = "scaleX(1)";
    el.timerBar.classList.remove("urgent");
    el.timerDisplay.textContent = "READ";
  }

  function handleAnswer(side, index) {
    if (state.game.phase !== "question" || state.game.paused) {
      return;
    }

    const round = state.game.currentRound;
    if (!round || round.responses[side]) {
      return;
    }

    const elapsed = state.game.roundDurationMs - Math.max(0, state.game.roundEndTime - performance.now());
    const correct = index === round.correctIndex;
    round.responses[side] = {
      index,
      correct,
      elapsedMs: Math.max(0, elapsed)
    };

    state.game[side].answered += 1;
    markAnswerLocks();
    updateLockStatuses();

    if (correct) {
      audio.correct();
    } else {
      audio.wrong();
    }

    if (state.game.mode === "pvp") {
      if (round.responses.left && round.responses.right) {
        resolveRound("Both players locked in.");
      }
    } else if (round.responses.left && round.responses.right) {
      resolveRound("Both sides locked in.");
    }
  }

  function markAnswerLocks() {
    const { left, right } = state.game.currentRound.responses;

    el.answerButtons.forEach((button, index) => {
      button.classList.remove("locked-left", "locked-right", "locked-both");
      const leftLocked = left && left.index === index;
      const rightLocked = right && right.index === index;

      if (leftLocked && rightLocked) {
        button.classList.add("locked-both");
      } else if (leftLocked) {
        button.classList.add("locked-left");
      } else if (rightLocked) {
        button.classList.add("locked-right");
      }
    });
  }

  function updateLockStatuses() {
    const responses = state.game.currentRound ? state.game.currentRound.responses : { left: null, right: null };
    el.leftLockStatus.textContent = formatLockStatus(responses.left);
    el.rightLockStatus.textContent = formatLockStatus(responses.right);
  }

  function formatLockStatus(response) {
    if (state.game.phase === "idle") {
      return "Waiting";
    }
    if (state.game.phase === "revealing") {
      return "Reading";
    }
    if (!response) {
      return state.game.phase === "question" ? "Thinking" : "Missed";
    }
    return response.correct ? "Correct" : "Wrong";
  }

  function scheduleCpuAnswer() {
    const profile = CPU_PROFILES[state.game.difficulty];
    const personaPlan = state.game.cpuPersona.decide(profile, state.game, state.game.currentRound);
    const round = state.game.currentRound;
    const timerFactor = state.game.currentModifier && state.game.currentModifier.id === "lightningRound" ? 0.84 : 1;
    const accuracy = clamp(personaPlan.accuracy, 0.32, 0.97);
    const willBeCorrect = Math.random() <= accuracy;
    const correctIndex = round.correctIndex;
    const wrongChoices = [0, 1, 2, 3].filter((index) => index !== correctIndex);
    const answerIndex = willBeCorrect ? correctIndex : wrongChoices[randomInt(0, wrongChoices.length - 1)];
    const minDelay = Math.max(420, Math.round(personaPlan.delayMin * timerFactor));
    const maxDelay = Math.max(minDelay + 120, Math.round(personaPlan.delayMax * timerFactor));
    const delayCeiling = Math.max(minDelay, Math.min(maxDelay, state.game.roundDurationMs - 450));
    const delay = randomInt(minDelay, delayCeiling);

    state.game.cpuPending = {
      answerIndex,
      delayRemaining: delay
    };

    state.game.cpuPending.timeoutId = window.setTimeout(() => {
      if (state.game.phase === "question" && !state.game.paused) {
        handleAnswer("right", answerIndex);
      }
      state.game.cpuPending = null;
    }, delay);
  }

  function resolveRound(reason) {
    if (state.game.phase !== "question") {
      return;
    }

    state.game.phase = "resolving";
    clearTimers();

    const round = state.game.currentRound;
    const leftOutcome = scoreResponse("left", round.responses.left);
    const rightOutcome = scoreResponse("right", round.responses.right);
    const rawMovement = leftOutcome.power - rightOutcome.power;
    const movement = applyModifierToMovement(rawMovement);

    revealCorrectAnswer(round.correctIndex);

    if (movement > 0) {
      state.game.ropePosition = clamp(state.game.ropePosition + movement, -state.game.ropeGoal, state.game.ropeGoal);
      el.lastResult.textContent = `${teamLabel("left")} pulls ${movement}! ${leftOutcome.summary} ${rightOutcome.summary}`.trim();
      setAnnouncerText(buildResolutionAnnouncement("left", movement));
      animateImpact("left", movement);
    } else if (movement < 0) {
      state.game.ropePosition = clamp(state.game.ropePosition + movement, -state.game.ropeGoal, state.game.ropeGoal);
      el.lastResult.textContent = `${teamLabel("right")} pulls ${Math.abs(movement)}! ${leftOutcome.summary} ${rightOutcome.summary}`.trim();
      setAnnouncerText(buildResolutionAnnouncement("right", Math.abs(movement)));
      animateImpact("right", Math.abs(movement));
    } else {
      el.lastResult.textContent = `No movement. ${leftOutcome.summary} ${rightOutcome.summary}`.trim();
      setAnnouncerText("Dead center. The rope holds and the crowd groans.");
      animateImpact("neutral", 1);
    }

    updateHud();
    updateLockStatuses();
    updateRopeVisuals();
    highlightPanels(movement);

    if (state.game.ropePosition >= state.game.ropeGoal) {
      state.game.resultTimeoutId = window.setTimeout(() => {
        finalizeMatch("left", reason);
      }, 1550);
    } else if (state.game.ropePosition <= -state.game.ropeGoal) {
      state.game.resultTimeoutId = window.setTimeout(() => {
        finalizeMatch("right", reason);
      }, 1550);
    } else {
      state.game.resultTimeoutId = window.setTimeout(() => {
        startNextRound();
      }, 1650);
    }
  }

  function scoreResponse(side, response) {
    const team = state.game[side];
    const slipperyRope = state.game.currentModifier && state.game.currentModifier.id === "slipperyRope";

    if (!response) {
      team.streak = 0;
      team.powerHistory.push(0);
      return { power: 0, summary: `${teamLabel(side)} missed.` };
    }

    if (!response.correct) {
      team.streak = 0;
      const penalty = slipperyRope ? -1 : 0;
      team.powerHistory.push(penalty);
      return { power: penalty, summary: slipperyRope ? `${teamLabel(side)} slipped on a bad lock.` : `${teamLabel(side)} whiffed.` };
    }

    let power = 2;
    let note = "clean answer";

    if (response.elapsedMs < 2000) {
      power += 2;
      note = "blazing-fast answer";
    } else if (response.elapsedMs < 4000) {
      power += 1;
      note = "quick answer";
    }

    team.streak += 1;
    team.bestStreak = Math.max(team.bestStreak, team.streak);
    team.correct += 1;

    if (team.streak % 3 === 0) {
      power += 1;
      note += " with a streak bonus";
    }

    team.score += power;
    team.powerHistory.push(power);
    return { power, summary: `${teamLabel(side)} landed a ${note}.` };
  }

  function revealCorrectAnswer(correctIndex) {
    el.answerButtons.forEach((button, index) => {
      button.disabled = true;
      if (index === correctIndex) {
        button.classList.add("correct");
      } else {
        const leftWrong = state.game.currentRound.responses.left && state.game.currentRound.responses.left.index === index && !state.game.currentRound.responses.left.correct;
        const rightWrong = state.game.currentRound.responses.right && state.game.currentRound.responses.right.index === index && !state.game.currentRound.responses.right.correct;
        if (leftWrong || rightWrong) {
          button.classList.add("incorrect");
        }
      }
    });
  }

  function animateImpact(direction, magnitude) {
    const progress = state.game.ropePosition / state.game.ropeGoal;
    el.shell.style.setProperty("--rope-progress", progress.toFixed(4));
    el.shell.style.setProperty("--impact-shift", `${direction === "left" ? -magnitude * 1.6 : direction === "right" ? magnitude * 1.6 : 0}px`);

    audio.tension();
    audio.impact(magnitude);
    el.impactBurst.classList.remove("show");
    void el.impactBurst.offsetWidth;
    el.impactBurst.classList.add("show");

    if (state.options.motion !== "reduced") {
      el.arenaShell.classList.remove("screen-shake");
      void el.arenaShell.offsetWidth;
      el.arenaShell.classList.add("screen-shake");
      spawnParticles(direction, magnitude);
    }

    window.setTimeout(() => {
      el.shell.style.setProperty("--impact-shift", "0px");
      el.arenaShell.classList.remove("screen-shake");
      el.impactBurst.classList.remove("show");
    }, 360);
  }

  function highlightPanels(movement) {
    el.leftPanel.classList.remove("is-winning", "is-pulling", "is-staggered");
    el.rightPanel.classList.remove("is-winning", "is-pulling", "is-staggered");

    if (movement > 0) {
      el.leftPanel.classList.add("is-winning", "is-pulling");
      el.rightPanel.classList.add("is-staggered");
    } else if (movement < 0) {
      el.rightPanel.classList.add("is-winning", "is-pulling");
      el.leftPanel.classList.add("is-staggered");
    }

    window.setTimeout(() => {
      el.leftPanel.classList.remove("is-winning", "is-pulling", "is-staggered");
      el.rightPanel.classList.remove("is-winning", "is-pulling", "is-staggered");
    }, 640);
  }

  function updateHud() {
    el.roundDisplay.textContent = `${Math.max(state.game.currentIndex + 1, 1)} / ${state.game.questions.length || state.game.questionCount}`;
    el.leftScore.textContent = state.game.left.score;
    el.rightScore.textContent = state.game.right.score;
    el.leftStreak.textContent = state.game.left.streak;
    el.rightStreak.textContent = state.game.right.streak;
    el.categoryDisplay.textContent = CATEGORY_LABELS[state.game.category];
    el.sourceDisplay.textContent = state.game.sourceLabel;
  }

  function updateRopeVisuals() {
    const progress = state.game.ropeGoal ? state.game.ropePosition / state.game.ropeGoal : 0;
    el.shell.style.setProperty("--rope-progress", progress.toFixed(4));
  }

  function pauseGame() {
    if (state.screen !== "gameplay" || state.game.paused || state.game.phase === "idle") {
      return;
    }

    state.game.paused = true;
    if (state.game.phase === "revealing") {
      state.game.revealRemainingMs = Math.max(0, state.game.revealNextAt - performance.now());
      clearTimeout(state.game.revealTimeoutId);
      state.game.revealTimeoutId = null;
    } else if (state.game.phase === "question") {
      state.game.roundRemainingMs = Math.max(0, state.game.roundEndTime - performance.now());
      clearInterval(state.game.roundTimerId);
      clearTimeout(state.game.roundTimeoutId);
    }

    if (state.game.cpuPending && state.game.cpuPending.timeoutId) {
      const approxElapsed = state.game.roundDurationMs - state.game.roundRemainingMs;
      const plannedElapsed = state.game.cpuPending.delayRemaining;
      state.game.cpuPending.delayRemaining = Math.max(120, plannedElapsed - approxElapsed);
      clearTimeout(state.game.cpuPending.timeoutId);
      state.game.cpuPending.timeoutId = null;
    }

    showOverlay(el.pauseOverlay, true);
  }

  function resumeGame() {
    if (!state.game.paused) {
      return;
    }

    state.game.paused = false;
    showOverlay(el.pauseOverlay, false);

    if (state.game.phase === "revealing") {
      scheduleQuestionRevealStep(state.game.revealRemainingMs || state.game.revealStepMs);
      return;
    }

    if (state.game.phase === "question") {
      startRoundTimer(state.game.roundRemainingMs || state.game.roundDurationMs);

      if (state.game.mode === "cpu" && state.game.cpuPending && !state.game.currentRound.responses.right) {
        state.game.cpuPending.timeoutId = window.setTimeout(() => {
          if (state.game.phase === "question" && !state.game.paused) {
            handleAnswer("right", state.game.cpuPending.answerIndex);
          }
          state.game.cpuPending = null;
        }, state.game.cpuPending.delayRemaining);
      }
    }
  }

  function finalizeMatch(winner, reason) {
    clearTimers();
    state.game.phase = "complete";

    const totalRounds = state.game.currentIndex + 1;
    const bestStreak = Math.max(state.game.left.bestStreak, state.game.right.bestStreak);
    const answered = state.game.left.answered + state.game.right.answered;
    const correct = state.game.left.correct + state.game.right.correct;
    const accuracy = answered ? Math.round((correct / answered) * 100) : 0;
    const winningTeam = winner === "left" ? state.game.left : state.game.right;
    const winnerName = teamLabel(winner);
    const isTournament = Boolean(state.tournament && state.tournament.active);

    if (isTournament) {
      const currentMatch = state.tournament.matches[state.tournament.currentMatchIndex];
      currentMatch.winner = winnerName;
      if (state.tournament.currentMatchIndex === 1) {
        state.tournament.matches[2].left = state.tournament.matches[0].winner;
        state.tournament.matches[2].right = state.tournament.matches[1].winner;
      }
      if (state.tournament.currentMatchIndex === 2) {
        state.tournament.champion = winnerName;
      }
    }

    el.winTitle.textContent = isTournament && state.tournament.currentMatchIndex === 2
      ? `${winnerName} Win the Cup!`
      : `${winnerName} Win!`;
    el.winSubtitle.textContent = `${reason} ended it. ${winnerName} scored ${winningTeam.score} pull power. ${state.game.sourceLabel} fueled this match.`;
    el.tournamentProgress.textContent = isTournament
      ? buildTournamentProgressText()
      : "";
    el.winRounds.textContent = String(totalRounds);
    el.winPull.textContent = `${state.game.ropePosition > 0 ? "+" : ""}${state.game.ropePosition}`;
    el.winStreak.textContent = String(bestStreak);
    el.winAccuracy.textContent = `${accuracy}%`;
    el.continueTournamentButton.classList.toggle("visible", isTournament && state.tournament.currentMatchIndex < 2);

    showOverlay(el.winOverlay, true);
    audio.victory();
  }

  function determinePointsWinner() {
    if (state.game.left.score > state.game.right.score) {
      return "left";
    }
    if (state.game.right.score > state.game.left.score) {
      return "right";
    }
    if (state.game.ropePosition > 0) {
      return "left";
    }
    if (state.game.ropePosition < 0) {
      return "right";
    }
    if (state.game.left.correct > state.game.right.correct) {
      return "left";
    }
    if (state.game.right.correct > state.game.left.correct) {
      return "right";
    }
    return Math.random() < 0.5 ? "left" : "right";
  }

  function abandonGameToTitle() {
    clearTimers();
    state.tournament = null;
    resetGameState();
    showScreen("title");
  }

  function clearTimers() {
    clearInterval(state.game.roundTimerId);
    clearTimeout(state.game.roundTimeoutId);
    clearTimeout(state.game.resultTimeoutId);
    clearTimeout(state.game.revealTimeoutId);
    if (state.game.cpuPending && state.game.cpuPending.timeoutId) {
      clearTimeout(state.game.cpuPending.timeoutId);
    }
    state.game.roundTimerId = null;
    state.game.roundTimeoutId = null;
    state.game.resultTimeoutId = null;
    state.game.revealTimeoutId = null;
    state.game.cpuPending = null;
  }

  async function prepareTournamentMatch() {
    if (!state.tournament || !state.tournament.active) {
      state.tournament = createTournamentState(state.selections.setup.tournament);
    }

    if (!state.tournament.questionPool.length) {
      try {
        const loaded = await loadQuestionBatch(state.selections.category, 36);
        state.tournament.questionPool = loaded.questions;
        state.tournament.sourceLabel = loaded.usedFallbackBank
          ? (loaded.usedCachedQuestions ? "Cached + Backup Tournament Pool" : "Backup Tournament Pool")
          : loaded.usedCachedQuestions
            ? "Live + Cached Tournament Pool"
            : "Fresh Tournament Pool";
        if (loaded.notice) {
          showToast(loaded.notice);
        }
      } catch (error) {
        state.tournament.questionPool = buildQuestionsFromBank(state.selections.category, 36);
        state.tournament.sourceLabel = "Backup Tournament Pool";
        showToast("Tournament built from the local backup question bank.");
      }
    }

    const currentMatch = state.tournament.matches[state.tournament.currentMatchIndex];
    state.game.ropeGoal = state.options.ropeLength === "showdown" ? 15 : 12;
    state.game.questionCount = 12;
    state.game.teamNames = {
      left: currentMatch.left || "Semifinalist A",
      right: currentMatch.right || "Semifinalist B"
    };
    state.game.stageLabel = currentMatch.stage;
    state.game.sourceLabel = state.tournament.sourceLabel;
    state.game.questions = takeTournamentQuestions(state.game.questionCount);
    recordRecentPrompts(state.game.questions);
  }

  function takeTournamentQuestions(amount) {
    const used = new Set();
    const chosen = [];

    for (const question of state.tournament.questionPool) {
      if (chosen.length >= amount) {
        break;
      }
      if (used.has(question.prompt)) {
        continue;
      }
      chosen.push(question);
      used.add(question.prompt);
    }

    state.tournament.questionPool = state.tournament.questionPool.filter((question) => !used.has(question.prompt));

    if (chosen.length < amount) {
      chosen.push(...buildQuestionsFromBank(state.selections.category, amount - chosen.length, chosen));
      state.game.usedFallbackBank = true;
      state.game.sourceLabel = "Tournament Pool + Backup";
    }

    return chosen.slice(0, amount);
  }

  async function continueTournament() {
    if (!state.tournament || !state.tournament.active) {
      return;
    }
    state.tournament.currentMatchIndex += 1;
    showTournamentBracketScreen(false);
  }

  function showTournamentBracketScreen(resetTournament) {
    if (resetTournament || !state.tournament || !state.tournament.active) {
      state.tournament = createTournamentState(state.selections.setup.tournament);
    }
    renderTournamentBracket();
    showScreen("bracket");
  }

  function renderTournamentBracket() {
    if (!state.tournament || !state.tournament.active) {
      return;
    }

    const matches = state.tournament.matches;
    const currentMatch = matches[state.tournament.currentMatchIndex];
    el.bracketSlots.sf1Left.textContent = matches[0].left;
    el.bracketSlots.sf1Right.textContent = matches[0].right;
    el.bracketSlots.sf2Left.textContent = matches[1].left;
    el.bracketSlots.sf2Right.textContent = matches[1].right;
    el.bracketSlots.finalLeft.textContent = matches[2].left || "Winner SF1";
    el.bracketSlots.finalRight.textContent = matches[2].right || "Winner SF2";
    el.bracketChampion.textContent = state.tournament.champion || "Champion Pending";

    el.bracketMatchCards.forEach((card, index) => {
      const match = matches[index];
      const complete = Boolean(match.winner);
      const isCurrent = state.tournament.currentMatchIndex === index && !complete;
      card.classList.toggle("complete", complete);
      card.classList.toggle("current", isCurrent);

      Array.from(card.querySelectorAll(".bracket-team-slot")).forEach((slot) => {
        slot.classList.remove("winner");
        if (complete && slot.textContent === match.winner) {
          slot.classList.add("winner");
        }
      });
    });

    el.bracketSubtitle.textContent = currentMatch.winner
      ? `${currentMatch.stage} is complete. Review the bracket before the next showdown.`
      : `${currentMatch.stage} is ready. ${currentMatch.left} versus ${currentMatch.right}.`;
    el.bracketCurrentMatch.textContent = currentMatch.winner
      ? `${currentMatch.winner} advanced. ${state.tournament.currentMatchIndex < 2 ? matches[state.tournament.currentMatchIndex + 1].stage : "Champion crowned."}`
      : `${currentMatch.stage}: ${currentMatch.left} versus ${currentMatch.right}.`;
    el.bracketRuleset.textContent = `${CATEGORY_LABELS[state.selections.category]} | ${state.options.ropeLength === "showdown" ? "Showdown rope" : "Standard rope"} | ${state.options.timer === "rapid" ? "Rapid timer" : "Standard timer"}.`;
    el.bracketFieldSummary.textContent = `${matches[0].left}, ${matches[0].right}, ${matches[1].left}, and ${matches[1].right} are in the field.`;
    el.startBracketButton.textContent = state.tournament.currentMatchIndex === 2
      ? "Play Championship"
      : `Play ${currentMatch.stage}`;
  }

  function hydrateMatchQuestionsFromLoad(loaded, amount) {
    state.game.questions = loaded.questions;
    state.game.usedFallbackBank = loaded.usedFallbackBank;
    state.game.usedCachedQuestions = loaded.usedCachedQuestions;
    state.game.fallbackToRandomCategory = loaded.fallbackToRandomCategory;
    state.game.subtleNotice = loaded.notice;
    state.game.sourceLabel = loaded.usedFallbackBank
      ? (loaded.usedCachedQuestions ? "Live + Cache + Backup" : "Backup Bank")
      : loaded.usedCachedQuestions
        ? "Live + Cached Questions"
        : "Fresh API Batch";

    if (!state.game.questions.length) {
      throw new Error("No usable trivia questions loaded.");
    }

    recordRecentPrompts(state.game.questions);

    if (loaded.notice) {
      showToast(loaded.notice);
    } else if (loaded.usedFallbackBank) {
      showToast("Using the local backup question bank for this match.");
    } else if (loaded.usedCachedQuestions) {
      showToast("Mixed in cached trivia to avoid repeats.");
    }
  }

  function hydrateMatchQuestionsFromFallback(category, amount) {
    state.game.questions = buildQuestionsFromBank(category, amount);
    state.game.usedFallbackBank = true;
    state.game.sourceLabel = "Backup Bank";
    recordRecentPrompts(state.game.questions);
    showToast("Trivia API unavailable. Switched to the local backup bank.");
  }

  function chooseCpuPersona(difficulty) {
    const enabledIds = Object.keys(state.options.cpuArchetypes).filter((id) => state.options.cpuArchetypes[id]);
    const weightedPool = (CPU_ARCHETYPE_POOLS[difficulty] || CPU_ARCHETYPES.map((archetype) => archetype.id))
      .filter((id) => enabledIds.includes(id));
    const availableIds = weightedPool.length
      ? weightedPool
      : enabledIds.length
        ? enabledIds
        : Object.keys(DEFAULT_CPU_ARCHETYPE_OPTIONS);
    const id = availableIds[randomInt(0, availableIds.length - 1)];
    return CPU_ARCHETYPES.find((persona) => persona.id === id) || CPU_ARCHETYPES[0];
  }

  function chooseRoundModifier() {
    const enabledIds = Object.keys(state.options.modifiers).filter((id) => state.options.modifiers[id]);
    if (!enabledIds.length || state.game.currentIndex < 1) {
      return null;
    }
    const shouldTrigger = Math.random() < 0.42 || (state.game.currentIndex + 1) % 4 === 0;
    if (!shouldTrigger) {
      return null;
    }
    const modifierId = enabledIds[randomInt(0, enabledIds.length - 1)];
    return { id: modifierId, ...MATCH_MODIFIERS[modifierId] };
  }

  function getRoundDurationForModifier(modifier) {
    if (modifier && modifier.id === "lightningRound") {
      return Math.max(4600, Math.round(state.game.timerDurationMs * 0.66));
    }
    return state.game.timerDurationMs;
  }

  function applyModifierToMovement(rawMovement) {
    let movement = rawMovement;
    if (state.game.currentModifier && state.game.currentModifier.id === "doublePull") {
      movement *= 2;
    }
    return clamp(movement, -4, 4);
  }

  function buildRoundAnnouncement() {
    const roundNumber = state.game.currentIndex + 1;
    const modifierLine = state.game.currentModifier
      ? `${state.game.currentModifier.label}: ${state.game.currentModifier.summary}`
      : "Classic pull rules. Fast hands and smart locks.";
    if (state.game.mode === "tournament") {
      return `${state.game.stageLabel}, round ${roundNumber}. ${modifierLine}`;
    }
    if (state.game.mode === "cpu" && state.game.cpuPersona) {
      return `${state.game.cpuPersona.name} is in the booth. ${modifierLine}`;
    }
    return `Round ${roundNumber}. ${modifierLine}`;
  }

  function buildResolutionAnnouncement(side, magnitude) {
    const bigSwing = magnitude >= 3 ? "Huge swing!" : "Solid hit!";
    return `${bigSwing} ${teamLabel(side)} yank the marker toward their side.`;
  }

  function setAnnouncerText(text) {
    el.announcerText.textContent = text;
  }

  function getQuestionRevealProfile() {
    return QUESTION_REVEAL_OPTIONS[state.options.questionReveal] || QUESTION_REVEAL_OPTIONS.average;
  }

  function tokenizePromptForReveal(prompt) {
    return String(prompt || "").trim().split(/\s+/).filter(Boolean);
  }

  function getRevealStepMs(wordCount, profile) {
    if (!profile || profile.msPerWord <= 0 || wordCount < 2) {
      return 0;
    }
    const totalMs = clamp(wordCount * profile.msPerWord, profile.minMs, profile.maxMs);
    return Math.round(totalMs / Math.max(wordCount - 1, 1));
  }

  function buildTournamentProgressText() {
    if (!state.tournament || !state.tournament.active) {
      return "";
    }
    if (state.tournament.currentMatchIndex === 2) {
      return `Champion crowned: ${state.tournament.champion}`;
    }
    return `${state.tournament.matches[0].winner || "Semifinal 1"} | ${state.tournament.matches[1].winner || "Semifinal 2"} | Championship next`;
  }

  async function loadQuestionBatch(category, amount) {
    return fetchTriviaQuestions(category, amount);
  }

  async function fetchTriviaQuestions(category, amount) {
    const questions = [];
    const recentPrompts = loadRecentPrompts();
    const cachedQuestions = loadTriviaCache(category);
    let notice = "";
    let fallbackToRandomCategory = false;
    let usedCachedQuestions = false;
    let token = await getSessionToken();
    let data = await requestBatch(token, category, amount);

    if (data.response_code === 3 || data.response_code === 4) {
      token = await getSessionToken(true);
      data = await requestBatch(token, category, amount);
    }

    if ((data.response_code === 1 || data.results.length < Math.min(10, amount)) && category !== "random") {
      data = await requestBatch(token, "random", amount);
      fallbackToRandomCategory = true;
      notice = "Category pool ran low. Match switched to Random Mix.";
    }

    if (data.response_code === 3 || data.response_code === 4) {
      token = await getSessionToken(true);
      data = await requestBatch(token, "random", amount);
    }

    if (data.response_code !== 0 && data.response_code !== 1) {
      throw new Error(`Trivia API error: ${data.response_code}`);
    }

    if (Array.isArray(data.results) && data.results.length) {
      const freshQuestions = normalizeApiQuestions(data.results);
      questions.push(...filterQuestionsAgainstHistory(freshQuestions, recentPrompts));
      saveTriviaCache(category, freshQuestions);
    }

    if (questions.length < amount && cachedQuestions.length) {
      const filteredCache = filterQuestionsAgainstHistory(cachedQuestions, recentPrompts, questions);
      if (filteredCache.length) {
        usedCachedQuestions = true;
        questions.push(...filteredCache);
      }
    }

    let usedFallbackBank = false;
    if (questions.length < amount) {
      usedFallbackBank = true;
      questions.push(...buildQuestionsFromBank(fallbackToRandomCategory ? "random" : category, amount - questions.length, questions, recentPrompts));
      if (!notice) {
        notice = usedCachedQuestions
          ? "API batch ran short. Cached and backup questions filled the rest of the match."
          : "API batch was partial. Backup questions filled the rest of the match.";
      }
    }

    return {
      questions: questions.slice(0, amount),
      usedFallbackBank,
      usedCachedQuestions,
      fallbackToRandomCategory,
      notice
    };
  }

  async function requestBatch(token, category, amount) {
    const params = new URLSearchParams({
      amount: String(amount),
      type: "multiple"
    });

    if (category !== "random" && CATEGORY_IDS[category]) {
      params.set("category", String(CATEGORY_IDS[category]));
    }
    if (token) {
      params.set("token", token);
    }

    const data = await fetchJsonWithSpacing(`https://opentdb.com/api.php?${params.toString()}`);
    return {
      response_code: Number(data.response_code || 0),
      results: Array.isArray(data.results) ? data.results : []
    };
  }

  async function getSessionToken(forceReset = false) {
    if (!forceReset && state.api.token) {
      return state.api.token;
    }

    const action = forceReset && state.api.token ? `reset&token=${encodeURIComponent(state.api.token)}` : "request";
    const data = await fetchJsonWithSpacing(`https://opentdb.com/api_token.php?command=${action}`);

    if (!data.token) {
      throw new Error("Could not acquire trivia session token.");
    }

    state.api.token = data.token;
    localStorage.setItem(STORAGE_KEYS.token, data.token);
    return data.token;
  }

  async function fetchJsonWithSpacing(url) {
    const elapsed = Date.now() - state.api.lastRequestAt;
    if (elapsed < 900) {
      await sleep(900 - elapsed);
    }
    state.api.lastRequestAt = Date.now();

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }
    return response.json();
  }

  function normalizeApiQuestions(items) {
    return items
      .map((item) => {
        const prompt = decodeHtmlEntities(item.question);
        const correct = decodeHtmlEntities(item.correct_answer);
        const incorrect = item.incorrect_answers.map((answer) => decodeHtmlEntities(answer));
        return makeQuestion(prompt, correct, incorrect, mapApiCategory(item.category));
      })
      .filter(Boolean);
  }

  function makeQuestion(prompt, correct, incorrect, category) {
    if (!prompt || !correct || !Array.isArray(incorrect) || incorrect.length < 3) {
      return null;
    }

    const answers = shuffle([correct, ...incorrect]).slice(0, 4);
    return {
      prompt,
      answers,
      correctIndex: answers.indexOf(correct),
      correctAnswer: correct,
      category
    };
  }

  function buildQuestionsFromBank(category, amount, existing = [], recentPrompts = []) {
    const seenPrompts = new Set([...recentPrompts, ...existing.map((question) => question.prompt)]);
    const pool = LOCAL_QUESTION_BANK.filter((item) => category === "random" || item.category === category);
    const fallbackPool = pool.length ? [...pool] : [...LOCAL_QUESTION_BANK];
    const shuffled = shuffle(fallbackPool);
    const built = [];

    for (const item of shuffled) {
      if (built.length >= amount) {
        break;
      }
      if (seenPrompts.has(item.question)) {
        continue;
      }
      const question = makeQuestion(item.question, item.correct, item.incorrect, item.category);
      if (question) {
        built.push(question);
        seenPrompts.add(item.question);
      }
    }

    while (built.length < amount) {
      const item = shuffled[built.length % shuffled.length];
      const variant = makeQuestion(item.question, item.correct, item.incorrect, item.category);
      if (variant) {
        built.push(variant);
      }
    }

    return built;
  }

  function loadTriviaCache(category) {
    try {
      const cache = JSON.parse(localStorage.getItem(STORAGE_KEYS.triviaCache) || "{}");
      const entry = cache[category] || cache.random;
      if (!entry || !Array.isArray(entry.questions)) {
        return [];
      }
      const isFresh = Date.now() - entry.savedAt < 1000 * 60 * 60 * 48;
      return isFresh ? entry.questions : [];
    } catch (error) {
      return [];
    }
  }

  function saveTriviaCache(category, questions) {
    try {
      const cache = JSON.parse(localStorage.getItem(STORAGE_KEYS.triviaCache) || "{}");
      cache[category] = {
        savedAt: Date.now(),
        questions: questions.slice(0, 48)
      };
      localStorage.setItem(STORAGE_KEYS.triviaCache, JSON.stringify(cache));
    } catch (error) {
      // Ignore cache write failures.
    }
  }

  function loadRecentPrompts() {
    try {
      const prompts = JSON.parse(localStorage.getItem(STORAGE_KEYS.recentPrompts) || "[]");
      return Array.isArray(prompts) ? prompts : [];
    } catch (error) {
      return [];
    }
  }

  function recordRecentPrompts(questions) {
    const recent = loadRecentPrompts();
    const combined = [...questions.map((question) => question.prompt), ...recent];
    const deduped = [];
    const seen = new Set();
    for (const prompt of combined) {
      if (!prompt || seen.has(prompt)) {
        continue;
      }
      deduped.push(prompt);
      seen.add(prompt);
      if (deduped.length >= 120) {
        break;
      }
    }
    localStorage.setItem(STORAGE_KEYS.recentPrompts, JSON.stringify(deduped));
  }

  function filterQuestionsAgainstHistory(questions, recentPrompts = [], existing = []) {
    const blocked = new Set([...recentPrompts, ...existing.map((question) => question.prompt)]);
    const unique = [];
    for (const question of questions) {
      if (!question || blocked.has(question.prompt)) {
        continue;
      }
      unique.push(question);
      blocked.add(question.prompt);
    }
    return unique;
  }

  function decodeHtmlEntities(value) {
    const textarea = document.createElement("textarea");
    textarea.innerHTML = value;
    return textarea.value;
  }

  function mapApiCategory(apiCategory) {
    const label = String(apiCategory || "").toLowerCase();
    if (label.includes("science")) {
      return "science";
    }
    if (label.includes("history")) {
      return "history";
    }
    if (label.includes("sport")) {
      return "sports";
    }
    if (label.includes("film") || label.includes("music") || label.includes("television") || label.includes("video game")) {
      return "entertainment";
    }
    if (label.includes("general")) {
      return "general";
    }
    return "random";
  }

  function showOverlay(node, visible) {
    node.classList.toggle("hidden", !visible);
  }

  function closeOverlays() {
    showOverlay(el.loadingOverlay, false);
    showOverlay(el.pauseOverlay, false);
    showOverlay(el.winOverlay, false);
  }

  function showToast(message) {
    if (!message) {
      return;
    }
    el.toast.textContent = message;
    el.toast.classList.add("show");
    clearTimeout(state.ui.toastTimer);
    state.ui.toastTimer = window.setTimeout(() => {
      el.toast.classList.remove("show");
    }, 3200);
  }

  function spawnParticles(direction, magnitude) {
    const count = 8 + magnitude * 2;
    const colors = direction === "left"
      ? ["#2cd9ff", "#ffd75c", "#ffffff"]
      : direction === "right"
        ? ["#ff658e", "#ffd75c", "#ffffff"]
        : ["#ffd75c", "#ffffff", "#9cb7ff"];

    for (let index = 0; index < count; index += 1) {
      const particle = document.createElement("span");
      particle.className = "particle";
      particle.style.setProperty("--particle-x", `${randomInt(-70, 70)}px`);
      particle.style.setProperty("--particle-y", `${randomInt(-48, 48)}px`);
      particle.style.setProperty("--particle-color", colors[index % colors.length]);
      particle.style.animationDelay = `${index * 12}ms`;
      el.particleLayer.appendChild(particle);
      window.setTimeout(() => particle.remove(), 760);
    }
  }

  function teamLabel(side) {
    return state.game.teamNames && state.game.teamNames[side]
      ? state.game.teamNames[side]
      : side === "left"
        ? "Left"
        : "Right";
  }

  function shuffle(items) {
    const array = [...items];
    for (let index = array.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [array[index], array[swapIndex]] = [array[swapIndex], array[index]];
    }
    return array;
  }

  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function normalizeName(value, fallback) {
    const trimmed = String(value || "").replace(/\s+/g, " ").trim().slice(0, 18);
    return trimmed || fallback;
  }

  function frequencyFromSemitones(root, semitones) {
    return root * Math.pow(2, semitones / 12);
  }

  function sleep(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }
})();
