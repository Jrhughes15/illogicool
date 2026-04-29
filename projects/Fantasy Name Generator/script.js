const SPECIES = [
  {
    id: "human",
    label: "Human",
    file: "human_full_naming_dataset.json",
    style: "Regional, adaptable, and dynasty-friendly",
    tone: "Versatile, grounded, heroic",
    description: "Humans are ambitious, adaptable folk whose names often echo homeland, family, and reputation.",
    traits: ["Broad phonetics", "Family-word surnames", "Balanced titles"]
  },
  {
    id: "elf",
    label: "Elf",
    file: "elf_full_naming_dataset.json",
    style: "Flowing vowel-led names with graceful endings",
    tone: "Elegant, ancient, lyrical",
    description: "Elves are long-lived and otherworldly, favoring graceful names shaped by memory, nature, and old magic.",
    traits: ["Flowing vowels", "Soft consonants", "Poetic places"]
  },
  {
    id: "dwarf",
    label: "Dwarf",
    file: "dwarf_full_naming_dataset.json",
    style: "Clan names, hard roots, craft and oath compounds",
    tone: "Stout, ancestral, martial",
    description: "Dwarves are proud stonefolk whose names carry clan, craft, oath, and ancestral weight.",
    traits: ["Clan markers", "Breaker and Slayer epithets", "Stone-and-forge compounds"]
  },
  {
    id: "halfling",
    label: "Halfling",
    file: "halfling_full_naming_dataset.json",
    style: "Warm rural names with nicknames and family compounds",
    tone: "Bright, pastoral, nimble",
    description: "Halflings are warm-hearted wanderers and hearth-keepers with names rooted in home, field, and kin.",
    traits: ["Field and brook names", "Friendly suffixes", "Nickname traditions"]
  },
  {
    id: "dragonborn",
    label: "Dragonborn",
    file: "dragonborn_full_naming_dataset.json",
    style: "Draconic syllables joined to clan and power words",
    tone: "Proud, elemental, commanding",
    description: "Dragonborn are honor-bound scions of draconic bloodlines, bearing names that sound fierce and ceremonial.",
    traits: ["Clan identity", "Scale and flame compounds", "Imperial titles"]
  },
  {
    id: "gnome",
    label: "Gnome",
    file: "gnome_full_naming_dataset.json",
    style: "Quick syllables, gear-words, sparks, cogs, and nicknames",
    tone: "Clever, arcane, inventive",
    description: "Gnomes are curious tinkerers and illusionists whose names sparkle with invention, wit, and odd tradition.",
    traits: ["Gear-word compounds", "Bouncy endings", "Playful nicknames"]
  },
  {
    id: "half-elf",
    label: "Half-Elf",
    file: "half_elf_full_naming_dataset.json",
    style: "Human structure softened by elven cadence",
    tone: "Graceful, liminal, refined",
    description: "Half-elves bridge mortal urgency and elven grace, with names that often blend two worlds.",
    traits: ["Hybrid roots", "Elf-word surnames", "Vowel-rich cadence"]
  },
  {
    id: "half-orc",
    label: "Half-Orc",
    file: "half_orc_full_naming_dataset.json",
    style: "Short brutal names and violent compound epithets",
    tone: "Brutal, direct, battle-scarred",
    description: "Half-orcs carry fierce, hard-edged names shaped by survival, strength, scars, and chosen honor.",
    traits: ["Brutal compounds", "Weapon and rage words", "Hard consonant clusters"]
  },
  {
    id: "tiefling",
    label: "Tiefling",
    file: "tiefling_full_naming_dataset.json",
    style: "Infernal, virtue-based, and pact-bound names",
    tone: "Arcane, defiant, ominous",
    description: "Tieflings are marked by infernal legacy and personal defiance, often taking names of omen or virtue.",
    traits: ["Virtue names", "Infernal imagery", "Pact and hell-place titles"]
  }
];

const DICE = [
  { id: "structure", label: "Structure", key: "structures" },
  { id: "consonant", label: "Consonant", key: "consonants" },
  { id: "vowel", label: "Vowel", key: "vowels" },
  { id: "end", label: "End", key: "ends" },
  { id: "word", label: "Word", key: "words" },
  { id: "link", label: "Link", key: "links" },
  { id: "title", label: "Title", key: "titles" },
  { id: "place", label: "Place", key: "places" }
];

const PRESET_SURNAMES = {
  "human-harry": "Potter",
  "human-albus": "Dumbledore",
  "human-hermione": "Granger",
  "elf-legolas": "Greenleaf",
  "elf-elrond": "Peredhel",
  "elf-galadriel": "",
  "dwarf-gimli": "Gloinson",
  "dwarf-thorin": "Oakenshield",
  "dwarf-bruenor": "Battlehammer",
  "halfling-frodo": "Baggins",
  "halfling-bilbo": "Baggins",
  "halfling-samwise": "Gamgee",
  "dragonborn-arkhan": "the Cruel",
  "dragonborn-tiberius": "Stormwind",
  "dragonborn-balasar": "",
  "gnome-scanlan": "Shorthalt",
  "gnome-pike": "Trickfoot",
  "gnome-jan": "Jansen",
  "half-elf-tanis": "Half-Elven",
  "half-elf-keyleth": "Air Ashari",
  "half-elf-vex": "De Rolo",
  "half-orc-fjord": "Stone",
  "half-orc-garona": "Halforcen",
  "half-orc-thokk": "",
  "tiefling-karlach": "Cliffgate",
  "tiefling-jester": "Lavorre",
  "tiefling-mollymauk": "Tealeaf"
};

const FAMOUS_RECIPES = [
  makePreset("human-harry", "human", "Harry", "CVCV", 12, { consonants: ["h", "rr"], vowels: ["a", "y"] }),
  makePreset("human-albus", "human", "Albus", "VCCV+End", 23, { consonants: ["l", "b"], vowels: ["a", "u"], ends: ["s"] }),
  makePreset("human-hermione", "human", "Hermione", "CVCVCV+End", 34, { consonants: ["h", "rm", "n"], vowels: ["e", "i", "o"], ends: ["e"] }),
  makePreset("elf-legolas", "elf", "Legolas", "CVCVCV+End", 14, { consonants: ["l", "g", "l"], vowels: ["e", "o", "a"], ends: ["s"] }),
  makePreset("elf-elrond", "elf", "Elrond", "VCCV+End", 25, { consonants: ["l", "r"], vowels: ["e", "o"], ends: ["nd"] }),
  makePreset("elf-galadriel", "elf", "Galadriel", "CVCVCCV+End", 36, { consonants: ["g", "l", "d", "r"], vowels: ["a", "a", "i"], ends: ["el"] }),
  makePreset("dwarf-gimli", "dwarf", "Gimli", "CVCCV", 16, { consonants: ["g", "m", "l"], vowels: ["i", "i"] }),
  makePreset("dwarf-thorin", "dwarf", "Thorin", "CVCV+End", 27, { consonants: ["th", "r"], vowels: ["o", "i"], ends: ["n"] }),
  makePreset("dwarf-bruenor", "dwarf", "Bruenor", "CCVCVV+End", 38, { consonants: ["b", "r", "n"], vowels: ["u", "e", "o"], ends: ["r"] }),
  makePreset("halfling-frodo", "halfling", "Frodo", "CCVCV", 18, { consonants: ["f", "r", "d"], vowels: ["o", "o"] }),
  makePreset("halfling-bilbo", "halfling", "Bilbo", "CVCCV", 29, { consonants: ["b", "l", "b"], vowels: ["i", "o"] }),
  makePreset("halfling-samwise", "halfling", "Samwise", "CVCVCV+End", 40, { consonants: ["s", "m", "w"], vowels: ["a", "i", "e"], ends: ["s"] }),
  makePreset("dragonborn-arkhan", "dragonborn", "Arkhan", "VCCV+End", 20, { consonants: ["r", "kh"], vowels: ["a", "a"], ends: ["n"] }),
  makePreset("dragonborn-tiberius", "dragonborn", "Tiberius", "CVCVCVV+End", 31, { consonants: ["t", "b", "r"], vowels: ["i", "e", "i", "u"], ends: ["s"] }),
  makePreset("dragonborn-balasar", "dragonborn", "Balasar", "CVCVCV+End", 42, { consonants: ["b", "l", "s"], vowels: ["a", "a", "a"], ends: ["r"] }),
  makePreset("gnome-scanlan", "gnome", "Scanlan", "CCVCCV+End", 22, { consonants: ["s", "c", "n", "l"], vowels: ["a", "a"], ends: ["n"] }),
  makePreset("gnome-pike", "gnome", "Pike", "CVCV", 33, { consonants: ["p", "k"], vowels: ["i", "e"] }),
  makePreset("gnome-jan", "gnome", "Jan", "CV+End", 44, { consonants: ["j"], vowels: ["a"], ends: ["n"] }),
  makePreset("half-elf-tanis", "half-elf", "Tanis", "CVC+End", 24, { consonants: ["t", "n"], vowels: ["a"], ends: ["is"] }),
  makePreset("half-elf-keyleth", "half-elf", "Keyleth", "CVC+End", 35, { consonants: ["k", "yl"], vowels: ["e"], ends: ["eth"] }),
  makePreset("half-elf-vex", "half-elf", "Vexahlia", "CVCVCCV", 46, { consonants: ["v", "x", "hl"], vowels: ["e", "a", "ia"] }),
  makePreset("half-orc-fjord", "half-orc", "Fjord", "CCV+End", 26, { consonants: ["f", "j"], vowels: ["o"], ends: ["rd"] }),
  makePreset("half-orc-garona", "half-orc", "Garona", "CVCVCV", 37, { consonants: ["g", "r", "n"], vowels: ["a", "o", "a"] }),
  makePreset("half-orc-thokk", "half-orc", "Thokk", "CV+End", 48, { consonants: ["th"], vowels: ["o"], ends: ["kk"] }),
  makePreset("tiefling-karlach", "tiefling", "Karlach", "CVCCV+End", 28, { consonants: ["k", "r", "l"], vowels: ["a", "a"], ends: ["ch"] }),
  makePreset("tiefling-jester", "tiefling", "Jester", "CVCC+End", 39, { consonants: ["j", "s", "t"], vowels: ["e"], ends: ["er"] }),
  makePreset("tiefling-mollymauk", "tiefling", "Mollymauk", "CVCCVC+End", 50, { consonants: ["m", "l", "l", "m"], vowels: ["o", "y"], ends: ["auk"] })
];

