import { Job, Chat, Message } from '../types';

export type ScreenType = 'landing' | 'calendar' | 'jobs' | 'messages' | 'jobs' | 'chat' | 'notifications' | 'profile' | 'reviews' | 'applications' | 'verification' | 'payments' | 'login' | 'register' | 'settings' | 'security' | 'help' | 'faq' | 'guide' | 'terms' | 'support-chat' | 'employer-dashboard' | 'employer-jobs' | 'employer-applicants' | 'employer-chats' | 'employer-profile' | 'employer-analytics' | 'employer-post' | 'admin';

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  selectedRole: 'worker' | 'employer' | 'admin';
  birthDate: string;
  phone: string;
  isVerified?: boolean;
  docFileName1: string;
  docFileName2?: string;
  docFileName3?: string;
  profileImage: string | null;
  email?: string;
  region?: string;
  profession?: string;
  aboutMe?: string;
  skills?: string[];
  gender?: 'male' | 'female' | '';
  passportSeries?: string;
  pinfl?: string;
  rating?: number;
  completedJobsCount?: number;
}

export interface AppContextType {

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
  logout: () => void;
}
