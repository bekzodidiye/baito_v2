export interface TemplateDef {
  title: (distUz: string) => string;
  titleRu: (distRu: string) => string;
  titleEn: (distEn: string) => string;
  company: string;
  companyRu: string;
  companyEn: string;
  logoUrl: string;
  salary: string;
  salaryRu: string;
  salaryEn: string;
  tags: string[];
  tagsRu: string[];
  tagsEn: string[];
  description: (distUz: string) => string;
  descriptionRu: (distRu: string) => string;
  descriptionEn: (distEn: string) => string;
  hourlyRate: string;
  transportRate: string;
  transportRateRu: string;
  transportRateEn: string;
  durationLabel: string;
  durationLabelRu: string;
  durationLabelEn: string;
}

export const TEMPLATES: TemplateDef[] = [
  {
    title: (d) => `${d} markazida qurilish yordamchisi`,
    titleRu: (d) => `Помощник строителя в центре ${d}`,
    titleEn: (d) => `Assistant builder in the center of ${d}`,
    company: "Yangi Asr Qurilish",
    companyRu: "Янги Аср Курилиш",
    companyEn: "Yangi Asr Construction",
    logoUrl: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=100&auto=format&fit=crop&q=60",
    salary: "200 000 so'm / kunlik",
    salaryRu: "200 000 сум / в день",
    salaryEn: "200,000 UZS / daily",
    tags: ["1 kunlik", "Jismoniy ish", "Tushlik bor"],
    tagsRu: ["1 день", "Физический труд", "Обед есть"],
    tagsEn: ["1 day", "Physical labor", "Lunch provided"],
    description: (d) => `${d} hududida barpo etilayotgan zamonaviy bino qurilish maydonchasida yuk tashish, g'isht taxlash va tozalash ishlariga chaqqon yigitlar kerak. Tushlik bepul va juda mazali.`,
    descriptionRu: (d) => `На строительную площадку современного здания в районе ${d} требуются активные ребята для переноски грузов, укладки кирпича и уборки. Обед бесплатный и сытный.`,
    descriptionEn: (d) => `Active young men are needed for cargo transport, brick stacking, and cleanup at a modern building construction site in ${d}. Lunch is free and delicious.`,
    hourlyRate: "25 000",
    transportRate: "15 000",
    transportRateRu: "15 000",
    transportRateEn: "15,000",
    durationLabel: "1 kunlik",
    durationLabelRu: "1 день",
    durationLabelEn: "1 day"
  },
  {
    title: (d) => `${d} bog'larida meva saralash va terish`,
    titleRu: (d) => `Сбор и сортировка фруктов в садах ${d}`,
    titleEn: (d) => `Fruit picking and sorting in the orchards of ${d}`,
    company: "Eko-Boqqa Agro",
    companyRu: "Эко-Бокка Агро",
    companyEn: "Eko-Boqqa Agro",
    logoUrl: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=100&auto=format&fit=crop&q=60",
    salary: "150 000 so'm / kunlik",
    salaryRu: "150 000 сум / в день",
    salaryEn: "150,000 UZS / daily",
    tags: ["3 kunlik", "Yengil ish", "Mavsumiy"],
    tagsRu: ["3 дня", "Легкая работа", "Сезонная"],
    tagsEn: ["3 days", "Easy work", "Seasonal"],
    description: (d) => `${d} tumanidagi unumdor mevali bog'larda pishgan mevalarni ehtiyotkorlik bilan terish, saralash va eksport qutilariga qadoqlash. Ish juda oson va toza havoda o'tadi.`,
    descriptionRu: (d) => `Аккуратный сбор спелых фруктов в живописных садах в районе ${d}, сортировка и бережная упаковка в экспортные ящики. Работа легкая, проходит на свежем воздухе.`,
    descriptionEn: (d) => `Careful picking of ripe fruits in the fertile orchards of ${d}, sorting and packing them into export boxes. The work is simple and takes place outdoors.`,
    hourlyRate: "18 750",
    transportRate: "Yo'q",
    transportRateRu: "Нет",
    transportRateEn: "No",
    durationLabel: "3 kunlik",
    durationLabelRu: "3 дня",
    durationLabelEn: "3 days"
  },
  {
    title: (d) => `${d} milliy taomlar oshxonasida ko'makchi`,
    titleRu: (d) => `Помощник на кухне национальной кухни в ${d}`,
    titleEn: (d) => `Assistant at Uzbek national restaurant in ${d}`,
    company: "Lazzat Milliy Taomlari",
    companyRu: "Лаззат Миллий Таомлари",
    companyEn: "Lazzat Restaurant",
    logoUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=100&auto=format&fit=crop&q=60",
    salary: "180 000 so'm / kunlik",
    salaryRu: "180 000 сум / в день",
    salaryEn: "180,000 UZS / daily",
    tags: ["2 kunlik", "Tushlik bor", "Smenali grafik"],
    tagsRu: ["2 дня", "Обед есть", "Сменный график"],
    tagsEn: ["2 days", "Lunch provided", "Shift schedule"],
    description: (d) => `${d} tumanidagi gavjum va mashhur milliy taomlar restoranida idishlarni yuvish, sabzavotlarni tozalash hamda zallarni tartibga keltirish uchun yordamchi ishchi lozim.`,
    descriptionRu: (d) => `В оживленный ресторан национальной кухни в районе ${d} требуется помощник для мытья посуды, чистки овощей и поддержания порядка в залах.`,
    descriptionEn: (d) => `An assistant is needed in a busy and popular national food restaurant in ${d} to wash dishes, peel vegetables, and keep the dining halls tidy.`,
    hourlyRate: "22 500",
    transportRate: "10 000",
    transportRateRu: "10 000",
    transportRateEn: "10,000",
    durationLabel: "2 kunlik",
    durationLabelRu: "2 дня",
    durationLabelEn: "2 days"
  },
  {
    title: (d) => `${d} ulgurji omborida yuk taxlovchi`,
    titleRu: (d) => `Грузчик на оптовом складе в ${d}`,
    titleEn: (d) => `Warehouse stacker in wholesale depot of ${d}`,
    company: "Zamin Logistika",
    companyRu: "Замин Логистика",
    companyEn: "Zamin Logistics",
    logoUrl: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=100&auto=format&fit=crop&q=60",
    salary: "240 000 so'm / kunlik",
    salaryRu: "240 000 сум / в день",
    salaryEn: "240,000 UZS / daily",
    tags: ["1 kunlik", "Jismoniy ish", "Shoshilinch"],
    tagsRu: ["1 день", "Физический труд", "Срочно"],
    tagsEn: ["1 day", "Physical labor", "Urgent"],
    description: (d) => `${d} tumanidagi ulgurji savdo omborida yangi kelgan yuklarni yuk mashinalaridan tushirish, qutilarni sanash va peshtaxtalarga chiroyli taxlash ishi. To'lov o'sha kuniyoq naqd.`,
    descriptionRu: (d) => `Разгрузка новых поступлений из грузовых машин на оптовом складе в районе ${d}, подсчет коробок и аккуратная расстановка по полкам. Оплата в тот же день наличными.`,
    descriptionEn: (d) => `Unloading new arrivals from trucks at a wholesale trade warehouse in ${d}, counting boxes, and stacking them neatly. Payment is cash on the same day.`,
    hourlyRate: "30 000",
    transportRate: "Yo'q",
    transportRateRu: "Нет",
    transportRateEn: "No",
    durationLabel: "1 kunlik",
    durationLabelRu: "1 день",
    durationLabelEn: "1 day"
  },
  {
    title: (d) => `${d}da zamonaviy ofis tozalovchisi`,
    titleRu: (d) => `Уборщик в современном офисе в ${d}`,
    titleEn: (d) => `Modern office cleaner in ${d}`,
    company: "Toza Makon Servis",
    companyRu: "Тоза Макон Сервис",
    companyEn: "Clean Space Service",
    logoUrl: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=100&auto=format&fit=crop&q=60",
    salary: "140 000 so'm / kunlik",
    salaryRu: "140 000 сум / в день",
    salaryEn: "140,000 UZS / daily",
    tags: ["4 soatlik", "Yengil ish", "Kechki ish"],
    tagsRu: ["4 часа", "Легкая работа", "Вечерняя"],
    tagsEn: ["4 hours", "Easy work", "Evening work"],
    description: (d) => `${d} markazidagi zamonaviy yangi ofis binosida pollarni tozalash, derazalarni artish va chiqindilarni almashtirish uchun ozoda va mas'uliyatli xodim kerak.`,
    descriptionRu: (d) => `В новое современное офисное здание в центре ${d} требуется аккуратный и ответственный сотрудник для мытья полов, протирания стекол и выноса мусора.`,
    descriptionEn: (d) => `A tidy and responsible cleaner is wanted to wash floors, wipe windows, and empty bins at a brand-new modern office building in the center of ${d}.`,
    hourlyRate: "35 000",
    transportRate: "Yo'q",
    transportRateRu: "Нет",
    transportRateEn: "No",
    durationLabel: "Yarim kun",
    durationLabelRu: "Полдня",
    durationLabelEn: "Half day"
  },
  {
    title: (d) => `${d}da yangi ochilgan kafelar uchun promoter`,
    titleRu: (d) => `Промоутер для новых кафе в ${d}`,
    titleEn: (d) => `Flyer promoter for new cafes in ${d}`,
    company: "Vodiy Media Reklama",
    companyRu: "Водий Медиа Реклама",
    companyEn: "Vodiy Media Advertising",
    logoUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=100&auto=format&fit=crop&q=60",
    salary: "130 000 so'm / kunlik",
    salaryRu: "130 000 сум / в день",
    salaryEn: "130,000 UZS / daily",
    tags: ["5 soatlik", "Xushmuomalalik", "Erkin grafik"],
    tagsRu: ["5 часов", "Общительность", "Свободный график"],
    tagsEn: ["5 hours", "Politeness", "Free schedule"],
    description: (d) => `${d} shahrining eng gavjum qismlarida va xiyobonlarida yangi ochilgan kafe hamda restoran varaqalarini (flayer) o'tkinchilarga chiroyli tabassum bilan tarqatish ishi.`,
    descriptionRu: (d) => `Раздача рекламных листовок (флаеров) прохожим с улыбкой в самых оживленных местах и скверах города ${d} для привлечения первых гостей в новое кафе.`,
    descriptionEn: (d) => `Distributing promotional flyers to passersby with a warm smile in the busiest areas and parks of ${d} to welcome visitors to a newly opened cafe.`,
    hourlyRate: "26 000",
    transportRate: "Yo'q",
    transportRateRu: "Нет",
    transportRateEn: "No",
    durationLabel: "Yarim kun",
    durationLabelRu: "Полдня",
    durationLabelEn: "Half day"
  },
  {
    title: (d) => `${d} mehmonxonasida xizmatchi ko'makchi`,
    titleRu: (d) => `Помощник горничной в отеле в ${d}`,
    titleEn: (d) => `Housekeeping helper at hotel in ${d}`,
    company: "Silk Road Plaza",
    companyRu: "Силк Роад Плаза",
    companyEn: "Silk Road Plaza",
    logoUrl: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=100&auto=format&fit=crop&q=60",
    salary: "190 000 so'm / kunlik",
    salaryRu: "190 000 сум / в день",
    salaryEn: "190,000 UZS / daily",
    tags: ["2 kunlik", "Smenali grafik", "Konditsionerli bino"],
    tagsRu: ["2 дня", "Сменный график", "Здание с кондиц."],
    tagsEn: ["2 days", "Shift schedule", "Air conditioned"],
    description: (d) => `${d} tumanidagi sayyohlik mehmonxonasida xonalarni yig'ishtirish, choyshablarni almashtirish hamda gigiyena vositalarini joy-joyiga qo'yishda asosiy xodimga ko'maklashish.`,
    descriptionRu: (d) => `Помощь горничной в уборке комнат, замене постельного белья и расстановке средств гигиены в туристическом отеле в районе ${d}.`,
    descriptionEn: (d) => `Assisting the primary housekeeper with tidying rooms, changing sheets, and restocking toiletries in a tourist hotel located in ${d}.`,
    hourlyRate: "23 750",
    transportRate: "15 000",
    transportRateRu: "15 000",
    transportRateEn: "15,000",
    durationLabel: "2 kunlik",
    durationLabelRu: "2 дня",
    durationLabelEn: "2 days"
  },
  {
    title: (d) => `${d} gidroponika issiqxonasida ishchi`,
    titleRu: (d) => `Работник в гидропонной теплице в ${d}`,
    titleEn: (d) => `Hydroponic greenhouse worker in ${d}`,
    company: "Zamin Agro-Guruh",
    companyRu: "Замин Агро-Гурух",
    companyEn: "Zamin Agro-Group",
    logoUrl: "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=100&auto=format&fit=crop&q=60",
    salary: "170 000 so'm / kunlik",
    salaryRu: "170 000 сум / в день",
    salaryEn: "170,000 UZS / daily",
    tags: ["3 kunlik", "Tushlik bor", "Mavsumiy"],
    tagsRu: ["3 дня", "Обед есть", "Сезонная"],
    tagsEn: ["3 days", "Lunch provided", "Seasonal"],
    description: (d) => `${d} tumanidagi zamonaviy gidroponika issiqxonasida pomidor, bodring va ko'katlarni parvarishlash, barglarni kesish hamda hosilni terishga mas'uliyatli yordamchilar kerak.`,
    descriptionRu: (d) => `В современную гидропонную теплицу в районе ${d} требуются ответственные работники для ухода за томатами, огурцами и зеленью, обрезки листьев и сбора урожая.`,
    descriptionEn: (d) => `Responsible helpers are required for vegetable care, leaf trimming, and harvesting at a modern hydroponic greenhouse in the ${d} area.`,
    hourlyRate: "21 250",
    transportRate: "10 000",
    transportRateRu: "10 000",
    transportRateEn: "10,000",
    durationLabel: "3 kunlik",
    durationLabelRu: "3 дня",
    durationLabelEn: "3 days"
  }
];