const DIE_BY_KEY = Object.fromEntries(DICE.map((die) => [die.key, die.id]));
const CONNECTORS = new Set(["of", "the", "from"]);
const NAME_TOKEN_TO_SPECIES = {
  DwarfName: "dwarf",
  ElfName: "elf",
  GnomeName: "gnome",
  HalfElfName: "half-elf",
  HalfName: "halfling",
  OrcName: "half-orc",
  TieflingName: "tiefling",
  DragonName: "dragonborn"
};

const TOKEN_ALIASES = {
  Virtue: "words",
  InfernalWord: "words",
  ElfWord: "words",
  GearWord: "words",
  WeaponWord: "words",
  RageWord: "words",
  BloodWord: "words",
  Clan: "words",
  Nickname: "words",
  TitleWord: "titles"
};

const FILTER_LIMITS = {
  any: () => true,
  short: (name) => name.replace(/[^A-Za-z]/g, "").length <= 16,
  long: (name) => name.replace(/[^A-Za-z]/g, "").length >= 22,
  soft: (name) => /[aeilnrs]/i.test(name) && !/[kgx]{2,}|kr|gr|sk/i.test(name),
  harsh: (name) => /k|g|x|z|th|kr|gr|sk/i.test(name)
};

const SURNAME_STRUCTURES = {
  human: ["Word", "Word+End", "Word+Word", "CVC+End", "CVC+CVC", "Word+Link+Word"],
  elf: ["Word+End", "CVCV+End", "CV+CVC+End", "Word+Word", "CVC+Word", "Word+Link+Word"],
  dwarf: ["Word+Word", "Word+Clan", "Clan+Word", "CVC+SON", "CVC+SSON", "Word+Link+Word"],
  halfling: ["Word+Word", "Word+Field", "Word+Foot", "Word+Hill", "Word-Brook", "CVC+End"],
  dragonborn: ["Word+Clan", "Clan+Word", "Word+Scale", "Word+Claw", "Word+Fang", "CVC+End"],
  gnome: ["Word+GearWord", "Word+Spark", "Word+Cog", "Word-Word", "CVC+End", "Word+Link+Word"],
  "half-elf": ["Word+ElfWord", "ElfWord+Word", "Word+Word", "CVC+End", "CV+CVC+End", "Word+Link+Word"],
  "half-orc": ["Word+Word", "Word+WeaponWord", "Word+RageWord", "Word+BloodWord", "CVC+End", "Word+Link+Word"],
  tiefling: ["Virtue+Word", "Word+InfernalWord", "Word+Word", "CVC+End", "Word+of+Place", "Word+Link+Word"]
};

const state = {
  speciesId: "human",
  addTitle: false,
  addLand: false,
  datasets: new Map(),
  rolls: randomRollSet(),
  surnameRolls: randomRollSet(),
  tokenRolls: {},
  locks: Object.fromEntries(DICE.map((die) => [die.id, false])),
  firstLocks: {},
  lastLocks: {},
  surnameLocked: false,
  selectedDie: null,
  history: [],
  favorites: [],
  undoStack: [],
  redoStack: [],
  batchNames: [],
  nameFilter: "any",
  restoring: false,
  speed: 80,
  sound: true,
  voiceURI: "",
  pitch: 1,
  rate: 0.9,
  voices: [],
  activePresetId: "",
  rolling: false,
  currentName: "",
  currentTrace: []
};

const elements = {};
const ICONS = {
  copy: `<svg aria-hidden="true" viewBox="0 0 24 24"><rect x="8" y="8" width="10" height="10" rx="2"></rect><path d="M6 16H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`,
  delete: `<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="M19 6l-1 14H6L5 6"></path><path d="M10 11v5"></path><path d="M14 11v5"></path></svg>`
};
let toastTimer = null;

document.addEventListener("DOMContentLoaded", init);

async function init() {
  cacheElements();
  loadFavorites();
  populateSpeciesSelect();
  renderDice();
  attachEvents();
  await preloadDatasets();
  refinePresetRecipes();
  renderPresetGrid();
  renderSpeciesInfo();
  updateAll();
  addHistory(state.currentName);
  renderFavorites();
  updateUndoRedoButtons();
}

function cacheElements() {
  elements.speciesSelect = document.querySelector("#species-select");
  elements.diceRow = document.querySelector("#dice-row");
  elements.surnameCard = document.querySelector("#surname-roll-card");
  elements.surnameRoll = document.querySelector("#surname-roll");
  elements.surnameValue = document.querySelector("#surname-value");
  elements.surnameDetail = document.querySelector("#surname-detail");
  elements.surnameInput = document.querySelector("#surname-input");
  elements.surnameLock = document.querySelector("#surname-lock");
  elements.lastRollStrip = document.querySelector("#last-roll-strip");
  elements.generatedName = document.querySelector("#generated-name");
  elements.addTitle = document.querySelector("#add-title");
  elements.addLand = document.querySelector("#add-land");
  elements.rollAll = document.querySelector("#roll-all");
  elements.copyName = document.querySelector("#copy-name");
  elements.openPresets = document.querySelector("#open-presets");
  elements.presetModal = document.querySelector("#preset-modal");
  elements.closePresets = document.querySelector("#close-presets");
  elements.presetGrid = document.querySelector("#preset-grid");
  elements.speedSlider = document.querySelector("#speed-slider");
  elements.soundToggle = document.querySelector("#sound-toggle");
  elements.nameFilter = document.querySelector("#name-filter");
  elements.batchCount = document.querySelector("#batch-count");
  elements.batchRoll = document.querySelector("#batch-roll");
  elements.favoriteName = document.querySelector("#favorite-name");
  elements.openFavorites = document.querySelector("#open-favorites");
  elements.undoRoll = document.querySelector("#undo-roll");
  elements.redoRoll = document.querySelector("#redo-roll");
  elements.readName = document.querySelector("#read-name");
  elements.previewVoice = document.querySelector("#preview-voice");
  elements.voiceSelect = document.querySelector("#voice-select");
  elements.voicePitch = document.querySelector("#voice-pitch");
  elements.voiceRate = document.querySelector("#voice-rate");
  elements.pitchValue = document.querySelector("#pitch-value");
  elements.rateValue = document.querySelector("#rate-value");
  elements.infoTitle = document.querySelector("#info-title");
  elements.infoDescription = document.querySelector("#info-description");
  elements.infoStyle = document.querySelector("#info-style");
  elements.infoTone = document.querySelector("#info-tone");
  elements.traitList = document.querySelector("#trait-list");
  elements.historyList = document.querySelector("#history-list");
  elements.clearHistory = document.querySelector("#clear-history");
  elements.favoritesList = document.querySelector("#favorites-list");
  elements.clearFavorites = document.querySelector("#clear-favorites");
  elements.favoritesModal = document.querySelector("#favorites-modal");
  elements.closeFavorites = document.querySelector("#close-favorites");
  elements.batchModal = document.querySelector("#batch-modal");
  elements.closeBatch = document.querySelector("#close-batch");
  elements.copyBatch = document.querySelector("#copy-batch");
  elements.batchList = document.querySelector("#batch-list");
  elements.toastRegion = document.querySelector("#toast-region");
}

function populateSpeciesSelect() {
  elements.speciesSelect.innerHTML = SPECIES
    .map((species) => `<option value="${species.id}">${species.label}</option>`)
    .join("");
  elements.speciesSelect.value = state.speciesId;
}

function renderPresetGrid() {
  const bySpecies = SPECIES.map((species) => {
    const presets = FAMOUS_RECIPES.filter((preset) => preset.speciesId === species.id);
    return `
      <section class="preset-group" aria-label="${escapeHtml(species.label)} recipes">
        <h3>${escapeHtml(species.label)}</h3>
        ${presets.map((preset) => `
          <button class="preset-card" type="button" data-preset="${escapeHtml(preset.id)}">
            <span>${escapeHtml(preset.displayName)}</span>
            <small>d${preset.rolls.structure} ${escapeHtml(preset.structure)}</small>
          </button>
        `).join("")}
      </section>
    `;
  }).join("");

  elements.presetGrid.innerHTML = bySpecies;
  elements.presetGrid.querySelectorAll(".preset-card").forEach((button) => {
    button.addEventListener("click", () => {
      applyPreset(button.dataset.preset);
      elements.presetModal.close();
    });
  });
}

async function preloadDatasets() {
  const loaded = await Promise.all(
    SPECIES.map(async (species) => {
      try {
        const response = await fetch(species.file, { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`Unable to load ${species.file}`);
        }
        return [species.id, normalizeDataset(await response.json(), species)];
      } catch (error) {
        console.warn(error);
        return [species.id, createFallbackDataset(species)];
      }
    })
  );

  loaded.forEach(([id, dataset]) => state.datasets.set(id, dataset));
}

function normalizeDataset(dataset, species) {
  const normalized = {};
  DICE.forEach((die) => {
    const values = Array.isArray(dataset[die.key]) ? dataset[die.key] : [];
    normalized[die.key] = values.length ? values.map(String) : createFallbackDataset(species)[die.key];
  });
  normalized.links = normalizeLinks(normalized.links);
  return normalized;
}

function normalizeLinks(links) {
  return fillToHundred((links || [])
    .map((link) => {
      const raw = String(link).trim();
      const lower = raw.toLowerCase();
      if (!raw || lower === "(none)" || lower === "none" || lower === "direct join") return "(none)";
      if (["of", "the", "from"].includes(lower)) return "(none)";
      return raw;
    })
    .filter(Boolean));
}

function refinePresetRecipes() {
  FAMOUS_RECIPES.forEach((preset) => {
    if (!preset.surnameName) return;
    const dataset = state.datasets.get(preset.speciesId);
    const recipe = buildSurnameRecipe(preset.surnameName, dataset);
    preset.surnameStructure = recipe.structure;
    preset.surnameValues = recipe.values;
    preset.surnameRoll = recipe.structure ? recipe.rolls.structure : preset.surnameRoll;
    preset.surnameRolls = recipe.structure ? recipe.rolls : preset.surnameRolls;
    preset.surnameTokenRolls = recipe.tokenRolls;
    preset.surnameAudit = recipe.audit;
  });
}

