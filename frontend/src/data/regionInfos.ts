export interface RegionInfo {
  id: string;
  districtsUz: string[];
  districtsRu: string[];
  districtsEn: string[];
}

export const REGION_INFOS: RegionInfo[] = [
  {
    id: "Samarqand",
    districtsUz: [
      "Samarqand shahri", "Urgut tumani", "Pastdarg'om tumani", "Toyloq tumani", 
      "Bulung'ur tumani", "Ishtixon tumani", "Jomboy tumani", "Payariq tumani", 
      "Qo'shrabot tumani", "Oqdaryo tumani", "Nurobod tumani", "Paxtachi tumani", 
      "Narpay tumani", "Kattaqo'rg'on tumani", "Kattaqo'rg'on shahri", "Samarqand tumani"
    ],
    districtsRu: [
      "г. Самарканд", "Ургутский район", "Пастдаргомский район", "Тайлакский район", 
      "Булунгурский район", "Иштыханский район", "Джамбайский район", "Пайарыкский район", 
      "Кошрабадский район", "Акдарьинский район", "Нурабадский район", "Пахтачийский район", 
      "Нарпайский район", "Каттакурганский район", "г. Каттакурган", "Самаркандский район"
    ],
    districtsEn: [
      "Samarkand city", "Urgut district", "Pastdargom district", "Taylak district", 
      "Bulungur district", "Ishtikhon district", "Jomboy district", "Payariq district", 
      "Koshrabot district", "Oqdaryo district", "Nurabad district", "Pakhtachi district", 
      "Narpay district", "Kattakurgan district", "Kattakurgan city", "Samarkand district"
    ]
  },
  {
    id: "Buxoro",
    districtsUz: [
      "Buxoro shahri", "G'ijduvon tumani", "Qorako'l tumani", "Kogon tumani", 
      "Shofirkon tumani", "Vobkent tumani", "Olot tumani", "Peshku tumani", 
      "Qorovulbozor tumani", "Jondor tumani", "Buxoro tumani", "Romitan tumani", "Kogon shahri"
    ],
    districtsRu: [
      "г. Бухара", "Гиждуванский район", "Каракульский район", "Каганский район", 
      "Шафирканский район", "Вабкентский район", "Алатский район", "Пешкунский район", 
      "Караулбазарский район", "Жондорский район", "Бухарский район", "Ромитанский район", "г. Каган"
    ],
    districtsEn: [
      "Bukhara city", "Gijduvan district", "Qorakol district", "Kogon district", 
      "Shofirkon district", "Vobkent district", "Olot district", "Peshku district", 
      "Qorovulbozor district", "Jondor district", "Bukhara district", "Romitan district", "Kagan city"
    ]
  },
  {
    id: "Farg'ona",
    districtsUz: [
      "Farg'ona shahri", "Qo'qon shahri", "Marg'ilon shahri", "Oltiariq tumani", 
      "Rishton tumani", "Quva tumani", "Toshloq tumani", "Uchkuprik tumani", 
      "Bag'dod tumani", "Beshariq tumani", "O'zbekiston tumani", "So'x tumani", 
      "Farg'ona tumani", "Quvasoy shahri", "Furqat tumani", "Qoshtepa tumani", 
      "Buvayda tumani", "Dang'ara tumani", "Yozyovon tumani"
    ],
    districtsRu: [
      "г. Фергана", "г. Коканд", "г. Маргилан", "Алтыарыкский район", 
      "Риштанский район", "Кувинский район", "Ташлакский район", "Учкуприкский район", 
      "Багдадский район", "Бешарыкский район", "Узбекистанский район", "Сохский район", 
      "Ферганский район", "г. Кувасай", "Фуркатский район", "Куштепинский район", 
      "Бувайдинский район", "Дангаринский район", "Язъяванский район"
    ],
    districtsEn: [
      "Fergana city", "Kokand city", "Margilan city", "Oltiariq district", 
      "Rishton district", "Quva district", "Toshloq district", "Uchkuprik district", 
      "Bagdad district", "Besharik district", "Uzbekistan district", "Sokh district", 
      "Fergana district", "Kuvasay city", "Furkat district", "Kushtepa district", 
      "Buvayda district", "Dangara district", "Yazyavan district"
    ]
  },
  {
    id: "Andijon",
    districtsUz: [
      "Andijon shahri", "Asaka tumani", "Shahrixon tumani", "Xonobod shahri", 
      "Qo'rg'ontepa tumani", "Izboskan tumani", "Marhamat tumani", "Baliqchi tumani", 
      "Oltinko'l tumani", "Andijon tumani", "Ulug'nor tumani", "Xodjaobod tumani", 
      "Bo'z tumani", "Jalaquduq tumani", "Buloqboshi tumani", "Paxtaobod tumani"
    ],
    districtsRu: [
      "г. Андижан", "Асакинский район", "Шахриханский район", "г. Ханабад", 
      "Кургантепинский район", "Избасканский район", "Мархаматский район", "Балыкчинский район", 
      "Алтынкульский район", "Андижанский район", "Улугнорский район", "Ходжаабадский район", 
      "Бозский район", "Джалалкудукский район", "Булакбашинский район", "Пахтаабадский район"
    ],
    districtsEn: [
      "Andijan city", "Asaka district", "Shahrixon district", "Xonobod city", 
      "Qorgontepa district", "Izboskan district", "Marhamat district", "Baliqchi district", 
      "Oltinkol district", "Andijan district", "Ulugnar district", "Khadjaabad district", 
      "Boz district", "Djalalkuduk district", "Bulakbashi district", "Paxtaabad district"
    ]
  },
  {
    id: "Namangan",
    districtsUz: [
      "Namangan shahri", "Chust tumani", "Pop tumani", "Kosonsoy tumani", 
      "Uchqo'rg'on tumani", "To'raqo'rg'on tumani", "Uychi tumani", "Chortoq tumani", 
      "Yangiqo'rg'on tumani", "Mingbuloq tumani", "Norin tumani", "Namangan tumani"
    ],
    districtsRu: [
      "г. Наманган", "Чустский район", "Папский район", "Касансайский район", 
      "Учкурганский район", "Туракурганский район", "Уйчинский район", "Чартакский район", 
      "Янгикурганский район", "Мингбулакский район", "Нарынский район", "Наманганский район"
    ],
    districtsEn: [
      "Namangan city", "Chust district", "Pop district", "Kosonsoy district", 
      "Uchqorgon district", "Toraqorgon district", "Uychi district", "Chortoq district", 
      "Yangiqorgon district", "Mingbulak district", "Narin district", "Namangan district"
    ]
  },
  {
    id: "Qashqadaryo",
    districtsUz: [
      "Qarshi shahri", "Shahrisabz shahri", "Kitob tumani", "Yakkabog' tumani", 
      "G'uzor tumani", "Chiroqchi tumani", "Koson tumani", "Qamashi tumani", 
      "Nishon tumani", "Muborak tumani", "Kasbi tumani", "Mirishkor tumani", 
      "Dehqonobod tumani", "Qarshi tumani", "Shahrisabz tumani"
    ],
    districtsRu: [
      "г. Карши", "г. Шахрисабз", "Китабский район", "Яккабагский район", 
      "Гузарский район", "Чиракчинский район", "Касанский район", "Камашинский район", 
      "Нишанский район", "Мубарекский район", "Касбийский район", "Миришкарский район", 
      "Дехканабадский район", "Каршинский район", "Шахрисабзский район"
    ],
    districtsEn: [
      "Karshi city", "Shahrisabz city", "Kitob district", "Yakkabog district", 
      "Guzor district", "Chiroqchi district", "Koson district", "Qamashi district", 
      "Nishon district", "Muborak district", "Kasbi district", "Mirishkar district", 
      "Dehkanabad district", "Karshi district", "Shakhrisabz district"
    ]
  },
  {
    id: "Surxondaryo",
    districtsUz: [
      "Termiz shahri", "Sherobod tumani", "Denov tumani", "Boysun tumani", 
      "Jarqo'rg'on tumani", "Sariosiyo tumani", "Qumqo'rg'on tumani", "Shurchi tumani", 
      "Angor tumani", "Muzrabot tumani", "Termiz tumani", "Qiziriq tumani", 
      "Uzun tumani", "Oltinsoy tumani"
    ],
    districtsRu: [
      "г. Термез", "Шерабадский район", "Денауский район", "Байсунский район", 
      "Джаркурганский район", "Сариасийский район", "Кумкурганский район", "Шурчинский район", 
      "Ангорский район", "Музрабатский район", "Термезский район", "Кизирикский район", 
      "Узунский район", "Алтынсайский район"
    ],
    districtsEn: [
      "Termez city", "Sherobod district", "Denov district", "Boysun district", 
      "Jarqorgon district", "Sariosiyo district", "Qumqorgon district", "Shurchi district", 
      "Angor district", "Muzrabot district", "Termez district", "Kizirik district", 
      "Uzun district", "Altinsay district"
    ]
  },
  {
    id: "Jizzax",
    districtsUz: [
      "Jizzax shahri", "Zomin tumani", "G'allaorol tumani", "Do'stlik tumani", 
      "Paxtakor tumani", "Baxmal tumani", "Forish tumani", "Arnasoy tumani", 
      "Mirzacho'l tumani", "Yangiobod tumani", "Sharof Rashidov tumani", 
      "Zafarobod tumani", "Zarbdor tumani"
    ],
    districtsRu: [
      "г. Джизак", "Зааминский район", "Галляаральский район", "Дустликский район", 
      "Пахтакорский район", "Бахмальский район", "Форишский район", "Арнасайский район", 
      "Мирзачульский район", "Янгиабадский район", "Шароф Рашидовский район", 
      "Зафарабадский район", "Зарбдарский район"
    ],
    districtsEn: [
      "Jizzakh city", "Zaamin district", "Gallaorol district", "Dustlik district", 
      "Paxtakor district", "Baxmal district", "Forish district", "Arnasoy district", 
      "Mirzachol district", "Yangiabad district", "Sharof Rashidov district", 
      "Zafarabad district", "Zarbdar district"
    ]
  },
  {
    id: "Sirdaryo",
    districtsUz: [
      "Guliston shahri", "Sirdaryo tumani", "Sayxunobod tumani", "Boyovut tumani", 
      "Yangiyer shahri", "Shirin shahri", "Oqoltin tumani", "Sardoba tumani", 
      "Xovos tumani", "Mirzaobod tumani", "Guliston tumani"
    ],
    districtsRu: [
      "г. Гулистан", "Сырдарьинский район", "Сайхунабадский район", "Баяутский район", 
      "г. Янгиер", "г. Ширин", "Акалтынский район", "Сардобинский район", 
      "Хавасский район", "Мирзаабадский район", "Гулистанский район"
    ],
    districtsEn: [
      "Gulistan city", "Sirdaryo district", "Sayxunobod district", "Boyovut district", 
      "Yangiyer city", "Shirin city", "Oqoltin district", "Sardoba district", 
      "Khavas district", "Mirzaabad district", "Gulistan district"
    ]
  },
  {
    id: "Navoiy",
    districtsUz: [
      "Navoiy shahri", "Karmana tumani", "Zarafshon shahri", "Qiziltepa tumani", 
      "Xatirchi tumani", "Nurota tumani", "Tomdi tumani", "Uchquduq shahri", 
      "Navbahor tumani", "Konimex tumani", "Uchquduq tumani"
    ],
    districtsRu: [
      "г. Навои", "Карманинский район", "г. Зарафшан", "Кызылтепинский район", 
      "Хатырчинский район", "Нуратинский район", "Тамдынский район", "г. Учкудук", 
      "Навбахорский район", "Канимехский район", "Учкудукский район"
    ],
    districtsEn: [
      "Navoiy city", "Karmana district", "Zarafshon city", "Qiziltepa district", 
      "Xatirchi district", "Nurota district", "Tomdi district", "Uchquduq city", 
      "Navbakhor district", "Kanimekh district", "Uchkuduk district"
    ]
  },
  {
    id: "Xorazm",
    districtsUz: [
      "Urganch shahri", "Xiva shahri", "Gurlan tumani", "Xazorasp tumani", 
      "Shovot tumani", "Bog'ot tumani", "Qo'shko'pir tumani", "Yangiariq tumani", 
      "Yangibozor tumani", "Xiva tumani", "Xonqa tumani", "Urganch tumani"
    ],
    districtsRu: [
      "г. Ургенч", "г. Хива", "Гурленский район", "Хазараспский район", 
      "Шаватский район", "Багатский район", "Кошкупырский район", "Янгиарыкский район", 
      "Янгибазарский район", "Хивинский район", "Ханкинский район", "Ургенчский район"
    ],
    districtsEn: [
      "Urgench city", "Khiva city", "Gurlan district", "Xazorasp district", 
      "Shovot district", "Bogot district", "Qoshkopir district", "Yangiariq district", 
      "Yangibozor district", "Khiva district", "Khanka district", "Urgench district"
    ]
  },
  {
    id: "Qoraqalpog'iston",
    districtsUz: [
      "Nukus shahri", "Qo'ng'irot tumani", "To'rtko'l tumani", "Beruniy tumani", 
      "Mo'ynoq tumani", "Amudaryo tumani", "Ellikqal'a tumani", "Chimboy tumani", 
      "Xo'jayli tumani", "Qorauzo'yak tumani", "Qonliko'l tumani", "Shumanay tumani", 
      "Kegeyli tumani", "Nukus tumani", "Taxtako'pir tumani"
    ],
    districtsRu: [
      "г. Нукус", "Кунградский район", "Турткульский район", "Берунийский район", 
      "Муйнакский район", "Амударьинский район", "Элликкалинский район", "Чимбайский район", 
      "Ходжейлийский район", "Караузякский район", "Канликульский район", "Шуманайский район", 
      "Кегейлийский район", "Нукусский район", "Тахтакупирский район"
    ],
    districtsEn: [
      "Nukus city", "Kungrad district", "Turtkul district", "Beruniy district", 
      "Moynoq district", "Amudaryo district", "Ellikkala district", "Chimboy district", 
      "Xojayli district", "Karauzyak district", "Kanlikul district", "Shumanay district", 
      "Kegeyli district", "Nukus district", "Takhtakupir district"
    ]
  },
  {
    id: "Toshkent",
    districtsUz: [
      "Yunusobod tumani", "Chilonzor tumani", "Bektemir tumani", "Mirzo Ulug'bek tumani", 
      "Mirobod tumani", "Yashnobod tumani", "Shayxontohur tumani", "Uchtepa tumani", 
      "Yakkasaroy tumani", "Olmazor tumani", "Sergeli tumani", "Yangihayot tumani", 
      "Zangiota tumani", "Qibray tumani", "Chinoz tumani", "O'rtachirchiq tumani", 
      "Yangiyo'l tumani", "Bo'stonliq tumani", "Bekobod tumani", "Bekobod shahri", 
      "Quyi Chirchiq tumani", "Ohangaron tumani", "Bo'ka tumani", "Oqqorg'on tumani", 
      "Piskent tumani", "Olmaliq shahri", "Ohangaron shahri", "Yangiyo'l shahri", 
      "Toshkent tumani", "Yuqorichirchiq tumani", "Parkent tumani", "Angren shahri", 
      "Chirchiq shahri", "Nurafshon shahri"
    ],
    districtsRu: [
      "Юнусабадский район", "Чиланзарский район", "Бектемирский район", "Мирзо-Улугбекский район", 
      "Мирабадский район", "Яшнабадский район", "Шайхантахурский район", "Учтепинский район", 
      "Яккасарайский район", "Алмазарский район", "Сергелийский район", "Янгихаётский район", 
      "Зангиатинский район", "Кибрайский район", "Чиназский район", "Уртачирчикский район", 
      "Янгиюльский район", "Бостанлыкский район", "Бекабадский район", "г. Бекабад", 
      "Куйичирчикский район", "Ахангаранский район", "Букинский район", "Аккурганский район", 
      "Пскентский район", "г. Алмалык", "г. Ахангаран", "г. Янгиюль", 
      "Ташкентский район", "Юкарычирчикский район", "Паркентский район", "г. Ангрен", 
      "г. Чирчик", "г. Нурафшон"
    ],
    districtsEn: [
      "Yunusobod district", "Chilonzor district", "Bektemir district", "Mirzo Ulugbek district", 
      "Mirobod district", "Yashnobod district", "Shayxontohur district", "Uchtepa district", 
      "Yakkasaroy district", "Olmazor district", "Sergeli district", "Yangihayot district", 
      "Zangiota district", "Qibray district", "Chinoz district", "Ortachirchiq district", 
      "Yangiyol district", "Bostonliq district", "Bekabad district", "Bekabad city", 
      "Kuyichirchik district", "Akhangaran district", "Buka district", "Akkurgan district", 
      "Pskent district", "Almalik city", "Akhangaran city", "Yangiyul city", 
      "Tashkent district", "Yukarichirchik district", "Parkent district", "Angren city", 
      "Chirchik city", "Nurafshon city"
    ]
  }
];
