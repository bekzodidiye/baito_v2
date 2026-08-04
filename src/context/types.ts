import { Job, Chat, Message } from '../types';

export type ScreenType = 'landing' | 'kalendar' | 'qidiruv' | 'xabarlar' | 'xarita' | 'chat' | 'bildirishnomalar' | 'profil' | 'yakunlash' | 'login' | 'register' | 'sozlamalar' | 'xavfsizlik' | 'yordam' | 'faq' | 'qollanma' | 'shartlar' | 'support-chat' | 'employer-dashboard' | 'employer-jobs' | 'employer-applicants' | 'employer-chats' | 'employer-profile' | 'employer-analytics' | 'employer-post' | 'admin';

export interface UserProfile {
  firstName: string;
  lastName: string;
  selectedRole: 'worker' | 'employer';
  birthDate: string;
  phone: string;
  docFileName1: string;
  profileImage: string | null;
}

export interface AppContextType {
  currentScreen: ScreenType;
  setCurrentScreen: (screen: ScreenType) => void;
  jobs: Job[];
  setJobs: React.Dispatch<React.SetStateAction<Job[]>>;
  chats: Chat[];
  setChats: React.Dispatch<React.SetStateAction<Chat[]>>;
  selectedChatId: string | null;
  setSelectedChatId: (id: string | null) => void;
  employerSelectedChatId: string | null;
  setEmployerSelectedChatId: (id: string | null) => void;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filterLocation: string;
  setFilterLocation: (loc: string) => void;
  filterType: string;
  setFilterType: (type: string) => void;
  sortBy: 'yangilari' | 'maosh';
  setSortBy: (sort: 'yangilari' | 'maosh') => void;
  applyToJob: (jobId: string) => boolean;
  toggleBookmark: (jobId: string) => void;
  sendMessage: (chatId: string, text: string) => void;
  addNewMessage: (chatId: string, sender: 'user' | 'recruiter', text: string, hasMap?: boolean, mapLocation?: string) => void;
  unreadNotificationsCount: number;
  setUnreadNotificationsCount: React.Dispatch<React.SetStateAction<number>>;
  activeCalendarFilter: 'all' | 'applied' | 'confirmed' | 'todo' | 'completed';
  setActiveCalendarFilter: (filter: 'all' | 'applied' | 'confirmed' | 'todo' | 'completed') => void;
  activeCalendarDay: string;
  setActiveCalendarDay: (day: string) => void;
  showRegionSelector: boolean;
  setShowRegionSelector: (show: boolean) => void;
  mapFocusedJobId: string | null;
  setMapFocusedJobId: (id: string | null) => void;
  messagesSearchOpen: boolean;
  setMessagesSearchOpen: (open: boolean) => void;
  toastMessage: string | null;
  setToastMessage: (msg: string | null) => void;
  language: 'uz' | 'ru' | 'en';
  setLanguage: (lang: 'uz' | 'ru' | 'en') => void;
  isLoggedIn: boolean;
  setIsLoggedIn: (loggedIn: boolean) => void;
  userProfile: UserProfile | null;
  setUserProfile: (profile: UserProfile | null) => void;
  hasSeenTour: boolean;
  setHasSeenTour: (seen: boolean) => void;
  requireAuth: (targetScreen?: ScreenType, action?: () => void) => boolean;
  executePendingRedirect: () => boolean;
}