function createFallbackDataset(species) {
  const fallbackWords = {
    human: ["Oak", "Bright", "River", "Shield", "Dawn", "Vale", "Crown", "Storm"],
    elf: ["Moon", "Star", "Willow", "Silver", "Mist", "Bloom", "Lark", "Dusk"],
    dwarf: ["Stone", "Iron", "Forge", "Anvil", "Axe", "Deep", "Gold", "Hammer"],
    halfling: ["Hill", "Brook", "Field", "Apple", "Hearth", "Merry", "Clover", "Foot"],
    dragonborn: ["Flame", "Scale", "Claw", "Wing", "Fang", "Ash", "Storm", "Heart"],
    gnome: ["Cog", "Spark", "Gear", "Tinker", "Copper", "Fizz", "Wick", "Coil"],
    "half-elf": ["Moon", "River", "Dawn", "Silver", "Oak", "Mist", "Vale", "Song"],
    "half-orc": ["Blood", "Rage", "Bone", "Iron", "Fist", "Axe", "Skull", "Thorn"],
    tiefling: ["Hell", "Flame", "Ash", "Virtue", "Sin", "Ember", "Shadow", "Pact"]
  };
  const fallbackNameTokens = {
    elf: "(ElfName)",
    dwarf: "(DwarfName)",
    halfling: "(HalfName)",
    dragonborn: "DragonName",
    gnome: "(GnomeName)",
    "half-elf": "(HalfElfName)",
    "half-orc": "(OrcName)",
    tiefling: "(TieflingName)"
  };
  const fallbackNameToken = fallbackNameTokens[species.id];
  const fallbackStructures = [
    "CVC",
    "CV+End",
    "CVC+End",
    "Word+Word",
    "Word+Link+Word",
    "CVC+Word",
    "CVC+the+TitleWord"
  ];

  if (fallbackNameToken) {
    fallbackStructures.push(`${fallbackNameToken}+the+TitleWord`);
  }

  return {
    structures: fillToHundred(fallbackStructures),
    consonants: fillToHundred(["b", "c", "d", "f", "g", "h", "k", "l", "m", "n", "r", "s", "t", "v", "z", "th", "sh", "dr", "kr", "x"]),
    vowels: fillToHundred(["a", "e", "i", "o", "u", "ae", "ia", "ei", "ou", "y"]),
    ends: fillToHundred(["is", "or", "an", "eth", "ar", "ion", "a", "us", "en", "el"]),
    words: fillToHundred(fallbackWords[species.id] || fallbackWords.human),
    links: fillToHundred(["(none)", "(none)", "a", "en", "an", "ar", "or", "ora", "el", "in"]),
    titles: fillToHundred(["Wanderer", "Keeper", "Blade", "Seer", "Flamecaller", "Oathbound", "the Unbroken", "Storm Herald"]),
    places: fillToHundred(["the Old Road", "the Ashen Gate", "the High Vale", "the Deep Halls", "the Moonlit Wood", "the Broken Crown"])
  };
}

function fillToHundred(values) {
  return Array.from({ length: 100 }, (_, index) => String(values[index % values.length]));
}

function attachEvents() {
  window.addEventListener("resize", () => fitGeneratedName());
  if (document.fonts) {
    document.fonts.ready.then(() => fitGeneratedName());
  }

  elements.speciesSelect.addEventListener("change", () => {
    pushUndoState();
    state.speciesId = elements.speciesSelect.value;
    state.activePresetId = "";
    state.selectedDie = null;
    state.addTitle = false;
    state.addLand = false;
    state.surnameRolls = randomRollSet();
    state.tokenRolls = {};
    state.firstLocks = {};
    state.lastLocks = {};
    state.surnameLocked = false;
    DICE.forEach((die) => {
      state.rolls[die.id] = randomD100();
      state.locks[die.id] = false;
    });
    renderSpeciesInfo();
    updateAll();
    addHistory(state.currentName);
  });

  elements.addTitle.addEventListener("click", () => {
    pushUndoState();
    state.addTitle = !state.addTitle;
    updateAll();
    addHistory(state.currentName);
  });
  elements.addLand.addEventListener("click", () => {
    pushUndoState();
    state.addLand = !state.addLand;
    updateAll();
    addHistory(state.currentName);
  });
  elements.surnameRoll.addEventListener("click", () => {
    clearActivePreset();
    rollSurnameStructure();
  });
  elements.surnameInput.addEventListener("input", () => {
    const value = Number(elements.surnameInput.value);
    if (!Number.isInteger(value) || value < 1 || value > 100) return;
    setSurnameRoll(value, false);
  });
  elements.surnameInput.addEventListener("change", () => {
    const value = clampRoll(elements.surnameInput.value);
    elements.surnameInput.value = value;
    setSurnameRoll(value, true);
  });
  elements.surnameLock.addEventListener("click", () => {
    pushUndoState();
    state.surnameLocked = !state.surnameLocked;
    renderSurnameState();
  });

  elements.rollAll.addEventListener("click", () => {
    pushUndoState();
    rollAllNow(true);
  });
  elements.copyName.addEventListener("click", copyCurrentName);
  elements.nameFilter.addEventListener("change", () => {
    pushUndoState();
    state.nameFilter = elements.nameFilter.value;
    rollAllNow(false);
  });
  elements.batchRoll.addEventListener("click", openBatchRoll);
  elements.favoriteName.addEventListener("click", toggleCurrentFavorite);
  elements.openFavorites.addEventListener("click", () => {
    if (state.favorites.length) elements.favoritesModal.showModal();
  });
  elements.undoRoll.addEventListener("click", undoRollState);
  elements.redoRoll.addEventListener("click", redoRollState);
  elements.openPresets.addEventListener("click", () => {
    elements.presetModal.showModal();
  });
  elements.closePresets.addEventListener("click", () => {
    elements.presetModal.close();
  });
  elements.presetModal.addEventListener("click", (event) => {
    if (event.target === elements.presetModal) {
      elements.presetModal.close();
    }
  });
  elements.speedSlider.addEventListener("input", () => {
    state.speed = Number(elements.speedSlider.value);
  });
  elements.soundToggle.addEventListener("change", () => {
    state.sound = elements.soundToggle.checked;
  });
  elements.readName.addEventListener("click", readCurrentName);
  elements.previewVoice.addEventListener("click", previewVoice);
  elements.voiceSelect.addEventListener("change", () => {
    state.voiceURI = elements.voiceSelect.value;
  });
  elements.voicePitch.addEventListener("input", () => {
    state.pitch = Number(elements.voicePitch.value);
    elements.pitchValue.textContent = state.pitch.toFixed(1);
  });
  elements.voiceRate.addEventListener("input", () => {
    state.rate = Number(elements.voiceRate.value);
    elements.rateValue.textContent = state.rate.toFixed(1);
  });
  if ("speechSynthesis" in window) {
    window.speechSynthesis.addEventListener("voiceschanged", populateVoices);
    populateVoices();
  } else {
    elements.readName.disabled = true;
    elements.previewVoice.disabled = true;
    elements.voiceSelect.innerHTML = `<option>Speech unavailable</option>`;
  }
  elements.clearHistory.addEventListener("click", () => {
    state.history = [];
    renderHistory();
  });
  elements.clearFavorites.addEventListener("click", () => {
    state.favorites = [];
    saveFavorites();
    renderFavorites();
    showToast("Favorites cleared");
  });
  elements.closeFavorites.addEventListener("click", () => {
    elements.favoritesModal.close();
  });
  elements.favoritesModal.addEventListener("click", (event) => {
    if (event.target === elements.favoritesModal) {
      elements.favoritesModal.close();
    }
  });
  elements.closeBatch.addEventListener("click", () => {
    elements.batchModal.close();
  });
  elements.copyBatch.addEventListener("click", () => {
    copyText(state.batchNames.join("\n"));
  });
  elements.batchModal.addEventListener("click", (event) => {
    if (event.target === elements.batchModal) {
      elements.batchModal.close();
    }
  });
}

function renderDice() {
  elements.diceRow.innerHTML = "";
}

function renderSpeciesInfo() {
  const species = getSpecies();
  elements.infoTitle.textContent = `Species Notes: ${species.label}`;
  elements.infoDescription.textContent = species.description;
  elements.infoStyle.textContent = species.style;
  elements.infoTone.textContent = species.tone;
  elements.traitList.innerHTML = species.traits.map((trait) => `<li>${trait}</li>`).join("");
}

function rollAllNow(animated = true) {
  clearActivePreset();
  state.addTitle = false;
  state.addLand = false;
  clearUnlockedTokenRolls("First", state.firstLocks);
  clearUnlockedTokenRolls("Last", state.lastLocks);
  DICE.forEach((die) => {
    if (!state.lastLocks[`die:${die.id}`] && (die.id !== "structure" || !state.surnameLocked)) {
      state.surnameRolls[die.id] = randomD100();
    }
  });
  const firstDice = DICE
    .map((die) => die.id)
    .filter((dieId) => dieId !== "structure" || !hasLockedRolls(state.firstLocks));

  if (animated) {
    rollDice(firstDice, true);
    return;
  }

  firstDice
    .filter((dieId) => !state.firstLocks[`die:${dieId}`])
    .forEach((dieId) => {
      state.rolls[dieId] = randomD100();
    });
  updateAll();
  addHistory(state.currentName);
}

function updateAll() {
  const result = generateCurrentName();
  state.currentName = result.name;
  state.currentTrace = result.trace;
  elements.generatedName.textContent = result.name;
  fitGeneratedName();
  renderOptionButtons(result);
  renderDiceState(result);
  renderSurnameState(result);
  updateFavoriteControls();
}

function fitGeneratedName() {
  const nameElement = elements.generatedName;
  if (!nameElement) return;

  window.requestAnimationFrame(() => {
    nameElement.style.fontSize = "";
    const maxSize = Number.parseFloat(window.getComputedStyle(nameElement).fontSize);
    const minSize = window.matchMedia("(max-width: 640px)").matches ? 24 : 30;
    let low = minSize;
    let high = maxSize;

    if (nameElement.scrollWidth <= nameElement.clientWidth || !nameElement.clientWidth) return;

    while (high - low > 0.5) {
      const mid = (low + high) / 2;
      nameElement.style.fontSize = `${mid}px`;
      if (nameElement.scrollWidth <= nameElement.clientWidth) {
        low = mid;
      } else {
        high = mid;
      }
    }

    nameElement.style.fontSize = `${low}px`;
  });
}

function renderSurnameState(result = null) {
  renderTokenRollRow(elements.lastRollStrip, getTraceItems(result || { trace: state.currentTrace }, "Last"), "Last");
}

