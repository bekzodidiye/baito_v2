import { Job } from '../types';
import { Language } from '../translations';

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

interface DetailSet {
  tasks: string[];
  requirements: string[];
  warning: string;
}

const DETAILS_MAP: Record<string, Record<Language, DetailSet>> = {
  construction: {
    uz: {
      tasks: [
        "G'isht, gipsokarton va boshqa qurilish materiallarini tashish",
        "Qurilish qorishmalarini tayyorlash va yetkazib berish",
        "Ish tugagandan so'ng hududni tozalash va asboblarni yig'ish"
      ],
      requirements: [
        "Jismoniy baquvvat va chaqqon bo'lish",
        "Ish beruvchining ko'rsatmalariga aniq amal qilish",
        "Maxsus kiyim yoki qulay poyabzalda kelish"
      ],
      warning: "Qurilish qoidalariga va xavfsizlikka qat'iy rioya qiling. Bosh kiyim (kaska) kiyish tavsiya etiladi."
    },
    ru: {
      tasks: [
        "Переноска кирпича, гипсокартона и других строительных материалов",
        "Приготовление и доставка строительных растворов",
        "Уборка территории и сбор инструментов после работы"
      ],
      requirements: [
        "Физическая сила и ловкость",
        "Точное выполнение указаний работодателя",
        "Прибытие в специальной одежде или удобной обуви"
      ],
      warning: "Строго соблюдайте правила техники безопасности на стройке. Рекомендуется носить защитную каску."
    },
    en: {
      tasks: [
        "Carrying bricks, drywall, and other construction materials",
        "Preparing and delivering construction mortars",
        "Cleaning the area and collecting tools after completion"
      ],
      requirements: [
        "Physically strong and agile",
        "Strictly follow the instructions of the employer",
        "Arrive in special clothing or comfortable shoes"
      ],
      warning: "Strictly follow construction safety rules. Wearing a safety helmet is highly recommended."
    }
  },
  moving: {
    uz: {
      tasks: [
        "Mebel, qutilar va maishiy texnikalarni xonadondan tushirish",
        "Yuklarni yuk mashinasiga tartib bilan joylashtirish",
        "Yangi manzilda yuklarni ehtiyotkorlik bilan olib kirish"
      ],
      requirements: [
        "Ehtiyotkorlik va yuklarga zarar yetkazmaslik",
        "Og'ir yuk ko'tarishga jismoniy tayyorgarlik",
        "Jamoada tezkor va kelishib ishlash"
      ],
      warning: "Mebel va texnikalarni tirnab yoki shikastlab qo'ymaslik uchun o'ta ehtiyot bo'ling."
    },
    ru: {
      tasks: [
        "Спуск мебели, коробок и бытовой техники из квартиры",
        "Аккуратная укладка грузов в грузовой автомобиль",
        "Бережный занос грузов по новому адресу"
      ],
      requirements: [
        "Осторожность и бережное отношение к вещам",
        "Физическая готовность к подъему тяжестей",
        "Быстрая и слаженная работа в команде"
      ],
      warning: "Будьте предельно осторожны, чтобы не поцарапать и не повредить мебель и технику."
    },
    en: {
      tasks: [
        "Carrying furniture, boxes, and household appliances down from the apartment",
        "Carefully loading the goods into the truck in order",
        "Carefully carrying the goods in at the new address"
      ],
      requirements: [
        "Carefulness and preventing any damage to goods",
        "Physical readiness for heavy lifting",
        "Fast and coordinated teamwork"
      ],
      warning: "Be extremely careful not to scratch or damage furniture and appliances."
    }
  },
  cement: {
    uz: {
      tasks: [
        "Vagondan 50 kg lik sement qoplarini navbat bilan tushirish",
        "Qoplarni omborda ko'rsatilgan joyga tartib bilan taxlash",
        "Siniq yoki yirtilgan qoplar bo'lsa, ularni alohida ajratish"
      ],
      requirements: [
        "O'ta yuqori jismoniy chidamlilik",
        "Changdan himoyalanish uchun respirator yoki niqob taqish",
        "Ish jarayonida jarohat olmaslik uchun himoya qo'lqopi"
      ],
      warning: "Sement changi ko'z va nafas yo'llariga zarar yetkazmasligi uchun himoya vositalaridan foydalanish shart."
    },
    ru: {
      tasks: [
        "Разгрузка 50-килограммовых мешков с цементом из вагона",
        "Укладка мешков на складе в указанном порядке",
        "Сортировка поврежденных или порванных мешков"
      ],
      requirements: [
        "Очень высокая физическая выносливость",
        "Использование респиратора или маски для защиты от пыли",
        "Использование защитных перчаток во избежание травм"
      ],
      warning: "Обязательно используйте средства индивидуальной защиты, чтобы цементная пыль не повредила глаза и дыхательные пути."
    },
    en: {
      tasks: [
        "Unloading 50 kg cement bags from the wagon one by one",
        "Stacking the bags in order at the designated place in the warehouse",
        "Separating any broken or torn bags aside"
      ],
      requirements: [
        "Extremely high physical endurance",
        "Wearing a respirator or mask for protection against dust",
        "Protective gloves to avoid injuries during the process"
      ],
      warning: "It is mandatory to use protective equipment so that cement dust does not damage eyes and airways."
    }
  },
  harvest: {
    uz: {
      tasks: [
        "Ekinlar orasidan pishgan mevalarni ehtiyotkorlik bilan terish",
        "Saralab, maxsus plastik yoki yog'och yashiklarga joylash",
        "Zararlangan yoki chirigan mevalarni alohida chetga ajratish"
      ],
      requirements: [
        "Ehtiyotkorlik (mevalarni ezib qo'ymaslik lozim)",
        "Issiq haroratda uzoq vaqt ishlay olish qobiliyati",
        "Tezkorlik va chaqqon qo'llar"
      ],
      warning: "Daraxt va ekin shoxlarini sindirib qo'ymaslikka hamda saralash sifatiga jiddiy e'tibor bering."
    },
    ru: {
      tasks: [
        "Аккуратный сбор спелых плодов среди посадок",
        "Сортировка и укладка в специальные пластиковые или деревянные ящики",
        "Отбор поврежденных или подпорченных плодов в сторону"
      ],
      requirements: [
        "Бережность (нельзя давить плоды при сборе)",
        "Способность работать долгое время при высокой температуре",
        "Быстрота и ловкость рук"
      ],
      warning: "Уделите серьезное внимание качеству сортировки и старайтесь не ломать ветки деревьев и кустарников."
    },
    en: {
      tasks: [
        "Carefully picking ripe fruits from among the plants",
        "Sorting and packing them into special plastic or wooden crates",
        "Setting damaged or rotten fruits aside separately"
      ],
      requirements: [
        "Carefulness (do not crush the fruits)",
        "Ability to work for long hours in hot temperatures",
        "Speed and agile hands"
      ],
      warning: "Pay serious attention to the sorting quality and take care not to break tree or crop branches."
    }
  },
  cleaning: {
    uz: {
      tasks: [
        "Hovli hududidagi begona o'tlarni tozalash va sug'orish",
        "Butalgan daraxt shoxlarini yig'ish va mashinaga ortish",
        "Yo'laklar va hovli maydonini supirib, tartibga keltirish"
      ],
      requirements: [
        "Bog'dorchilik asboblari bilan ishlash tajribasi",
        "Chaqqonlik va tozalikka e'tiborlilik",
        "Qo'lqop va qulay kiyimda kelish"
      ],
      warning: "Daraxt shoxlarini arralashda o'ta ehtiyot bo'ling va elektr simlariga tegmang."
    },
    ru: {
      tasks: [
        "Прополка сорняков на территории двора и полив",
        "Сбор обрезанных веток деревьев и погрузка в машину",
        "Подметание дорожек и приведение в порядок дворовой зоны"
      ],
      requirements: [
        "Опыт работы с садовыми инструментами",
        "Расторопность и внимание к чистоте",
        "Прибытие в перчатках и удобной одежде"
      ],
      warning: "Будьте предельно осторожны при обрезке веток и не задевайте электрические провода."
    },
    en: {
      tasks: [
        "Weeding and watering the garden yard area",
        "Collecting pruned tree branches and loading them into the truck",
        "Sweeping and organizing walkways and the yard space"
      ],
      requirements: [
        "Experience working with gardening tools",
        "Agility and attention to cleanliness",
        "Arrive with gloves and in comfortable clothes"
      ],
      warning: "Be extremely careful when sawing tree branches and do not touch any electrical wires."
    }
  },
  furniture: {
    uz: {
      tasks: [
        "Mebel detallarini tushirish va usta aytgan xonaga kiritish",
        "Ustaga asboblarni uzatib turish va mebel qismlarini ushlab turish",
        "Tayyor bo'lgan mebellarni tozalash va qutilarini yig'ishtirish"
      ],
      requirements: [
        "Asboblar bilan ishlash bo'yicha boshlang'ich tushuncha",
        "Diqqat bilan ko'rsatmalarni bajarish",
        "Xushmuomalalik va usta bilan kelishuv"
      ],
      warning: "Mebel yuzalarini o'tkir asboblar bilan tirnab yuborishdan ehtiyot bo'ling."
    },
    ru: {
      tasks: [
        "Разгрузка мебельных деталей и занос в указанную мастером комнату",
        "Подача инструментов мастеру и удержание элементов мебели",
        "Протирка готовой мебели и уборка упаковочных коробок"
      ],
      requirements: [
        "Базовое понимание работы с ручным инструментом",
        "Внимательное выполнение всех указаний",
        "Вежливость и умение работать в контакте с мастером"
      ],
      warning: "Остерегайтесь появления царапин на поверхностях мебели при использовании острых инструментов."
    },
    en: {
      tasks: [
        "Unloading furniture parts and bringing them to the room specified by the master",
        "Handing tools to the master and holding furniture parts in place",
        "Cleaning the assembled furniture and tidying up boxes"
      ],
      requirements: [
        "Basic understanding of working with tools",
        "Following instructions carefully",
        "Politeness and agreement with the master"
      ],
      warning: "Be careful not to scratch the furniture surfaces with sharp tools."
    }
  },
  digging: {
    uz: {
      tasks: [
        "Belgilangan chiziq bo'ylab kerakli chuqurlikda ariq qazish",
        "Kabel yotqizish jarayonida simlarni tekislash va yordam berish",
        "Kabel ustidan qum va tuproq tortib, qayta ko'mib silliqlash"
      ],
      requirements: [
        "Kurak va ketmon bilan ishlashga jismoniy tayyorgarlik",
        "Kabel liniyalariga shikast yetkazmaslik uchun ehtiyotkorlik",
        "Sariq nimcha yoki maxsus kiyimda ishlash"
      ],
      warning: "Er ostidagi boshqa aloqa yoki gaz quvurlariga duch kelsangiz, darhol ishni to'xtatib xabar bering."
    },
    ru: {
      tasks: [
        "Копка траншеи нужной глубины по размеченной линии",
        "Выравнивание кабеля и помощь в процессе его укладки",
        "Засыпка траншеи песком и грунтом с последующим разравниванием"
      ],
      requirements: [
        "Физическая готовность к работе лопатой и кетменем",
        "Предельная аккуратность во избежание повреждения кабельных линий",
        "Работа в сигнальном жилете или специальной одежде"
      ],
      warning: "Если вы обнаружите другие подземные коммуникации или газовые трубы, немедленно прекратите работу и сообщите руководителю."
    },
    en: {
      tasks: [
        "Digging a trench to the required depth along the marked line",
        "Straightening cables and assisting during the cable laying process",
        "Filling the trench back with sand and soil and smoothing it over"
      ],
      requirements: [
        "Physical readiness to work with a shovel and pickaxe",
        "Carefulness to avoid any damage to cable lines",
        "Working in a yellow vest or special clothing"
      ],
      warning: "If you encounter any other underground communication or gas pipes, stop working immediately and report it."
    }
  },
  banquet: {
    uz: {
      tasks: [
        "To'y tugagandan keyin stollardagi qolgan idishlarni yig'ish",
        "Dasturxonlarni almashtirish va stullarni tartibga keltirish",
        "Zaldagi chiqindilarni yig'ib, umumiy tozalikka yordamlashish"
      ],
      requirements: [
        "Xushmuomalalik va jamoada tezkor harakat qilish",
        "Idishlarni sindirmaslik uchun ehtiyotkorlik",
        "Kechki yoki tungi smenada ishlay olish"
      ],
      warning: "Chinni va shisha idishlarni tashishda sinish xavfi yuqoriligi bois o'ta ehtiyotkor bo'ling."
    },
    ru: {
      tasks: [
        "Сбор оставшейся посуды со столов после завершения свадьбы",
        "Замена скатертей и расстановка стульев по местам",
        "Сбор мусора в зале и помощь в генеральной уборке"
      ],
      requirements: [
        "Вежливость и способность двигаться очень быстро в команде",
        "Аккуратность во избежание боя посуды",
        "Возможность работать в вечернюю или ночную смену"
      ],
      warning: "Будьте предельно аккуратны при переноске фарфоровой и стеклянной посуды во избежание боя."
    },
    en: {
      tasks: [
        "Collecting remaining dishes from tables after the wedding party ends",
        "Replacing tablecloths and arranging chairs in order",
        "Collecting trash in the hall and helping with general cleaning"
      ],
      requirements: [
        "Politeness and fast action in a team",
        "Carefulness not to break any dishes",
        "Ability to work evening or night shifts"
      ],
      warning: "Be extremely careful when carrying porcelain and glassware, as there is a high risk of breakage."
    }
  },
  restaurant: {
    uz: {
      tasks: [
        "Katta qozon, tova va laganlarni maxsus vositalar bilan yuvish",
        "Yuvilgan idishlarni quriting va javonlarga tartib bilan taxlang",
        "Oshxona pol qismini supirib-sidirish va chiqindilarni tozalash"
      ],
      requirements: [
        "Idishlarni toza va gigiyena qoidalariga mos yuvish",
        "Ishchanlik va nam muhitda uzoq tura olish",
        "Mas'uliyatlilik va tezkorlik"
      ],
      warning: "Issiq suv va kimyoviy yuvish vositalaridan foydalanishda qo'llaringizni himoyalang."
    },
    ru: {
      tasks: [
        "Мытье больших кастрюль, сковород и блюд специальными средствами",
        "Сушка вымытой посуды и ее расстановка по полкам в порядке",
        "Подметание и мытье полов на кухне, вынос отходов"
      ],
      requirements: [
        "Мытье посуды до блеска и соблюдение правил гигиены",
        "Трудолюбие и способность долго находиться во влажной среде",
        "Ответственность и скорость"
      ],
      warning: "Защищайте руки при работе с горячей водой и химическими моющими средствами."
    },
    en: {
      tasks: [
        "Washing large pots, pans, and platters with special detergents",
        "Drying washed dishes and stacking them neatly on shelves",
        "Sweeping and mopping the kitchen floor and clearing waste"
      ],
      requirements: [
        "Washing dishes cleanly according to hygiene rules",
        "Diligence and ability to stand in a humid environment for a long time",
        "Responsibility and speed"
      ],
      warning: "Protect your hands when using hot water and chemical cleaning agents."
    }
  },
  default: {
    uz: {
      tasks: [
        "Yuklarni qabul qilish, saralash va belgilangan joyga joylash",
        "Ombor ichida mahsulotlarni xavfsiz tashish va ortish",
        "Inventarizatsiya jarayonida hisob-kitobga yordam berish"
      ],
      requirements: [
        "Jismoniy baquvvat va chaqqon bo'lishi lozim",
        "Mas'uliyatlilik, aniqlik va jamoaviy intizom",
        "Ish tugagach hisob-kitobni to'g'ri topshirish"
      ],
      warning: "Xavfsizlik qoidalariga qat'iy amal qiling. Ish joyida maxsus himoya poyabzalida bo'lish shart."
    },
    ru: {
      tasks: [
        "Прием, сортировка и размещение грузов на указанные места",
        "Безопасная переноска и погрузка товаров внутри склада",
        "Помощь в ведении учета в процессе инвентаризации"
      ],
      requirements: [
        "Физическая сила и высокая активность",
        "Ответственность, точность и командная дисциплина",
        "Сдача правильного отчета после завершения работы"
      ],
      warning: "Строго соблюдайте правила техники безопасности. На рабочем месте обязательно находиться в защитной обуви."
    },
    en: {
      tasks: [
        "Receiving, sorting, and placing goods in designated areas",
        "Safely transporting and loading products inside the warehouse",
        "Assisting in counting and record-keeping during inventory"
      ],
      requirements: [
        "Must be physically strong and agile",
        "Responsibility, accuracy, and team discipline",
        "Accurately handing over records after work is finished"
      ],
      warning: "Strictly follow safety guidelines. Wearing special protective safety shoes is mandatory at the workplace."
    }
  }
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
