import { Job } from '../types';
import { Language } from '../translations';
import { DETAILS_MAP, DetailSet } from '../data/jobDetailsMap';

export const getJobHeroImage = (job: Job): string => {
  const lower = job.title.toLowerCase();
  if (lower.includes('qurilish') || lower.includes('строитель') || lower.includes('construction')) {
    return 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=600&auto=format&fit=crop&q=80';
  }
  if (lower.includes('ko\'chirish') || lower.includes('tashuvchi') || lower.includes('грузчик') || lower.includes('mover') || lower.includes('moving')) {
    return 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&auto=format&fit=crop&q=80';
  }
  if (lower.includes('sement') || lower.includes('vagon') || lower.includes('цемент')) {
    return 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&auto=format&fit=crop&q=80';
  }
  if (lower.includes('pomidor') || lower.includes('terish') || lower.includes('сбор') || lower.includes('pick') || lower.includes('tomato')) {
    return 'https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?w=600&auto=format&fit=crop&q=80';
  }
  if (lower.includes('tozalash') || lower.includes('butash') || lower.includes('hovli') || lower.includes('уборка') || lower.includes('cleaning')) {
    return 'https://images.unsplash.com/photo-1592150621744-aca64f48394a?w=600&auto=format&fit=crop&q=80';
  }
  if (lower.includes('mebel') || lower.includes('yig\'ish') || lower.includes('мебель') || lower.includes('furniture')) {
    return 'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=600&auto=format&fit=crop&q=80';
  }
  if (lower.includes('ariq') || lower.includes('kabel') || lower.includes('qazish') || lower.includes('транше') || lower.includes('trench')) {
    return 'https://images.unsplash.com/photo-1508450859948-4e04f9ad5657?w=600&auto=format&fit=crop&q=80';
  }
  if (lower.includes('to\'yxona') || lower.includes('idish') || lower.includes('stol') || lower.includes('банкет') || lower.includes('banquet') || lower.includes('dish')) {
    return 'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?w=600&auto=format&fit=crop&q=80';
  }
  if (lower.includes('restoran') || lower.includes('yuvish') || lower.includes('ресторан') || lower.includes('restaurant')) {
    return 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&auto=format&fit=crop&q=80';
  }
  if (lower.includes('gilos') || lower.includes('o\'rik') || lower.includes('bog\'') || lower.includes('черешн') || lower.includes('cherry')) {
    return 'https://images.unsplash.com/photo-1559181567-c3190ca9959b?w=600&auto=format&fit=crop&q=80';
  }
  return job.logoUrl || 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=600&auto=format&fit=crop&q=80';
};

export const getJobDetails = (title: string, lang: Language): DetailSet => {
  const lower = title.toLowerCase();
  
  let category = 'default';
  
  if (lower.includes('qurilish') || lower.includes('строитель') || lower.includes('construction') || lower.includes('usta') || lower.includes('мастер') || lower.includes('builder')) {
    category = 'construction';
  } else if (lower.includes('sement') || lower.includes('vagon') || lower.includes('цемент') || lower.includes('cement') || lower.includes('wagon')) {
    category = 'cement';
  } else if (lower.includes('ko\'chirish') || lower.includes('tashuvchi') || lower.includes('грузчик') || lower.includes('переезд') || lower.includes('mover') || lower.includes('moving') || lower.includes('yuk') || lower.includes('груз')) {
    category = 'moving';
  } else if (lower.includes('pomidor') || lower.includes('terish') || lower.includes('сбор') || lower.includes('черешн') || lower.includes('абрикос') || lower.includes('теплиц') || lower.includes('сад') || lower.includes('tomato') || lower.includes('pick') || lower.includes('cherry') || lower.includes('apricot') || lower.includes('greenhouse') || lower.includes('garden') || lower.includes('gilos') || lower.includes('o\'rik') || lower.includes('bog\'')) {
    category = 'harvest';
  } else if (lower.includes('tozalash') || lower.includes('butash') || lower.includes('hovli') || lower.includes('уборка') || lower.includes('обрезка') || lower.includes('двор') || lower.includes('cleaning') || lower.includes('yard') || lower.includes('pruning')) {
    category = 'cleaning';
  } else if (lower.includes('mebel') || lower.includes('мебель') || lower.includes('furniture') || lower.includes('assembly')) {
    category = 'furniture';
  } else if (lower.includes('ariq') || lower.includes('kabel') || lower.includes('qazish') || lower.includes('транше') || lower.includes('копка') || lower.includes('trench') || lower.includes('cable') || lower.includes('digging')) {
    category = 'digging';
  } else if (lower.includes('to\'yxona') || lower.includes('idish') || lower.includes('stol') || lower.includes('банкет') || lower.includes('свадьб') || lower.includes('посуд') || lower.includes('banquet') || lower.includes('dish') || lower.includes('wedding') || lower.includes('table')) {
    category = 'banquet';
  } else if (lower.includes('restoran') || lower.includes('yuvish') || lower.includes('ресторан') || lower.includes('мытье') || lower.includes('restaurant') || lower.includes('washing')) {
    category = 'restaurant';
  }

  const set = DETAILS_MAP[category] || DETAILS_MAP.default;
  return set[lang] || set.uz;
};