function renderDiceState(result = null) {
  renderTokenRollRow(elements.diceRow, getTraceItems(result || { trace: state.currentTrace }, "First"), "First");
}

function renderOptionButtons(result) {
  elements.addTitle.classList.toggle("is-hidden", result.hasTitle);
  elements.addLand.classList.toggle("is-hidden", result.hasPlace);
  elements.addTitle.classList.toggle("is-active", state.addTitle && !result.hasTitle);
  elements.addLand.classList.toggle("is-active", state.addLand && !result.hasPlace);
  elements.addTitle.textContent = state.addTitle && !result.hasTitle ? "Remove Title" : "Add Title";
  elements.addLand.textContent = state.addLand && !result.hasPlace ? "Remove Land" : "Add Land";
}

function applyPreset(presetId) {
  const preset = FAMOUS_RECIPES.find((item) => item.id === presetId);
  if (!preset) return;

  pushUndoState();
  state.activePresetId = preset.id;
  state.speciesId = preset.speciesId;
  state.addTitle = false;
  state.addLand = false;
  state.selectedDie = "structure";
  state.locks = Object.fromEntries(DICE.map((die) => [die.id, false]));
  state.firstLocks = {};
  state.lastLocks = {};
  state.surnameLocked = false;
  state.rolls = { ...preset.rolls };
  state.surnameRolls = { ...preset.surnameRolls };
  state.tokenRolls = { ...preset.tokenRolls, ...preset.surnameTokenRolls };
  elements.speciesSelect.value = state.speciesId;
  renderSpeciesInfo();
  updateAll();
  addHistory(state.currentName);
}

function clearActivePreset() {
  state.activePresetId = "";
}

function getActiveRollKeys(result, part = "") {
  const active = new Set(["structures"]);
  (result.trace || []).forEach((item) => {
    if (part && item.part && item.part !== part) return;
    if (item.key) active.add(item.key);
  });
  return active;
}

function getTraceItems(result, part) {
  const trace = result.trace || [];
  if (part === "First") {
    return trace.filter((item) => item.part === "First");
  }
  return trace.filter((item) => item.part === "Last");
}

function renderTokenRollRow(container, items, part) {
  const rolls = part === "First" ? state.rolls : state.surnameRolls;
  const selectedPrefix = part === "First" ? "" : "last-";

  container.innerHTML = items.map((item, index) => {
    const dieId = item.dieId === "surname" ? "structure" : item.dieId;
    const token = item.sequence > 1 && item.token !== "Structure" ? `${item.token}${item.sequence}` : item.token;
    const rollValue = item.roll || rolls[dieId] || 1;
    const inputValue = item.rollKey ? state.tokenRolls[item.rollKey] : (rolls[dieId] || rollValue);
    const selected = state.selectedDie === item.rollKey
      || state.selectedDie === `${selectedPrefix}${dieId}`
      || (part === "First" && state.selectedDie === dieId)
      || (part === "Last" && dieId === "structure" && state.selectedDie === "surname");
    const lockKey = getRollLockKey(dieId, item.rollKey);
    const locked = part === "First" ? Boolean(state.firstLocks[lockKey]) : Boolean(state.lastLocks[lockKey]);
    const value = item.key === "links" && isNone(item.value) ? "Direct join" : item.value;
    const canEdit = Boolean(item.rollKey || (dieId && rolls[dieId]));

    return `
      <div class="die token-die${selected ? " is-selected" : ""}${locked ? " is-locked" : ""}" data-part="${escapeHtml(part)}" data-die="${escapeHtml(dieId)}" data-roll-key="${escapeHtml(item.rollKey || "")}" data-index="${index}">
        <button class="die-roll" type="button" aria-label="Reroll ${escapeHtml(part)} ${escapeHtml(token)}">
          <span class="die-label">${escapeHtml(token)}</span>
          <span class="die-value">d${escapeHtml(rollValue)}</span>
          <span class="die-detail">${escapeHtml(value)}</span>
        </button>
        ${canEdit ? `<input class="die-input" type="number" min="1" max="100" inputmode="numeric" aria-label="Set ${escapeHtml(part)} ${escapeHtml(token)} roll" value="${escapeHtml(inputValue)}">` : ""}
        ${part === "First" && canEdit ? renderLockButton(state.firstLocks[lockKey], token) : ""}
        ${part === "Last" && canEdit ? renderLockButton(state.lastLocks[lockKey], `last ${token}`) : ""}
      </div>
    `;
  }).join("");

  wireTokenRollRow(container, part);
}

function wireTokenRollRow(container, part) {
  container.querySelectorAll(".token-die").forEach((dieElement) => {
    const dieId = dieElement.dataset.die;
    const rollKey = dieElement.dataset.rollKey;
    if (!dieId || dieId === "undefined") return;

    dieElement.querySelector(".die-roll").addEventListener("click", () => {
      clearActivePreset();
      if (part === "First" && state.firstLocks[getRollLockKey(dieId, rollKey)]) return;
      if (part === "Last" && state.lastLocks[getRollLockKey(dieId, rollKey)]) return;
      pushUndoState();
      if (rollKey) {
        state.tokenRolls[rollKey] = randomD100();
        state.selectedDie = `${part.toLowerCase()}-${rollKey}`;
        updateAll();
        addHistory(state.currentName);
      } else if (part === "First") {
        rollDice([dieId], false);
      } else {
        rollLastDie(dieId);
      }
    });

    const input = dieElement.querySelector(".die-input");
    if (input) {
      input.addEventListener("input", () => {
        const value = Number(input.value);
        if (!Number.isInteger(value) || value < 1 || value > 100) return;
        if (rollKey) {
          setTokenManualRoll(rollKey, value, false);
        } else if (part === "First") {
          setManualRoll(dieId, value, false);
        } else {
          setLastManualRoll(dieId, value, false);
        }
      });
      input.addEventListener("change", () => {
        const value = clampRoll(input.value);
        input.value = value;
        if (rollKey) {
          setTokenManualRoll(rollKey, value, true);
        } else if (part === "First") {
          setManualRoll(dieId, value, true);
        } else {
          setLastManualRoll(dieId, value, true);
        }
      });
    }

    const lock = dieElement.querySelector(".die-lock");
    if (lock) {
      lock.addEventListener("click", (event) => {
        event.stopPropagation();
        pushUndoState();
        if (part === "First") {
          toggleFirstLock(dieId, rollKey);
          renderDiceState();
        } else {
          toggleLastLock(dieId, rollKey);
          renderSurnameState();
        }
      });
    }
  });
}

function renderLockButton(locked, label) {
  const action = locked ? "Unlock" : "Lock";
  return `
    <button class="die-lock" type="button" aria-label="${escapeHtml(`${action} ${label}`)}" title="${action} roll" aria-pressed="${locked ? "true" : "false"}">
      ${locked ? renderLockIcon() : renderUnlockIcon()}
    </button>
  `;
}

function renderLockIcon() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="5" y="10" width="14" height="10" rx="2"></rect>
      <path d="M8 10V7a4 4 0 0 1 8 0v3"></path>
    </svg>
  `;
}

function renderUnlockIcon() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="5" y="10" width="14" height="10" rx="2"></rect>
      <path d="M8 10V7a4 4 0 0 1 7.6-1.7"></path>
    </svg>
  `;
}

function createHistorySnapshot() {
  return {
    speciesId: state.speciesId,
    addTitle: state.addTitle,
    addLand: state.addLand,
    rolls: { ...state.rolls },
    surnameRolls: { ...state.surnameRolls },
    tokenRolls: { ...state.tokenRolls },
    locks: { ...state.locks },
    firstLocks: { ...state.firstLocks },
    lastLocks: { ...state.lastLocks },
    surnameLocked: state.surnameLocked,
    activePresetId: state.activePresetId,
    nameFilter: state.nameFilter
  };
}

function normalizeHistoryEntry(entry) {
  return typeof entry === "string" ? { name: entry, snapshot: null } : entry;
}

function restoreHistoryEntry(entry) {
  const normalized = normalizeHistoryEntry(entry);
  if (!normalized?.snapshot) {
    copyText(normalized?.name);
    return;
  }

  const snapshot = normalized.snapshot;
  state.speciesId = snapshot.speciesId;
  state.addTitle = snapshot.addTitle;
  state.addLand = snapshot.addLand;
  state.rolls = { ...snapshot.rolls };
  state.surnameRolls = { ...snapshot.surnameRolls };
  state.tokenRolls = { ...snapshot.tokenRolls };
  state.locks = { ...snapshot.locks };
  state.firstLocks = { ...(snapshot.firstLocks || snapshot.locks || {}) };
  state.lastLocks = { ...snapshot.lastLocks };
  state.surnameLocked = snapshot.surnameLocked;
  state.activePresetId = snapshot.activePresetId || "";
  state.nameFilter = snapshot.nameFilter || "any";
  state.selectedDie = null;
  elements.speciesSelect.value = state.speciesId;
  syncToolControls();
  renderSpeciesInfo();
  updateAll();
  copyText(state.currentName);
}

function syncToolControls() {
  elements.nameFilter.value = state.nameFilter;
}

function pushUndoState() {
  state.undoStack = [createHistorySnapshot(), ...state.undoStack].slice(0, 30);
  state.redoStack = [];
  updateUndoRedoButtons();
}

function applySnapshot(snapshot) {
  state.speciesId = snapshot.speciesId;
  state.addTitle = snapshot.addTitle;
  state.addLand = snapshot.addLand;
  state.rolls = { ...snapshot.rolls };
  state.surnameRolls = { ...snapshot.surnameRolls };
  state.tokenRolls = { ...snapshot.tokenRolls };
  state.locks = { ...snapshot.locks };
  state.firstLocks = { ...(snapshot.firstLocks || snapshot.locks || {}) };
  state.lastLocks = { ...snapshot.lastLocks };
  state.surnameLocked = snapshot.surnameLocked;
  state.activePresetId = snapshot.activePresetId || "";
  state.nameFilter = snapshot.nameFilter || "any";
  state.selectedDie = null;
  elements.speciesSelect.value = state.speciesId;
  syncToolControls();
  renderSpeciesInfo();
  state.restoring = true;
  updateAll();
  state.restoring = false;
}

function undoRollState() {
  if (!state.undoStack.length) return;
  state.redoStack = [createHistorySnapshot(), ...state.redoStack].slice(0, 30);
  applySnapshot(state.undoStack.shift());
  updateUndoRedoButtons();
}

