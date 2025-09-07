const tipsTemplate = {
  'A': [
    "Always start with a balanced mix of vowels and consonants.",
    "Assess which letters are most frequent in common words like E, A, R, O, T, I, N.",
    "Avoid repeating letters early unless feedback suggests a double.",
    "Anchor guesses around reliable endings like -ER, -ED, -AL, -AN.",
    "Alternate your starters so you scan more letters across games.",
    "Aim to place A after common starters like ST, CR, or PL when clues fit."
  ],
  'B': [
    "Be mindful of common blends like BR, BL, and BO combinations.",
    "Brainstorm endings such as -BLE, -BLY, -BER when B shows yellow.",
    "Bring B forward only if you have a strong placement clue.",
    "Balance vowels around B since it rarely clusters with other consonants tightly.",
    "Bracket possibilities by swapping B with P if a sound fit is likely.",
    "Build candidate lists by toggling B with V in similar patterns."
  ],
  'C': [
    "Consider digraphs like CH, CR, CL, and SC when C appears.",
    "Check for soft C before E, I, or Y and hard C before A, O, U.",
    "Chain C with R or L for many openers such as CRANE or CLEAN.",
    "Cover alternate K sounds by testing C vs K in the same slot.",
    "Close out with -ICE, -ACE, -OCK patterns if letters align.",
    "Confirm positions by trying C at start then mid for contrast."
  ],
  'D': [
    "Deduce past-tense endings like -ED only when the game allows them and letters fit.",
    "Double-check D as a closer with -ND, -RD, -LD clusters.",
    "Draft guesses with DR, DE, DO openings to probe vowels.",
    "Drive D toward position 2 or 3 if start and end fail.",
    "Delay double letters until you have stronger feedback.",
    "Dial between D and T when the phonetic shape matches."
  ],
  'E': [
    "Examine E as a common end letter in five-letter words.",
    "Eliminate impossible pairs like double E in odd spots unless hinted.",
    "Experiment with -ER, -EL, -EN as finals when E is present.",
    "Extend searches by trying E in both slot 2 and slot 4.",
    "Engage vowel patterns like AE, EE, EI only with clue support.",
    "Estimate frequency by testing E early alongside A or O."
  ],
  'F': [
    "Focus on FR and FL as high-yield openers for F.",
    "Fence in endings like -IFT, -OFF, -SAFE style patterns when letters allow.",
    "Favor F near the start if mid positions fail often.",
    "Flip F with PH when the sound match suggests it.",
    "Frame guesses to test both F and S in similar roles.",
    "Filter choices by checking if F commonly pairs with your vowels."
  ],
  'G': [
    "Guess GL, GR, and GH patterns when G appears.",
    "Gauge soft G before E, I, Y vs hard G elsewhere.",
    "Group endings like -ING, -AGE, -OGE for late tests.",
    "Guard against rare GG unless feedback requires it.",
    "Grow options by swapping G with J for sound checks.",
    "Ground placements by trying G slot 2 if start fails."
  ],
  'H': [
    "Hone in on CH, TH, SH as extremely common digraphs.",
    "Handle H at the start sparingly unless you have a vowel follow.",
    "Hedge with -H endings like -AH or -OH only with support.",
    "Hook H after C, S, T to test frequent pairs quickly.",
    "Hunt for WH at the start when W is confirmed.",
    "Hold off on double H unless clues are strong."
  ],
  'I': [
    "Infer I as a mid vowel often in slot 2 or 3.",
    "Insert I with common frames like -ING or -ISH.",
    "Investigate vowel splits like I_E patterns with consonants between.",
    "Index words where I pairs with R, L, or T frequently.",
    "Iterate with I swapped against E to test vowel identity.",
    "Identify whether Y might act as a vowel instead of I."
  ],
  'J': [
    "Jot down options since J has a smaller pool of fits.",
    "Join J with U rarely; more often it pairs with A, O, or E next.",
    "Judge J mainly at the start, sometimes slot 2.",
    "Juggle J vs G only when clues are narrow.",
    "Jump to other letters if J stalls progress.",
    "Jar memory with common J words like JUICE, JOLLY, JOKER for patterns."
  ],
  'K': [
    "Keep K for later guesses unless you have strong evidence.",
    "Knit K with N or L like -NK or -LK endings.",
    "Key on SK or CK clusters for mid and end slots.",
    "Knock on KN starts when K is yellow and N is open.",
    "Keenly test -AKE, -OKE, -IKE when vowels fit.",
    "Kick K out early if C works better in the role."
  ],
  'L': [
    "Look for blends like CL, FL, PL, SL early.",
    "Lean on L as a closer in -AL, -EL, -IL when needed.",
    "Layer double L only with feedback support.",
    "Latch L next to vowels to expand options quickly.",
    "Limit random L placements and test structured pairs first.",
    "Line up L in slot 2 if starts and ends fail."
  ],
  'M': [
    "Measure M in starters like MA, ME, MO to test vowels.",
    "Match M with R, P, or L in frames like -RM, -MP, -LM.",
    "Mind -OME, -IME, -AME endings when M is yellow.",
    "Minimize double M until proven by clues.",
    "Map M to slot 2 or 3 for many common shapes.",
    "Mirror with N if the consonant feel suggests it."
  ],
  'N': [
    "Navigate N toward endings like -AN, -EN, -IN.",
    "Note common pairs: SN, KN, GN at the start.",
    "Nudge N to slot 3 or 4 when early trials fail.",
    "Name -ING as a high-value check if G fits.",
    "Narrow choices by testing -NE, -NT frames.",
    "Notice how N pairs with R and D in clusters."
  ],
  'O': [
    "Open with O in slot 2 to check common words.",
    "Orient around -OT, -ON, -OR for quick closures.",
    "Offset O with U or A only with support from clues.",
    "Optimize by testing O alongside R or L in starters.",
    "Observe O as a closer in -OO rare cases only when hinted.",
    "Order trials to move O through multiple slots rapidly."
  ],
  'P': [
    "Probe PR, PL, and PH as strong P patterns.",
    "Place P at start or slot 2 before mid tests.",
    "Pad endings like -PES, -PER when E and R are live.",
    "Pair P with L or R to widen candidate pools.",
    "Park double P until you see a yellow repeat.",
    "Pivot to B if P trials miss but sound fits."
  ],
  'Q': [
    "Quickly remember Q almost always pairs with U.",
    "Queue patterns like QUA, QUE, QUI for slot tests.",
    "Quell the urge to play Q early without support.",
    "Query if K or C might match the hard sound instead.",
    "Qualify Q with vowel placement to avoid dead ends.",
    "Quicken elimination by testing Q in one dedicated guess."
  ],
  'R': [
    "Raise R into blends like BR, CR, FR, GR, PR, TR.",
    "Rest R at the end in -ER and -AR when letters fit.",
    "Rotate R through slots 2 to 4 to triangulate position.",
    "Resist double R until feedback points to it.",
    "Root guesses in common frames like -IRE, -ORE, -ARE.",
    "Rank R swaps with L when patterns seem close."
  ],
  'S': [
    "Start with S blends like ST, SL, SP, SC to scan quickly.",
    "Set S as a closer with -ES or -IS when vowels fit.",
    "Skip initial S if clues suggest a silent S is unlikely.",
    "Scan for SH, CH, TH families that overlap with S logic.",
    "Stage double S only on strong signals.",
    "Switch S with C in similar patterns to confirm sounds."
  ],
  'T': [
    "Try TH, TR, ST, and CT clusters as early probes.",
    "Target -T as a closer in -NT, -LT, -RT when consonants align.",
    "Toggle T and D to resolve similar patterns.",
    "Test T in slot 2 if starts stall out.",
    "Track -ATE, -ITE, -OTE frames for late solves.",
    "Trim options by pairing T with R or L strategically."
  ],
  'U': [
    "Use U mainly after Q, but also in -OU-, -AU- patterns.",
    "Uncover -URN, -UST, -UMP when U is yellow.",
    "Update guesses by moving U across middle slots.",
    "Unite U with R and L to form common chunks.",
    "Untangle vowel roles by swapping U with O in trials.",
    "Utilize U as a closer rarely; confirm with clues first."
  ],
  'V': [
    "Verify V with vowels right after it, like VA, VE, VI.",
    "Value common finishes like -IVE, -AVE, -OVE.",
    "Vary positions but favor start or slot 2 first.",
    "Vet double V as very rare unless the game allows it.",
    "Vote to try V vs F in similar sound roles.",
    "Vault V next to R or L if patterns suggest it."
  ],
  'W': [
    "Work WH at the start when H is in play.",
    "Weigh WR as a rare but valid opener.",
    "Wedge W near vowels like A, O, or E for coverage.",
    "Wind up -OW and -EW endings when letters align.",
    "Waive double W unless clearly indicated.",
    "Widen tests by swapping W with V in similar shapes."
  ],
  'X': [
    "X often appears mid or end, as in -AXE, -EX, -OX.",
    "X pairs with E frequently in five-letter endings.",
    "Exclude X early unless hints point there.",
    "Explore swaps where KS might replace X in sound.",
    "Extend checks with -NEXT, -EXIT style frames if letters match.",
    "Expect few starters with X, so try mid placements first."
  ],
  'Y': [
    "Yield to Y as a vowel substitute at the end often.",
    "Yoke Y after consonants like CRY, FLY, DRY patterns.",
    "Yank Y into slot 2 or 3 to test vowel roles.",
    "Yacht-style endings -LY and -RY are common closures.",
    "Yodel through vowel swaps when I or E fail.",
    "Yearn for clarity by checking both start and end positions."
  ],
  'Z': [
    "Zero in on Z later unless feedback supports it.",
    "Zip Z next to vowels like A, O, or E for better fits.",
    "Zone endings like -IZE or -AZE when letters align.",
    "Zig between Z and S if the sound could be soft.",
    "Zoom Z into slot 2 or 3 to avoid weak starters.",
    "Zest up options with common words like ZEBRA or ZESTY to learn shapes."
  ]
};
