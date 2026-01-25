// Tennis umpire translations - verified authentic tennis terminology
export const translations = {
  en: {
    // Points
    love: 'love',
    fifteen: 'fifteen',
    thirty: 'thirty',
    forty: 'forty',
    all: 'all',
    
    // Game states
    deuce: 'Deuce',
    advantage: 'Advantage',
    
    // Announcements
    game: 'Game',
    set: 'Set',
    gameAndSet: 'Game and set',
    gameSetMatch: 'Game, set and match',
    wins: 'wins',
    leads: 'leads',
    gamesTo: 'games to',
    gamesAll: 'games all',
    
    // Match/Set point
    matchPoint: 'Match point',
    setPoint: 'Set point',
    gamePoint: 'Game point',
    
    // Serve
    toServe: 'to serve',
    time: 'Time',
    
    // Breaks
    changeover: 'Changeover',
    playersChangeSides: 'Players change sides',
    changeOfEnds: 'Change of ends',
    setBreak: 'Set break',
    twoMinuteBreak: 'Two minute break',
    seconds: 'seconds',
    
    // Tiebreak
    tiebreak: 'Tiebreak',
    superTiebreak: 'Match tiebreak, first to ten',
    
    // Match start
    versus: 'versus',
  },
  
  es: {
    // Points - standard Spanish tennis scoring
    love: 'cero',
    fifteen: 'quince',
    thirty: 'treinta',
    forty: 'cuarenta',
    all: 'iguales',
    
    // Game states
    deuce: 'Iguales',
    advantage: 'Ventaja',
    
    // Announcements
    game: 'Juego',
    set: 'Set',
    gameAndSet: 'Juego y set',
    gameSetMatch: 'Juego, set y partido',
    wins: 'gana',
    leads: 'gana',
    gamesTo: 'juegos a',
    gamesAll: 'juegos iguales',
    
    // Match/Set point - authentic Spanish tennis terms
    matchPoint: 'Bola de partido',
    setPoint: 'Bola de set',
    gamePoint: 'Bola de juego',
    
    // Serve
    toServe: 'al servicio',
    time: 'Tiempo',
    
    // Breaks
    changeover: 'Cambio de lado',
    playersChangeSides: 'Los jugadores cambian de lado',
    changeOfEnds: 'Cambio de lado',
    setBreak: 'Descanso de set',
    twoMinuteBreak: 'Dos minutos de descanso',
    seconds: 'segundos',
    
    // Tiebreak - "Muerte súbita" or "Tiebreak" both used
    tiebreak: 'Muerte súbita',
    superTiebreak: 'Super tiebreak, el primero a diez',
    
    // Match start
    versus: 'contra',
  },
  
  fr: {
    // Points - standard French tennis scoring
    love: 'zéro',
    fifteen: 'quinze',
    thirty: 'trente',
    forty: 'quarante',
    all: 'partout',
    
    // Game states
    deuce: 'Égalité',
    advantage: 'Avantage',
    
    // Announcements
    game: 'Jeu',
    set: 'Set',
    gameAndSet: 'Jeu et set',
    gameSetMatch: 'Jeu, set et match',
    wins: 'gagne',
    leads: 'mène',
    gamesTo: 'jeux à',
    gamesAll: 'jeux partout',
    
    // Match/Set point - authentic French tennis terms
    matchPoint: 'Balle de match',
    setPoint: 'Balle de set',
    gamePoint: 'Balle de jeu',
    
    // Serve
    toServe: 'au service',
    time: 'Temps',
    
    // Breaks
    changeover: 'Changement de côté',
    playersChangeSides: 'Les joueurs changent de côté',
    changeOfEnds: 'Changement de côté',
    setBreak: 'Pause entre les sets',
    twoMinuteBreak: 'Deux minutes de pause',
    seconds: 'secondes',
    
    // Tiebreak - French term
    tiebreak: 'Jeu décisif',
    superTiebreak: 'Super jeu décisif, premier à dix',
    
    // Match start
    versus: 'contre',
  },
  
  it: {
    // Points - standard Italian tennis scoring
    love: 'zero',
    fifteen: 'quindici',
    thirty: 'trenta',
    forty: 'quaranta',
    all: 'pari',
    
    // Game states
    deuce: 'Parità',
    advantage: 'Vantaggio',
    
    // Announcements
    game: 'Gioco',
    set: 'Set',
    gameAndSet: 'Gioco e set',
    gameSetMatch: 'Gioco, set e partita',
    wins: 'vince',
    leads: 'conduce',
    gamesTo: 'giochi a',
    gamesAll: 'giochi pari',
    
    // Match/Set point - authentic Italian tennis terms
    matchPoint: 'Palla match',
    setPoint: 'Palla set',
    gamePoint: 'Palla gioco',
    
    // Serve
    toServe: 'al servizio',
    time: 'Tempo',
    
    // Breaks
    changeover: 'Cambio di campo',
    playersChangeSides: 'I giocatori cambiano campo',
    changeOfEnds: 'Cambio di campo',
    setBreak: 'Pausa tra i set',
    twoMinuteBreak: 'Due minuti di pausa',
    seconds: 'secondi',
    
    // Tiebreak - commonly used in Italian
    tiebreak: 'Tiebreak',
    superTiebreak: 'Super tiebreak, primo a dieci',
    
    // Match start
    versus: 'contro',
  },
};

export type TranslationKey = keyof typeof translations.en;
export type LanguageCode = keyof typeof translations;

export function t(key: TranslationKey, lang: LanguageCode = 'en'): string {
  return translations[lang]?.[key] || translations.en[key] || key;
}