function redoRollState() {
  if (!state.redoStack.length) return;
  state.undoStack = [createHistorySnapshot(), ...state.undoStack].slice(0, 30);
  applySnapshot(state.redoStack.shift());
  updateUndoRedoButtons();
}

function updateUndoRedoButtons() {
  if (!elements.undoRoll || !elements.redoRoll) return;
  elements.undoRoll.disabled = !state.undoStack.length;
  elements.redoRoll.disabled = !state.redoStack.length;
}

function getDieDetail(die, rolls = state.rolls) {
  const data = getRecipeDataset();
  const value = pickRaw(data[die.key], rolls[die.id], 0);
  if (!value) return "-";
  if (die.id === "link" && isNone(value)) return "Direct join";
  return compactDetail(value);
}

function compactDetail(value) {
  return value.length > 28 ? `${value.slice(0, 25)}...` : value;
}

async function rollDice(dieIds, staggered) {
  if (state.rolling) return;
  const activeDice = dieIds.filter((dieId) => !state.firstLocks[`die:${dieId}`]);
  if (!activeDice.length) return;
  if (activeDice.includes("structure")) {
    state.addTitle = false;
    state.addLand = false;
    clearTokenRolls("First");
  }

  state.rolling = true;
  const finalRolls = Object.fromEntries(activeDice.map((dieId) => [dieId, randomD100()]));
  playRollSound(0.05);

  await Promise.all(activeDice.map((dieId, index) => {
    const delay = staggered ? index * 95 : 0;
    return animateDie(dieId, finalRolls[dieId], delay);
  }));

  state.rolling = false;
  updateAll();
  addHistory(state.currentName);
}

function animateDie(dieId, finalValue, delay) {
  return new Promise((resolve) => {
    const dieElement = elements.diceRow.querySelector(`[data-die="${dieId}"]`);
    if (!dieElement) {
      window.setTimeout(() => {
        state.rolls[dieId] = finalValue;
        resolve();
      }, delay);
      return;
    }
    const valueElement = dieElement.querySelector(".die-value");
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    window.setTimeout(() => {
      state.selectedDie = dieId;
      renderDiceState();

      if (prefersReduced) {
        state.rolls[dieId] = finalValue;
        updateAll();
        resolve();
        return;
      }

      dieElement.classList.remove("has-landed");
      dieElement.classList.add("is-rolling");
      playRollSound(0.025);
      const started = performance.now();
      const duration = Math.max(420, state.speed * 7);
      const interval = window.setInterval(() => {
        valueElement.textContent = randomD100();
      }, state.speed);

      window.setTimeout(() => {
        window.clearInterval(interval);
        state.rolls[dieId] = finalValue;
        dieElement.classList.remove("is-rolling");
        dieElement.classList.add("has-landed");
        updateAll();
        playRollSound(0.04);
        window.setTimeout(() => dieElement.classList.remove("has-landed"), 380);
        resolve();
      }, Math.max(220, duration - (performance.now() - started)));
    }, delay);
  });
}

function toggleFirstLock(dieId, rollKey) {
  const lockKey = getRollLockKey(dieId, rollKey);
  state.firstLocks[lockKey] = !state.firstLocks[lockKey];
  state.locks[dieId] = Boolean(state.firstLocks[`die:${dieId}`]);
  state.selectedDie = rollKey || dieId;
}

function getRollLockKey(dieId, rollKey) {
  return rollKey || `die:${dieId}`;
}

function toggleLastLock(dieId, rollKey) {
  const lockKey = getRollLockKey(dieId, rollKey);
  state.lastLocks[lockKey] = !state.lastLocks[lockKey];
  state.surnameLocked = Boolean(state.lastLocks["die:structure"]);
  state.selectedDie = rollKey || (dieId === "structure" ? "surname" : `last-${dieId}`);
}

function rollSurnameStructure() {
  if (state.lastLocks["die:structure"]) return;
  clearTokenRolls("Last");
  state.surnameRolls.structure = randomD100();
  state.selectedDie = "surname";
  updateAll();
  addHistory(state.currentName);
}

function rollLastDie(dieId) {
  if (state.lastLocks[`die:${dieId}`]) return;
  if (dieId === "structure") {
    rollSurnameStructure();
    return;
  }
  state.surnameRolls[dieId] = randomD100();
  state.selectedDie = `last-${dieId}`;
  updateAll();
  addHistory(state.currentName);
}

function setSurnameRoll(value, commitHistory) {
  if (commitHistory) pushUndoState();
  clearActivePreset();
  clearTokenRolls("Last");
  state.surnameRolls.structure = value;
  state.selectedDie = "surname";
  updateAll();
  if (commitHistory) addHistory(state.currentName);
}

function setTokenManualRoll(rollKey, value, commitHistory) {
  if (commitHistory) pushUndoState();
  clearActivePreset();
  state.tokenRolls[rollKey] = value;
  state.selectedDie = rollKey;
  updateAll();
  if (commitHistory) addHistory(state.currentName);
}

function setLastManualRoll(dieId, value, commitHistory) {
  if (commitHistory) pushUndoState();
  clearActivePreset();
  if (dieId === "structure") {
    clearTokenRolls("Last");
  }
  state.surnameRolls[dieId] = value;
  state.selectedDie = dieId === "structure" ? "surname" : `last-${dieId}`;
  updateAll();
  if (commitHistory) addHistory(state.currentName);
}

function setManualRoll(dieId, value, commitHistory) {
  if (commitHistory) pushUndoState();
  clearActivePreset();
  if (dieId === "structure") {
    state.addTitle = false;
    state.addLand = false;
    clearTokenRolls("First");
  }
  state.rolls[dieId] = value;
  state.selectedDie = dieId;
  updateAll();
  if (commitHistory) addHistory(state.currentName);
}

function clearTokenRolls(part) {
  Object.keys(state.tokenRolls).forEach((key) => {
    if (key.startsWith(`${part}:`)) {
      delete state.tokenRolls[key];
    }
  });
}

function clearUnlockedTokenRolls(part, locks) {
  Object.keys(state.tokenRolls).forEach((key) => {
    if (key.startsWith(`${part}:`) && !locks[key]) {
      delete state.tokenRolls[key];
    }
  });
}

function hasLockedRolls(locks) {
  return Object.values(locks).some(Boolean);
}

function rerollUnlockedNameParts() {
  if (!hasLockedRolls(state.firstLocks)) {
    state.rolls.structure = randomD100();
    clearTokenRolls("First");
  } else {
    clearUnlockedTokenRolls("First", state.firstLocks);
  }

  DICE.forEach((die) => {
    if (die.id !== "structure" && !state.firstLocks[`die:${die.id}`]) {
      state.rolls[die.id] = randomD100();
    }
    if (die.id !== "structure" && !state.lastLocks[`die:${die.id}`]) {
      state.surnameRolls[die.id] = randomD100();
    }
  });

  if (!state.surnameLocked && !state.lastLocks["die:structure"]) {
    state.surnameRolls.structure = randomD100();
    clearUnlockedTokenRolls("Last", state.lastLocks);
  }
}

function clampRoll(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return 1;
  return Math.min(100, Math.max(1, parsed));
}

function generateCurrentName() {
  let result = buildCurrentNameResult();
  if (state.restoring) return result;

  for (let attempt = 0; attempt < 12; attempt += 1) {
    if (!rerollRepeatedWordRolls(result.trace)) break;
    result = buildCurrentNameResult();
  }

  const matcher = FILTER_LIMITS[state.nameFilter] || FILTER_LIMITS.any;
  for (let attempt = 0; attempt < 16 && !matcher(result.name); attempt += 1) {
    rerollUnlockedNameParts();
    result = buildCurrentNameResult();
    for (let repeatAttempt = 0; repeatAttempt < 6; repeatAttempt += 1) {
      if (!rerollRepeatedWordRolls(result.trace)) break;
      result = buildCurrentNameResult();
    }
  }

  return result;
}

function buildCurrentNameResult() {
  const data = getRecipeDataset();
  const suffixes = [];
  const context = createContext(0, [], state.rolls, "First", suffixes);
  const structure = pickFromData("structures", data, context, "Structure");
  const firstName = cleanBaseName(resolvePattern(structure, data, context, 0)) || "Nameless";
  const surnameStructure = getSurnameStructure();
  const surname = generateDistinctLastName(data, surnameStructure, firstName, context.trace, suffixes);
  const lastName = surname.name;
  let name = cleanName(`${firstName} ${lastName}`);
  const titleSuffix = suffixes.find((suffix) => suffix.kind === "title");
  const placeSuffix = suffixes.find((suffix) => suffix.kind === "place");
  const hasTitle = Boolean(titleSuffix);
  const hasPlace = Boolean(placeSuffix);

  if (titleSuffix) {
    name = cleanName(`${name} ${titleSuffix.text}`);
  }

  if (placeSuffix) {
    name = cleanName(`${name} ${placeSuffix.text}`);
  }

  if (state.addTitle && !hasTitle) {
    const titlePhrase = buildTitlePhrase(data, state.rolls);
    name = cleanName(`${name} ${titlePhrase}`);
    context.trace.push({
      token: "AddedTitle",
      key: "titles",
      dieId: "title",
      roll: state.rolls.title,
      value: titlePhrase,
      part: "First"
    });
  }

  if (state.addLand && !hasPlace) {
    const placePhrase = buildPlacePhrase(data, state.rolls);
    name = cleanName(`${name} ${placePhrase}`);
    context.trace.push({
      token: "AddedLand",
      key: "places",
      dieId: "place",
      roll: state.rolls.place,
      value: placePhrase,
      part: "First"
    });
  }

  return {
    name,
    structure,
    surnameStructure,
    hasTitle,
    hasPlace,
    formula: context.trace
      .filter((item) => item.token !== "Structure" && item.token !== "SurnameStructure")
      .map((item) => item.token)
      .join(" "),
    trace: context.trace
  };
}

