import { Chat } from './types';
import { Language } from './translations';

export const chatDataTrans: Record<string, any> = {
  'c1': {
    companyName: { ru: 'Мебельный цех Artel', en: 'Artel Furniture Shop' },
    recruiterName: { ru: 'Малика Ахмедова', en: 'Malika Akhmedova' },
    messages: {
      '1': { 
        ru: 'Ассалому алайкум! Нам сегодня в мебельный цех срочно нужен помощник мастера на 1 день. Дневная оплата 200 000 сум наличными, обед и чай за наш счет.', 
        en: 'Hello! We urgently need a 1-day master assistant in our furniture shop today. Daily salary is 200,000 UZS cash, lunch and tea are on us.' 
      },
      '2': { 
        ru: 'Ваалайкум ассалом! Большое спасибо за предложение. Я готов, нужно ли мне брать свои инструменты и где именно вы находитесь?', 
        en: 'Hello! Thank you very much for the offer. I am ready, should I bring my own tools, and where exactly is the location?' 
      },
      '3': { 
        ru: 'Нет, все инструменты есть в цеху. Адрес: г. Ташкент, Бектемирский район, мебельный цех рядом с заводом Artel. По прибытии все объясним.', 
        en: 'No, all tools are in the workshop. Address: Tashkent, Bektemir district, furniture shop near Artel factory. We will explain everything upon arrival.' 
      },
      '4': { 
        ru: 'Отлично, понятно. Я буду там в понедельник в 08:30 утра.', 
        en: 'Excellent, clear. I will be there on Monday morning at 08:30.' 
      },
      '5': { 
        ru: 'Договорились, ждем вас! Не забудьте взять с собой документ, удостоверяющий личность (паспорт или ID-карту).', 
        en: 'Agreed, we will wait for you! Please remember to bring your identity document (passport or ID card).' 
      }
    }
  },
  'c2': {
    companyName: { ru: 'Корзинка Чиланзар', en: 'Chilonzor Korzinka' },
    recruiterName: { ru: 'Сардор Каримов', en: 'Sardor Karimov' },
    messages: {
      '1': { 
        ru: 'Ассалому алайкум! Я бы хотел поработать по сегодняшней заявке ночного грузчика (мерчендайзера) на 4 часа в Чиланзарском филиале. Могу ли я прийти сегодня и начать работу?', 
        en: 'Hello! I would like to work on today\'s 4-hour night loader (merchandiser) request in the Chilonzor branch. Can I come and start today?' 
      },
      '2': { 
        ru: 'Ваалайкум ассалом. Да, конечно. Если придете сегодня с 14:00 до 17:00, мы быстро объясним условия и выдадим направление. Почасовая оплата 30 000 сум, расчет сразу после окончания дневной работы.', 
        en: 'Hello. Yes, of course. If you come today between 14:00 and 17:00, we will quickly explain the terms and give you a referral. Hourly pay is 30,000 UZS, payment is settled right after completion.' 
      },
      '3': { 
        ru: 'Приходите в наш головной офис в Яшнабадском районе. Он находится рядом со станцией метро "Дустлик". Придя, спросите Сардора, я выдам вам направление.', 
        en: 'Come to our head office in Yashnobod district. It is located near "Dustlik" metro station. Upon arrival, ask for Sardor, I will give you the referral.' 
      }
    }
  },
  'c3': {
    companyName: { ru: 'Кибрайская Агротеплица', en: 'Qibray Agro-Greenhouse' },
    recruiterName: { ru: 'Зухра Каримбаева', en: 'Zuhra Karimboyeva' },
    messages: {
      '1': { 
        ru: 'Ассалому алайкум, вы спрашивали о ежедневной сезонной работе по сбору помидоров в Кибрае. Завтра наша новая группа выходит в поле. Обед и транспорт абсолютно бесплатны.', 
        en: 'Hello, you asked about the daily seasonal work of picking tomatoes in Qibray. Tomorrow our new group is going to the field. Lunch and transport are absolutely free.' 
      },
      '2': { 
        ru: 'Ваалайкум ассалом! Да, я готов. Сколько составляет ежедневная оплата, откуда и во сколько отправляется специальный автобус?', 
        en: 'Hello! Yes, I am ready. How much is the daily pay, and from where and what time does the special bus leave?' 
      },
      '3': { 
        ru: 'Ежедневная оплата производится каждый вечер в размере 150 000 сум наличными или на карту. Наш автобус отправляется от стоянки у выхода метро Юнусабад в 07:30.', 
        en: 'Daily payment is made every evening in the amount of 150,000 UZS in cash or card. Our bus leaves from the parking lot at the exit of Yunusabad metro at 07:30.' 
      },
      '4': { 
        ru: 'Понятно. Завтра в 07:15 я буду там. Большое спасибо, не опоздаю!', 
        en: 'Got it. I will be there at 07:15 tomorrow. Thank you very much, I won\'t be late!' 
      }
    }
  },
  'c4': {
    companyName: { ru: 'Банкетный зал Висол', en: 'Visol Banquet Hall' },
    recruiterName: { ru: 'Анвар Шадиев', en: 'Anvar Shodiyev' },
    messages: {
      '1': { 
        ru: 'Братишка, сегодня на вечернее мероприятие, которое начнется в 20:00, нужен дополнительный помощник для сбора посуды и столов. Дневная оплата 160 000 сум наличными.', 
        en: 'Brother, we need an extra helper to collect dishes and tables for tonight\'s event starting at 20:00. Daily payment is 160,000 UZS cash.' 
      },
      '2': { 
        ru: 'Ассалому алайкум, Анвар ака! Я готов, без проблем смогу выйти. В каком районе расположен банкетный зал?', 
        en: 'Hello, Anvar aka! I am ready, I can work without any issues. Which district is the banquet hall in?' 
      },
      '3': { 
        ru: 'Алмазарский район, недалеко от станции метро Беруни. После окончания свадьбы гарантируется бесплатная служба такси до вашего дома.', 
        en: 'Olmazor district, close to Beruniy metro station. After the wedding ends, a free taxi service to your home is guaranteed.' 
      },
      '4': { 
        ru: 'Отлично, тогда к 19:45 я буду перед банкетным залом.', 
        en: 'Very well, then I will be in front of the banquet hall by 19:45.' 
      }
    }
  },
  'c5': {
    companyName: { ru: 'Служба грузоперевозок Юнусабад', en: 'Yunusabad Cargo Service' },
    recruiterName: { ru: 'Сирожиддин Алиев', en: 'Sirojiddin Aliyev' },
    messages: {
      '1': { 
        ru: 'Ассалому алайкум. Вы проявили интерес к временной вакансии грузчика для услуги переезда офиса внутри города. Есть ли у вас опыт физической погрузки?', 
        en: 'Hello. You showed interest in the temporary loader position for our in-city office relocation service. Do you have physical loading experience?' 
      },
      '2': { 
        ru: 'Ваалайкум ассалом. Я физически крепок, ранее несколько раз участвовал в переездах квартир и офисов. Какая будет дневная оплата?', 
        en: 'Hello. I am physically strong, and I have previously participated in home and office moves several times. What will be the daily payment?' 
      },
      '3': { 
        ru: 'Работа продлится в понедельник с 09:00 до 16:00. Дневная оплата 180 000 сум наличными. Я занес ваши данные в систему, свяжемся в понедельник.', 
        en: 'Work will continue on Monday from 09:00 to 16:00. Daily payment is 180,000 UZS cash. I recorded your details in the system, we will be in touch on Monday.' 
      }
    }
  },
  'c6': {
    companyName: { ru: 'Гранд Банкетный Зал', en: 'Grand Banquet Hall' },
    recruiterName: { ru: 'Феруза Джалилова', en: 'Feruza Jalilova' },
    messages: {
      '1': { 
        ru: 'Добро пожаловать! На большую воскресную конференцию нужен временный помощник для встречи гостей и помощи в обеденном зале на 1 день. Оплата 220 000 сум.', 
        en: 'Welcome! We need a 1-day helper to welcome guests and assist in the dining hall for Sunday\'s major conference. Pay is 220,000 UZS.' 
      },
      '2': { 
        ru: 'Ассалому алайкум, Феруза опа! Отличное предложение, я смогу принять участие. С какого по какое время будет длиться работа и есть ли дресс-код?', 
        en: 'Hello, Feruza opa! Great offer, I can participate. What are the working hours, and is there any dress code?' 
      },
      '3': { 
        ru: 'Отлично. Время работы с 09:00 до 17:00. Дресс-код классический (белая рубашка, черные брюки). Ждем вас завтра!', 
        en: 'Great. Working hours from 09:00 to 17:00. Dress code is classic (white shirt, black trousers). See you tomorrow!' 
      }
    }
  }
};

export const getTranslatedChat = (chat: Chat, lang: Language): Chat => {
  if (!chat) return chat;
  const safeChat = {
    ...chat,
    companyName: chat.companyName || '',
    recruiterName: chat.recruiterName || '',
    messages: Array.isArray(chat.messages) ? chat.messages : []
  };

  if (lang === 'uz') return safeChat;

  const trans = chatDataTrans[safeChat.id];
  if (!trans) return safeChat;

  const translatedMessages = safeChat.messages.map(m => {
    if (!m) return m;
    const msgTrans = trans.messages?.[m.id];
    if (msgTrans && msgTrans[lang]) {
      return {
        ...m,
        text: msgTrans[lang]
      };
    }
    return m;
  });

  return {
    ...safeChat,
    companyName: trans.companyName?.[lang] || safeChat.companyName,
    recruiterName: trans.recruiterName?.[lang] || safeChat.recruiterName,
    messages: translatedMessages
  };
};
