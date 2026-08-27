export const getBankName = (cardNumber: string): string => {
  const clean = cardNumber.replace(/\s/g, '');
  if (clean.length < 6) return '';
  const bin = clean.substring(0, 6);

  const binMap: Record<string, string> = {
    // Uzcard
    '860002': 'NBU',
    '860003': 'O\'zsanoatqurilishbank',
    '860004': 'Asakabank',
    '860005': 'Xalq Banki',
    '860006': 'Ipoteka-bank',
    '860011': 'Agrobank',
    '860012': 'Mikrokreditbank',
    '860013': 'Aloqabank',
    '860014': 'BRB',
    '860021': 'Trastbank',
    '860022': 'Turonbank',
    '860031': 'Ipak Yuli Banki',
    '860033': 'Hamkorbank',
    '860049': 'Kapitalbank',
    '860053': 'Ziraat Bank',
    '860057': 'Ipak Yuli Banki',

    // Humo
    '986001': 'O\'zsanoatqurilishbank',
    '986002': 'NBU',
    '986003': 'Ipoteka-bank',
    '986004': 'Xalq Banki',
    '986005': 'Asakabank',
    '986008': 'BRB',
    '986010': 'Aloqabank',
    '986011': 'Mikrokreditbank',
    '986013': 'Hamkorbank',
    '986014': 'Turonbank',
    '986015': 'Ipak Yuli Banki',
    '986016': 'Trastbank',
    '986022': 'Kapitalbank',
    '986025': 'TBC Bank',
    '986029': 'Anorbank',
    '986032': 'Tenge Bank',
    '986035': 'TBC Bank',
  };

  if (binMap[bin]) {
    return binMap[bin];
  }

  // Fallback
  if (clean.startsWith('8600')) return 'O\'zbekiston Banki';
  if (clean.startsWith('9860')) return 'O\'zbekiston Banki';
  if (clean.startsWith('4')) return 'Visa Card';
  if (clean.startsWith('5')) return 'Mastercard';

  return 'Bank nomi';
};

export const getBankColors = (bankName: string, defaultColors: any) => {
  const map: Record<string, any> = {
    'TBC Bank': {
      bg: 'bg-gradient-to-br from-[#00A3E0] to-[#0077b6] shadow-[0_20px_40px_rgba(0,163,224,0.2)]',
      text: 'text-white',
      textMuted: 'text-white/70',
      icon: 'text-white/80'
    },
    'Kapitalbank': {
      bg: 'bg-gradient-to-br from-[#1a1a1a] to-[#000000] shadow-[0_20px_40px_rgba(0,0,0,0.3)]',
      text: 'text-[#facc15]', // Yellow text for Kapitalbank
      textMuted: 'text-[#facc15]/70',
      icon: 'text-[#facc15]/80'
    },
    'NBU': {
      bg: 'bg-gradient-to-br from-[#0A346C] to-[#051e42] shadow-[0_20px_40px_rgba(10,52,108,0.2)]',
      text: 'text-white',
      textMuted: 'text-white/70',
      icon: 'text-white/80'
    },
    'O\'zsanoatqurilishbank': {
      bg: 'bg-gradient-to-br from-[#00965E] to-[#00663f] shadow-[0_20px_40px_rgba(0,150,94,0.2)]',
      text: 'text-white',
      textMuted: 'text-white/70',
      icon: 'text-white/80'
    },
    'Asakabank': {
      bg: 'bg-gradient-to-br from-[#D32F2F] to-[#9a0007] shadow-[0_20px_40px_rgba(211,47,47,0.2)]',
      text: 'text-white',
      textMuted: 'text-white/70',
      icon: 'text-white/80'
    },
    'Xalq Banki': {
      bg: 'bg-gradient-to-br from-[#007E33] to-[#004d1a] shadow-[0_20px_40px_rgba(0,126,51,0.2)]',
      text: 'text-white',
      textMuted: 'text-white/70',
      icon: 'text-white/80'
    },
    'Ipoteka-bank': {
      bg: 'bg-gradient-to-br from-[#004B87] to-[#002f56] shadow-[0_20px_40px_rgba(0,75,135,0.2)]',
      text: 'text-white',
      textMuted: 'text-white/70',
      icon: 'text-white/80'
    },
    'Agrobank': {
      bg: 'bg-gradient-to-br from-[#4CAF50] to-[#357a38] shadow-[0_20px_40px_rgba(76,175,80,0.2)]',
      text: 'text-white',
      textMuted: 'text-white/70',
      icon: 'text-white/80'
    },
    'Hamkorbank': {
      bg: 'bg-gradient-to-br from-[#FF9800] to-[#e65100] shadow-[0_20px_40px_rgba(255,152,0,0.2)]',
      text: 'text-white',
      textMuted: 'text-white/70',
      icon: 'text-white/80'
    },
    'Ipak Yuli Banki': {
      bg: 'bg-gradient-to-br from-[#1A237E] to-[#000051] shadow-[0_20px_40px_rgba(26,35,126,0.2)]',
      text: 'text-white',
      textMuted: 'text-white/70',
      icon: 'text-white/80'
    },
    'Anorbank': {
      bg: 'bg-gradient-to-br from-[#E0004D] to-[#9b0033] shadow-[0_20px_40px_rgba(224,0,77,0.2)]',
      text: 'text-white',
      textMuted: 'text-white/70',
      icon: 'text-white/80'
    }
  };

  return map[bankName] || defaultColors;
};