function generateDistinctLastName(data, surnameStructure, firstName, trace, suffixes) {
  let accepted = null;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const attemptTrace = attempt === 0 ? trace : trace.filter((item) => item.part !== "Last");
    const attemptSuffixes = attempt === 0 ? suffixes : suffixes.filter((item) => item.part !== "Last");

    attemptTrace.push({
      token: "Structure",
      key: "structures",
      dieId: "structure",
      roll: state.surnameRolls.structure,
      value: surnameStructure,
      part: "Last",
      surname: true
    });

    const surnameContext = createContext(0, attemptTrace, state.surnameRolls, "Last", attemptSuffixes);
    const lastName = cleanBaseName(resolvePattern(surnameStructure, data, surnameContext, 0)) || "Nameless";
    accepted = { name: lastName, trace: attemptTrace, suffixes: attemptSuffixes };

    if (!hasNameRepeat(firstName, lastName) && !hasInternalTokenRepeat(attemptTrace, "Last")) break;
    rerollLastTokenRolls(attemptTrace);
  }

  if (accepted.trace !== trace) {
    trace.length = 0;
    trace.push(...accepted.trace);
  }
  if (accepted.suffixes !== suffixes) {
    suffixes.length = 0;
    suffixes.push(...accepted.suffixes);
  }
  return accepted;
}

function rerollLastTokenRolls(trace) {
  trace
    .filter((item) => item.part === "Last" && item.rollKey && !isTraceItemLocked(item))
    .forEach((item) => {
      state.tokenRolls[item.rollKey] = randomD100();
    });
}

function rerollRepeatedWordRolls(trace) {
  const groups = new Map();

  trace
    .filter(isWordTableTraceItem)
    .forEach((item) => {
      const value = normalizeRecipeText(item.value);
      if (value.length < 3) return;
      groups.set(value, [...(groups.get(value) || []), item]);
    });

  let changed = false;
  groups.forEach((items) => {
    if (items.length < 2) return;

    const lockedItems = items.filter(isTraceItemLocked);
    const keep = lockedItems[0] || items[0];
    items.forEach((item) => {
      if (item === keep || isTraceItemLocked(item) || !item.rollKey) return;
      state.tokenRolls[item.rollKey] = randomD100();
      changed = true;
    });
  });

  return changed;
}

function isWordTableTraceItem(item) {
  return item.rollKey
    && item.key === "words"
    && !isNone(item.value);
}

function isTraceItemLocked(item) {
  if (!item?.rollKey) return false;
  const locks = item.part === "Last" ? state.lastLocks : state.firstLocks;
  return Boolean(locks[getRollLockKey(item.dieId, item.rollKey)]);
}

function hasNameRepeat(firstName, lastName) {
  const firstPieces = getRepeatPieces(firstName);
  const lastPieces = getRepeatPieces(lastName);
  return lastPieces.some((piece) => {
    return firstPieces.some((first) => {
      if (piece === first) return true;
      return piece.length >= 5 && first.length >= 5 && (piece.includes(first) || first.includes(piece));
    });
  });
}

function hasInternalTokenRepeat(trace, part) {
  const seen = new Map();
  return trace
    .filter((item) => item.part === part && item.rollKey && isRepeatableToken(item))
    .some((item) => {
      const value = normalizeRecipeText(item.value);
      if (value.length < 3) return false;
      const previous = seen.get(value);
      seen.set(value, item.token);
      return Boolean(previous);
    });
}

function isRepeatableToken(item) {
  return item.key === "words"
    || item.key === "titles"
    || item.key === "places"
    || item.key === "ends"
    || item.token === "Word"
    || item.token.endsWith("Word")
    || item.token === "End";
}

function getRepeatPieces(name) {
  const normalized = normalizeRecipeText(name);
  const pieces = new Set();
  String(name)
    .split(/[\s'-]+/)
    .map(normalizeRecipeText)
    .filter((piece) => piece.length >= 4)
    .forEach((piece) => pieces.add(piece));

  for (let size = 5; size <= Math.min(10, normalized.length); size += 1) {
    for (let index = 0; index <= normalized.length - size; index += 1) {
      pieces.add(normalized.slice(index, index + size));
    }
  }

  return [...pieces];
}

function buildFamilyName(data) {
  const first = pickRaw(data.words, state.rolls.word, 0);
  const link = pickRaw(data.links, state.rolls.link, 0);
  const second = pickRaw(data.words, state.rolls.word, 1);
  const end = pickRaw(data.ends, state.rolls.end, 0);

  if (isNone(link)) {
    return cleanName(`${first}${second}`);
  }

  if (state.rolls.end > 72) {
    return cleanName(`${first}${link}${second}${end}`);
  }

  return cleanName(`${first}${link}${second}`);
}

function buildTitlePhrase(data, rolls = state.rolls) {
  const title = cleanName(pickRaw(data.titles, rolls.title, 0));
  if (!title) return "the Nameless";
  return title.toLowerCase().startsWith("the ") ? title : `the ${title}`;
}

function buildPlacePhrase(data, rolls = state.rolls) {
  const place = cleanName(pickRaw(data.places, rolls.place, 0));
  if (!place) return "of the Forgotten Road";
  if (place.toLowerCase().startsWith("of ")) return place;
  return `of ${place}`;
}

function getSurnameStructure() {
  const preset = FAMOUS_RECIPES.find((item) => item.id === state.activePresetId);
  if (preset?.surnameStructure) return preset.surnameStructure;
  const structures = fillToHundred(SURNAME_STRUCTURES[state.speciesId] || SURNAME_STRUCTURES.human);
  return pickRaw(structures, state.surnameRolls.structure, 0);
}

function resolvePattern(pattern, data, context, depth) {
  if (!pattern || depth > 6) return "";
  return joinParts(
    String(pattern)
      .split("+")
      .flatMap((segment) => resolveSegment(segment.trim(), data, context, depth))
  );
}

function resolveSegment(segment, data, context, depth) {
  if (!segment) return [];

  if (segment.includes("-")) {
    const text = segment
      .split("-")
      .map((part) => joinParts(resolveSegment(part, data, context, depth)))
      .filter(Boolean)
      .join("-");
    return [{ text, kind: "word" }];
  }

  if (segment.includes(" ")) {
    return segment
      .split(/\s+/)
      .flatMap((part) => resolveSegment(part, data, context, depth));
  }

  return [resolveToken(segment, data, context, depth)].filter((part) => part.text !== "");
}

function resolveToken(token, data, context, depth) {
  const parenthesized = token.match(/^\(([^)]+)\)$/);
  if (parenthesized) {
    return { text: resolveNameToken(parenthesized[1], data, context, depth + 1), kind: "name" };
  }

  if (NAME_TOKEN_TO_SPECIES[token] || token.endsWith("Name")) {
    return { text: resolveNameToken(token, data, context, depth + 1), kind: "name" };
  }

  if (token === "C") return { text: pickFromData("consonants", data, context, "C"), kind: "phonetic" };
  if (token === "V") return { text: pickFromData("vowels", data, context, "V"), kind: "phonetic" };
  if (token === "End") return { text: pickFromData("ends", data, context, "End"), kind: "suffix" };
  if (token === "Word") return { text: pickFromData("words", data, context, "Word"), kind: "word" };
  if (token === "Title") return resolveSuffixToken("titles", data, context, "Title");
  if (token === "Place") return resolveSuffixToken("places", data, context, "Place");
  if (token === "Link") {
    const link = pickFromData("links", data, context, "Link");
    return isNone(link) ? { text: "", kind: "skip" } : { text: link, kind: "joiner" };
  }

  if (TOKEN_ALIASES[token]) {
    if (TOKEN_ALIASES[token] === "titles") return resolveSuffixToken("titles", data, context, token);
    return { text: pickFromData(TOKEN_ALIASES[token], data, context, token), kind: "word" };
  }

  if (/^[A-Z]+$/.test(token) && /[CV]/.test(token)) {
    const text = token
      .split("")
      .map((letter) => {
        if (letter === "C") return pickFromData("consonants", data, context, "C");
        if (letter === "V") return pickFromData("vowels", data, context, "V");
        return letter.toLowerCase();
      })
      .join("");
    return { text, kind: "phonetic" };
  }

  if (CONNECTORS.has(token.toLowerCase())) {
    return { text: token.toLowerCase(), kind: "connector" };
  }

  return { text: token.toLowerCase(), kind: "suffix" };
}

function resolveSuffixToken(key, data, context, token) {
  const value = cleanName(pickFromData(key, data, context, token));
  if (!value) return { text: "", kind: "skip" };

  if (key === "titles") {
    context.suffixes.push({
      kind: "title",
      text: value.toLowerCase().startsWith("the ") ? value : `the ${value}`,
      part: context.part
    });
  } else {
    context.suffixes.push({
      kind: "place",
      text: value.toLowerCase().startsWith("of ") ? value : `of ${value}`,
      part: context.part
    });
  }

  return { text: "", kind: "skip" };
}

function resolveNameToken(token, data, context, depth) {
  const speciesId = NAME_TOKEN_TO_SPECIES[token] || state.speciesId;
  const targetData = state.datasets.get(speciesId) || data;
  const simpleStructures = targetData.structures.filter(isSimpleNameStructure);
  const baseRoll = context.rolls.structure + depth * 17;
  const structure = pickRaw(simpleStructures.length ? simpleStructures : targetData.structures, baseRoll, depth);
  context.trace.push({
    token,
    key: "structures",
    dieId: "structure",
    roll: context.rolls.structure,
    value: structure,
    recursive: true,
    part: context.part
  });
  const childContext = createContext(depth, context.trace, context.rolls, context.part, context.suffixes);
  return cleanName(resolvePattern(structure, targetData, childContext, depth));
}

function isSimpleNameStructure(structure) {
  return /^[CVEnd+AROIUSNYFZ]+$/i.test(structure)
    && !structure.includes("Word")
    && !structure.includes("Title")
    && !structure.includes("Place")
    && !structure.includes("(");
}

function joinParts(parts) {
  let previousKind = "";

  return parts.reduce((result, part) => {
    if (!part.text) return result;
    if (!result) {
      previousKind = part.kind;
      return part.text;
    }

    const needsSpace =
      part.kind === "connector"
      || previousKind === "connector"
      || part.kind === "place"
      || part.kind === "title"
      || previousKind === "title"
      || previousKind === "name"
      || part.kind === "name";

    previousKind = part.kind;
    return `${result}${needsSpace ? " " : ""}${part.text}`;
  }, "");
}

function pickFromData(key, data, context, token) {
  const dieId = DIE_BY_KEY[key];
  const offset = context.counts[key] || 0;
  context.counts[key] = offset + 1;
  const sequence = offset + 1;
  const rollKey = key === "structures" ? "" : makeTokenRollKey(context, key, sequence);
  const roll = key === "structures" ? (context.rolls[dieId] || 1) : getTokenRoll(rollKey);
  const value = pickRaw(data[key], roll, 0);
  context.trace.push({
    token: token || formatTokenLabel(key),
    key,
    dieId,
    roll,
    value,
    sequence,
    rollKey,
    part: context.part
  });
  return value;
}

function makeTokenRollKey(context, key, sequence) {
  return `${context.part}:${key}:${context.depth}:${sequence}`;
}

function getTokenRoll(rollKey) {
  if (!state.tokenRolls[rollKey]) {
    state.tokenRolls[rollKey] = randomD100();
  }
  return state.tokenRolls[rollKey];
}

function pickRaw(values, roll, offset) {
  if (!Array.isArray(values) || values.length === 0) return "";
  const index = positiveModulo((roll - 1) + offset * 17, values.length);
  return String(values[index]);
}

function createContext(depth = 0, trace = [], rolls = state.rolls, part = "First", suffixes = []) {
  return { depth, counts: {}, trace, rolls, part, suffixes };
}

function formatTokenLabel(key) {
  const labels = {
    structures: "Structure",
    consonants: "C",
    vowels: "V",
    ends: "End",
    words: "Word",
    links: "Link",
    titles: "Title",
    places: "Place"
  };
  return labels[key] || key;
}

function cleanName(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/\s+-\s+/g, "-")
    .trim()
    .split(" ")
    .map((word, index) => {
      const lower = word.toLowerCase();
      if (index > 0 && CONNECTORS.has(lower)) return lower;
      return word.split("-").map(capitalizeNamePart).join("-");
    })
    .join(" ")
    .replace(/\bOf\b/g, "of")
    .replace(/\bThe\b/g, "the")
    .replace(/\bFrom\b/g, "from");
}

