import React from 'react';
import { User, Camera, Plus } from 'lucide-react';
import { motion } from 'motion/react';
import { MONTHS } from './LoginPromptScreen.utils';
import { CustomSelect } from './CustomSelect';

interface ProfileInfoViewProps {
  profileImage: string | null;
  triggerFileSelect: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handlePhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setProfileImage: (url: string) => void;
  firstName: string;
  setFirstName: (val: string) => void;
  lastName: string;
  setLastName: (val: string) => void;
  birthDay: string;
  setBirthDay: (val: string) => void;
  birthMonth: string;
  setBirthMonth: (val: string) => void;
  birthYear: string;
  setBirthYear: (val: string) => void;
  gender: 'male' | 'female' | null;
  setGender: (val: 'male' | 'female' | null) => void;
  email: string;
  setEmail: (val: string) => void;
  profileSubmitRef: React.RefObject<HTMLButtonElement | null>;
  handleProfileSubmit: (e: React.FormEvent) => void;
  t: any;
  language: string;
  isModal: boolean;
}

export const ProfileInfoView: React.FC<ProfileInfoViewProps> = (props) => {
  const {
    profileImage, triggerFileSelect, fileInputRef, handlePhotoUpload,
    firstName, setFirstName, lastName, setLastName, birthDay, setBirthDay,
    birthMonth, setBirthMonth, birthYear, setBirthYear, gender, setGender,
    email, setEmail, profileSubmitRef, handleProfileSubmit, t, language
  } = props;

  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const years = Array.from({ length: 55 }, (_, i) => 2012 - i);

  return (
    <motion.div
      key="profile-info"
      initial={{ opacity: 0, x: 15 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -15 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col gap-4"
    >
      <div className="text-center">
        <div className="flex items-center gap-2 justify-center mb-1">
          <h1 className="text-xl sm:text-2xl font-black text-brand-primary tracking-tight">
            {t.profileInfoTitle}
          </h1>
          <User size={20} className="text-brand-primary" />
        </div>
        <p className="text-xs text-slate-500 font-semibold">{t.profileInfoSubtitle}</p>
      </div>

      <div className="flex flex-col items-center justify-center">
        <div 
          onClick={triggerFileSelect}
          className="w-[88px] h-[88px] rounded-full border border-dashed border-slate-300 hover:border-brand-primary/40 flex items-center justify-center relative bg-white cursor-pointer transition-all active:scale-95 group shadow-3xs"
        >
          {profileImage ? (
            <img src={profileImage} alt="Avatar Preview" className="w-full h-full object-cover rounded-full" referrerPolicy="no-referrer" />
          ) : (
            <Camera size={30} className="text-slate-400 group-hover:text-brand-primary transition-colors stroke-[2.2]" />
          )}
          <div className="absolute bottom-0 right-0 bg-brand-primary text-white w-7 h-7 rounded-full flex items-center justify-center border-2 border-white shadow-xs">
            <Plus size={12} className="stroke-[3]" />
          </div>
        </div>
        <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/*" className="hidden" />
        <p className="mt-2 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">{t.uploadPhoto}</p>
      </div>

      <form id="profile-form" noValidate onSubmit={handleProfileSubmit} className="space-y-4 max-w-[380px] mx-auto w-full">
        <button type="submit" ref={profileSubmitRef} className="hidden" />
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-slate-400 px-1 uppercase tracking-wider">{t.name}</label>
            <input type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Aziz" className="w-full bg-white border border-slate-200/80 rounded-xl py-2.5 px-3.5 text-xs font-semibold focus:border-brand-primary outline-none" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-slate-400 px-1 uppercase tracking-wider">{t.surname}</label>
            <input type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Aliyev" className="w-full bg-white border border-slate-200/80 rounded-xl py-2.5 px-3.5 text-xs font-semibold focus:border-brand-primary outline-none" />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-extrabold text-slate-400 px-1 uppercase tracking-wider">{t.birthdate}</label>
          <div className="grid grid-cols-3 gap-2">
            <CustomSelect value={birthDay} onChange={setBirthDay} placeholder={t.day} options={days.map(d => ({ value: String(d), label: String(d) }))} />
            <CustomSelect value={birthMonth} onChange={setBirthMonth} placeholder={t.month} options={(MONTHS[language as 'uz' | 'ru' | 'en'] || MONTHS.uz).map((m, idx) => ({ value: String(idx + 1), label: m }))} />
            <CustomSelect value={birthYear} onChange={setBirthYear} placeholder={t.year} options={years.map(y => ({ value: String(y), label: String(y) }))} />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-extrabold text-slate-400 px-1 uppercase tracking-wider">{t.gender}</label>
          <div className="grid grid-cols-2 gap-4">
            <button type="button" onClick={() => setGender('male')} className={`flex items-center justify-center gap-2 py-2.5 px-3.5 rounded-xl border font-bold text-xs cursor-pointer ${gender === 'male' ? 'border-brand-primary bg-brand-primary/5 text-brand-primary' : 'border-slate-200 bg-white text-slate-600'}`}>
              <span>👨🏻</span><span>{t.male}</span>
            </button>
            <button type="button" onClick={() => setGender('female')} className={`flex items-center justify-center gap-2 py-2.5 px-3.5 rounded-xl border font-bold text-xs cursor-pointer ${gender === 'female' ? 'border-brand-primary bg-brand-primary/5 text-brand-primary' : 'border-slate-200 bg-white text-slate-600'}`}>
              <span>👩🏻</span><span>{t.female}</span>
            </button>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-extrabold text-slate-400 px-1 uppercase tracking-wider">{t.email}</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="aziz@example.com" className="w-full bg-white border border-slate-200/80 rounded-xl py-2.5 px-3.5 text-xs font-semibold focus:border-brand-primary outline-none" />
        </div>
      </form>
    </motion.div>
  );
};
