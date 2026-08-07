import { useApp } from '../context/AppContext';
import { LOCAL_TEXTS } from '../components/login/LoginPromptScreen.utils';
import { useLoginState } from './login-prompt/useLoginState';
import { useLoginHandlers } from './login-prompt/useLoginHandlers';

export interface UseLoginPromptProps {
  isModal: boolean;
  onClose?: () => void;
}

export const useLoginPrompt = ({ isModal, onClose }: UseLoginPromptProps) => {
  const { language } = useApp();
  const t = LOCAL_TEXTS[language as 'uz' | 'ru' | 'en'] || LOCAL_TEXTS.uz;

  const state = useLoginState(isModal);
  const handlers = useLoginHandlers(state, isModal, onClose);

  return {
    language,
    t,
    ...state,
    ...handlers
  };
};