function cleanBaseName(value) {
  let cleaned = cleanName(value);
  while (/\s(?:the|of|from)$/i.test(cleaned)) {
    cleaned = cleaned.replace(/\s(?:the|of|from)$/i, "").trim();
  }
  return cleaned;
}

function capitalizeNamePart(part) {
  if (!part) return part;
  const lower = part.toLowerCase();
  if (CONNECTORS.has(lower)) return lower;
  return `${lower.charAt(0).toUpperCase()}${lower.slice(1)}`;
}

function addHistory(name) {
  if (!name || normalizeHistoryEntry(state.history[0])?.name === name) return;
  const entry = { name, snapshot: createHistorySnapshot() };
  state.history = [entry, ...state.history.filter((item) => normalizeHistoryEntry(item).name !== name)].slice(0, 4);
  renderHistory();
}

function renderHistory() {
  if (!state.history.length) {
    elements.historyList.innerHTML = `<li>No names rolled yet.</li>`;
    return;
  }

  elements.historyList.innerHTML = state.history
    .map((entry, index) => {
      const name = normalizeHistoryEntry(entry).name;
      const isFavorited = isFavoriteName(name);
      const favoriteLabel = isFavorited ? "Remove from favorites" : "Add to favorites";
      return `
        <li class="history-item">
          <button type="button" data-history-index="${index}" data-history-action="restore">${escapeHtml(name)}</button>
          ${miniActionButton("copy", "Copy", `data-history-index="${index}" data-history-action="copy"`)}
          <button class="mini-action heart-action${isFavorited ? " is-active" : ""}" type="button" data-history-index="${index}" data-history-action="favorite" title="${favoriteLabel}" aria-label="${favoriteLabel}">${isFavorited ? "♥" : "♡"}</button>
          ${miniActionButton("delete", "Delete", `data-history-index="${index}" data-history-action="delete"`)}
        </li>
      `;
    })
    .join("");

  elements.historyList.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.historyIndex);
      const entry = normalizeHistoryEntry(state.history[index]);
      if (button.dataset.historyAction === "copy") {
        copyText(entry.name);
      } else if (button.dataset.historyAction === "favorite") {
        toggleFavorite(entry.name, entry.snapshot);
      } else if (button.dataset.historyAction === "delete") {
        state.history.splice(index, 1);
        renderHistory();
      } else {
        restoreHistoryEntry(state.history[index]);
      }
    });
  });
}

function loadFavorites() {
  try {
    state.favorites = JSON.parse(localStorage.getItem("fantasy-name-forge:favorites") || "[]");
  } catch {
    state.favorites = [];
  }
}

function saveFavorites() {
  localStorage.setItem("fantasy-name-forge:favorites", JSON.stringify(state.favorites));
}

function miniActionButton(icon, label, attributes) {
  return `<button class="mini-action icon-action" type="button" ${attributes} title="${label}" aria-label="${label}">${ICONS[icon]}</button>`;
}

function addFavorite(name, snapshot = createHistorySnapshot()) {
  if (!name) return;
  state.favorites = [{ name, snapshot }, ...state.favorites.filter((item) => item.name !== name)].slice(0, 50);
  saveFavorites();
  renderFavorites();
  showToast("Added to favorites");
}

function removeFavorite(name) {
  state.favorites = state.favorites.filter((item) => item.name !== name);
  saveFavorites();
  renderFavorites();
  showToast("Removed from favorites");
}

function toggleFavorite(name, snapshot = createHistorySnapshot()) {
  if (isFavoriteName(name)) {
    removeFavorite(name);
  } else {
    addFavorite(name, snapshot);
  }
}

function toggleCurrentFavorite() {
  toggleFavorite(state.currentName, createHistorySnapshot());
}

function isCurrentFavorite() {
  return isFavoriteName(state.currentName);
}

function isFavoriteName(name) {
  return state.favorites.some((item) => item.name === name);
}

function updateFavoriteControls() {
  if (!elements.favoriteName || !elements.openFavorites) return;
  elements.favoriteName.textContent = isCurrentFavorite() ? "Unfavorite" : "Favorite";
  elements.favoriteName.classList.toggle("is-active", isCurrentFavorite());
  elements.openFavorites.disabled = state.favorites.length === 0;
  elements.openFavorites.textContent = state.favorites.length
    ? `Favorite List (${state.favorites.length})`
    : "Favorite List";
}

function renderFavorites() {
  if (!state.favorites.length) {
    elements.favoritesList.innerHTML = `<li>No favorites saved yet.</li>`;
    updateFavoriteControls();
    renderHistory();
    if (elements.favoritesModal?.open) elements.favoritesModal.close();
    return;
  }

  elements.favoritesList.innerHTML = state.favorites
    .map((entry, index) => `
      <li class="favorite-item">
        <button type="button" data-favorite-index="${index}" data-favorite-action="restore">${escapeHtml(entry.name)}</button>
        ${miniActionButton("copy", "Copy", `data-favorite-index="${index}" data-favorite-action="copy"`)}
        ${miniActionButton("delete", "Delete", `data-favorite-index="${index}" data-favorite-action="delete"`)}
      </li>
    `)
    .join("");

  elements.favoritesList.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.favoriteIndex);
      const entry = state.favorites[index];
      if (button.dataset.favoriteAction === "copy") {
        copyText(entry.name);
      } else if (button.dataset.favoriteAction === "delete") {
        removeFavorite(entry.name);
      } else if (entry.snapshot) {
        applySnapshot(entry.snapshot);
        copyText(state.currentName);
      } else {
        copyText(entry.name);
      }
    });
  });
  updateFavoriteControls();
  renderHistory();
}

async function copyCurrentName() {
  await copyText(state.currentName);
}

async function copyText(text) {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    showToast("Copied to clipboard");
  } catch {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(elements.generatedName);
    selection.removeAllRanges();
    selection.addRange(range);
    showToast("Name selected for copying");
  }
}

function showToast(message) {
  if (!elements.toastRegion) return;
  elements.toastRegion.textContent = message;
  elements.toastRegion.classList.add("is-visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    elements.toastRegion.classList.remove("is-visible");
  }, 1500);
}

function openBatchRoll() {
  const original = createHistorySnapshot();
  const originalHistory = [...state.history];
  const count = Number(elements.batchCount.value);
  const usedParts = new Set();
  state.batchNames = [];

  for (let index = 0; index < count; index += 1) {
    rollBatchName(usedParts);
  }

  applySnapshot(original);
  state.history = originalHistory;
  renderHistory();
  renderBatchList();
  elements.batchModal.showModal();
}

function rollBatchName(usedParts) {
  let bestName = "";
  let bestTrace = [];
  let bestScore = Number.POSITIVE_INFINITY;

  for (let attempt = 0; attempt < 12; attempt += 1) {
    rollAllNow(false);
    const parts = getBatchVarietyParts(state.currentTrace, state.currentName);
    const score = parts.filter((part) => usedParts.has(part)).length
      + (state.batchNames.includes(state.currentName) ? 5 : 0);

    if (score < bestScore) {
      bestName = state.currentName;
      bestTrace = [...state.currentTrace];
      bestScore = score;
    }

    if (score === 0) break;
  }

  state.batchNames.push(bestName);
  getBatchVarietyParts(bestTrace, bestName).forEach((part) => usedParts.add(part));
}

function getBatchVarietyParts(trace, name) {
  const parts = new Set();

  trace
    .filter((item) => item.key === "words" || item.key === "titles" || item.key === "places")
    .forEach((item) => {
      normalizeRecipeText(item.value)
        .split(/[^a-z]+/i)
        .filter((piece) => piece.length >= 4)
        .forEach((piece) => parts.add(piece));
    });

  String(name)
    .split(/[\s'-]+/)
    .map(normalizeRecipeText)
    .filter((piece) => piece.length >= 5)
    .forEach((piece) => parts.add(piece));

  return [...parts];
}

function renderBatchList() {
  elements.batchList.innerHTML = state.batchNames
    .map((name, index) => `
      <li class="batch-item">
        <button type="button" data-batch-index="${index}" data-batch-action="copy">${escapeHtml(name)}</button>
        <button class="mini-action heart-action${isFavoriteName(name) ? " is-active" : ""}" type="button" data-batch-index="${index}" data-batch-action="favorite" title="${isFavoriteName(name) ? "Remove from favorites" : "Add to favorites"}" aria-label="${isFavoriteName(name) ? "Remove from favorites" : "Add to favorites"}">${isFavoriteName(name) ? "♥" : "♡"}</button>
      </li>
    `)
    .join("");

  elements.batchList.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      const name = state.batchNames[Number(button.dataset.batchIndex)];
      if (button.dataset.batchAction === "favorite") {
        toggleFavorite(name, null);
        renderBatchList();
      } else {
        copyText(name);
      }
    });
  });
}

function populateVoices() {
  if (!("speechSynthesis" in window)) return;
  state.voices = window.speechSynthesis.getVoices();

  if (!state.voices.length) {
    elements.voiceSelect.innerHTML = `<option value="">Default browser voice</option>`;
    return;
  }

  const preferredVoice = state.voices.find((voice) => voice.lang.toLowerCase().startsWith("en"))
    || state.voices[0];
  if (!state.voiceURI) {
    state.voiceURI = preferredVoice.voiceURI;
  }

  elements.voiceSelect.innerHTML = state.voices
    .map((voice) => {
      const label = `${voice.name} (${voice.lang})`;
      return `<option value="${escapeHtml(voice.voiceURI)}">${escapeHtml(label)}</option>`;
    })
    .join("");
  elements.voiceSelect.value = state.voiceURI;
}

function readCurrentName() {
  speakText(state.currentName, elements.readName, "Reading", "Read Name");
}

function previewVoice() {
  speakText("Fantasy Name Forge voice preview.", elements.previewVoice, "Previewing", "Preview Voice");
}

function speakText(text, button, activeLabel, idleLabel) {
  if (!("speechSynthesis" in window) || !text) return;
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  const voice = state.voices.find((item) => item.voiceURI === state.voiceURI);
  if (voice) utterance.voice = voice;
  utterance.pitch = state.pitch;
  utterance.rate = state.rate;
  utterance.onstart = () => {
    button.textContent = activeLabel;
  };
  utterance.onend = () => {
    button.textContent = idleLabel;
  };
  utterance.onerror = () => {
    button.textContent = idleLabel;
  };

  window.speechSynthesis.speak(utterance);
}

function playRollSound(volume) {
  if (!state.sound) return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;

  const context = new AudioContext();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "triangle";
  oscillator.frequency.value = 180 + Math.random() * 220;
  gain.gain.value = volume;
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.045);
}

function getSpecies() {
  return SPECIES.find((species) => species.id === state.speciesId) || SPECIES[0];
}

function getCurrentDataset() {
  return state.datasets.get(state.speciesId) || createFallbackDataset(getSpecies());
}

function getRecipeDataset() {
  const base = getCurrentDataset();
  const preset = FAMOUS_RECIPES.find((item) => item.id === state.activePresetId);
  if (!preset || preset.speciesId !== state.speciesId) return base;

  const dataset = {};
  DICE.forEach((die) => {
    dataset[die.key] = [...base[die.key]];
  });

  setRecipeValue(dataset.structures, preset.rolls.structure, 0, preset.structure);
  Object.entries(preset.values).forEach(([key, values]) => {
    values.forEach((value, index) => {
      const roll = preset.tokenRolls[`First:${key}:0:${index + 1}`] || preset.rolls[DIE_BY_KEY[key]];
      setRecipeValue(dataset[key], roll, 0, value);
    });
  });
  Object.entries(preset.surnameValues).forEach(([key, values]) => {
    values.forEach((value, index) => {
      const roll = preset.surnameTokenRolls[`Last:${key}:0:${index + 1}`] || preset.surnameRolls[DIE_BY_KEY[key]];
      setRecipeValue(dataset[key], roll, 0, value);
    });
  });
  return dataset;
}

function setRecipeValue(values, roll, offset, value) {
  if (!Array.isArray(values) || !values.length) return;
  const index = positiveModulo((roll - 1) + offset * 17, values.length);
  values[index] = value;
}

function makePreset(id, speciesId, name, structure, structureRoll, values) {
  const surnameName = PRESET_SURNAMES[id] || "";
  const surnameRecipe = buildSurnameRecipe(surnameName);
  const tokenRolls = buildRecipeTokenRolls(values, "First");
  return {
    id,
    speciesId,
    name,
    displayName: surnameName ? `${name} ${surnameName}` : name,
    structure,
    values,
    tokenRolls,
    surnameName,
    surnameStructure: surnameRecipe.structure,
    surnameValues: surnameRecipe.values,
    surnameRoll: surnameRecipe.structure ? surnameRecipe.rolls.structure : positiveModulo(structureRoll + 30, 100) + 1,
    surnameRolls: surnameRecipe.structure ? surnameRecipe.rolls : randomRollSet(),
    surnameTokenRolls: surnameRecipe.tokenRolls,
    rolls: {
      structure: structureRoll,
      consonant: 17,
      vowel: 31,
      end: 47,
      word: 59,
      link: 63,
      title: 71,
      place: 83
    }
  };
}

function buildRecipeTokenRolls(values, part) {
  const baseByKey = part === "First"
    ? {
        consonants: 17,
        vowels: 31,
        ends: 47,
        words: 59,
        links: 63,
        titles: 71,
        places: 83
      }
    : {
        consonants: 18,
        vowels: 28,
        ends: 38,
        words: 48,
        links: 58,
        titles: 68,
        places: 78
      };
  const tokenRolls = {};
  Object.entries(values || {}).forEach(([key, entries]) => {
    const base = baseByKey[key] || 18;
    entries.forEach((_, index) => {
      tokenRolls[`${part}:${key}:0:${index + 1}`] = positiveModulo(base + index * 13 - 1, 100) + 1;
    });
  });
  return tokenRolls;
}

function buildSurnameRecipe(name, dataset = null) {
  if (!name) {
    return {
      structure: "",
      values: {},
      tokenRolls: {},
      audit: "empty",
      rolls: {
        structure: 1,
        consonant: 19,
        vowel: 29,
        end: 39,
        word: 49,
        link: 59,
        title: 69,
        place: 79
      }
    };
  }

  const rolls = {
    structure: 1,
    consonant: 18,
    vowel: 28,
    end: 38,
    word: 48,
    link: 58,
    title: 68,
    place: 78
  };

  const wordRecipe = buildDatasetWordRecipe(name, dataset, rolls);
  if (wordRecipe) return wordRecipe;

  if (name.includes("-")) {
    const parsed = parseCompoundNameToTokens(name, "-");
    return {
      structure: parsed.structure,
      values: parsed.values,
      tokenRolls: buildRecipeTokenRolls(parsed.values, "Last"),
      audit: "phonetic hyphen recipe",
      rolls
    };
  }

  if (/\s/.test(name.trim())) {
    const parsed = parseCompoundNameToTokens(name, " ");
    return {
      structure: parsed.structure,
      values: parsed.values,
      tokenRolls: buildRecipeTokenRolls(parsed.values, "Last"),
      audit: "phonetic spaced recipe",
      rolls
    };
  }

  const parsed = parseNameToTokens(name);
  return {
    structure: parsed.structure,
    values: parsed.values,
    tokenRolls: buildRecipeTokenRolls(parsed.values, "Last"),
    audit: "phonetic recipe",
    rolls
  };
}

function parseCompoundNameToTokens(name, separator) {
  const parts = separator === " " ? name.trim().split(/\s+/) : name.split(separator).filter(Boolean);
  const structures = [];
  const values = {};

  parts.forEach((part) => {
    const parsed = parseNameToTokens(part);
    structures.push(parsed.structure);
    Object.entries(parsed.values).forEach(([key, entries]) => {
      values[key] = [...(values[key] || []), ...entries];
    });
  });

  if (separator === " ") {
    values.links = Array(Math.max(0, parts.length - 1)).fill(" ");
    return {
      structure: structures.join("+Link+"),
      values
    };
  }

  return {
    structure: structures.join("-"),
    values
  };
}

function buildDatasetWordRecipe(name, dataset, rolls) {
  if (!dataset?.words?.length) return null;
  const parts = findWordParts(name, dataset.words);
  if (!parts) return null;

  const structure = parts.map(() => "Word").join("+");
  const tokenRolls = {};
  parts.forEach((part, index) => {
    const wordIndex = dataset.words.findIndex((word) => normalizeRecipeText(word) === normalizeRecipeText(part));
    tokenRolls[`Last:words:0:${index + 1}`] = wordIndex >= 0 ? wordIndex + 1 : positiveModulo(48 + index * 13 - 1, 100) + 1;
  });

  return {
    structure,
    values: { words: parts },
    tokenRolls,
    audit: "json words",
    rolls
  };
}

function findWordParts(name, words) {
  const clean = normalizeRecipeText(name);
  const wordMap = new Map(words.map((word) => [normalizeRecipeText(word), String(word)]));

  if (wordMap.has(clean)) return [wordMap.get(clean)];

  for (let split = 2; split < clean.length - 1; split += 1) {
    const first = clean.slice(0, split);
    const second = clean.slice(split);
    if (wordMap.has(first) && wordMap.has(second)) {
      return [wordMap.get(first), wordMap.get(second)];
    }
  }

  return null;
}

function normalizeRecipeText(value) {
  return String(value).toLowerCase().replace(/[^a-z]/g, "");
}

function parseNameToTokens(name) {
  const lower = name.toLowerCase();
  const vowelGroups = /^(ae|ai|au|ea|ee|ei|eo|ia|ie|io|oa|oe|oi|oo|ou|ua|ue|ui|[aeiouy]+)/;
  const consonants = [];
  const vowels = [];
  const tokens = [];
  let index = 0;

  while (index < lower.length) {
    const rest = lower.slice(index);
    const vowelMatch = rest.match(vowelGroups);
    if (vowelMatch) {
      vowels.push(vowelMatch[0]);
      tokens.push("V");
      index += vowelMatch[0].length;
      continue;
    }

    const nextVowel = rest.search(/[aeiouy]/);
    const chunk = nextVowel <= 0 ? rest : rest.slice(0, nextVowel);
    consonants.push(chunk);
    tokens.push("C");
    index += chunk.length;
  }

  const values = {};
  if (consonants.length) values.consonants = consonants;
  if (vowels.length) values.vowels = vowels;

  if (tokens.length > 2 && tokens[tokens.length - 1] === "C" && consonants.length) {
    values.ends = [consonants.pop()];
    tokens[tokens.length - 1] = "End";
  }

  return {
    structure: tokens.join("+"),
    values
  };
}

function randomD100() {
  return Math.floor(Math.random() * 100) + 1;
}

function randomRollSet() {
  return Object.fromEntries(DICE.map((die) => [die.id, randomD100()]));
}

function positiveModulo(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
}

function isNone(value) {
  return String(value).trim().toLowerCase() === "(none)";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
