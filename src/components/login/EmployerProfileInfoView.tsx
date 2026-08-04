import React from 'react';
import { motion } from 'motion/react';
import { Camera, Plus, User } from 'lucide-react';
import { CustomSelect } from './CustomSelect';

export interface EmployerProfileInfoViewProps {
  profileImage: string | null;
  triggerFileSelect: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handlePhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setProfileImage: (url: string) => void;
  companyName: string;
  setCompanyName: (val: string) => void;
  industry: string;
  setIndustry: (val: string) => void;
  location: string;
  setLocation: (val: string) => void;
  employeesCount: string;
  setEmployeesCount: (val: string) => void;
  foundedYear: string;
  setFoundedYear: (val: string) => void;
  website: string;
  setWebsite: (val: string) => void;
  companyBio: string;
  setCompanyBio: (val: string) => void;
  profileSubmitRef: React.RefObject<HTMLButtonElement | null>;
  handleProfileSubmit: (e: React.FormEvent) => void;
  t: any;
  language: string;
  isModal: boolean;
}

export const EmployerProfileInfoView: React.FC<EmployerProfileInfoViewProps> = (props) => {
  const {
    profileImage, triggerFileSelect, fileInputRef, handlePhotoUpload,
    companyName, setCompanyName, industry, setIndustry, location, setLocation,
    employeesCount, setEmployeesCount, foundedYear, setFoundedYear,
    website, setWebsite, companyBio, setCompanyBio, profileSubmitRef,
    handleProfileSubmit, language
  } = props;

  const industries = [
    { value: 'retail', label: "Chakana savdo" },
    { value: 'it', label: "IT va Texnologiyalar" },
    { value: 'manufacturing', label: "Ishlab chiqarish" },
    { value: 'services', label: "Xizmat ko'rsatish" }
  ];

  return (
    <motion.div
      key="profile-info-employer"
      initial={{ opacity: 0, x: 15 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -15 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col gap-4"
    >
      <div className="text-center">
        <div className="flex items-center gap-2 justify-center mb-1">
          <h1 className="text-xl sm:text-2xl font-black text-brand-primary tracking-tight">
            {language === 'uz' ? "Profil ma'lumotlari" : language === 'ru' ? "Данные профиля" : "Profile Details"}
          </h1>
          <User size={20} className="text-brand-primary" />
        </div>
        <p className="text-xs text-slate-500 font-semibold">
          {language === 'uz' ? "Kompaniya ma'lumotlarini kiriting" : language === 'ru' ? "Введите данные компании" : "Enter company details"}
        </p>
      </div>

      <div className="flex flex-col items-center justify-center pt-2">
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
        <p className="mt-2 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
          {language === 'uz' ? "Profil rasmi (ixtiyoriy)" : language === 'ru' ? "Фото профиля (необязательно)" : "Profile photo (optional)"}
        </p>
      </div>

      <form id="profile-form" noValidate onSubmit={handleProfileSubmit} className="space-y-4">
        <button type="submit" ref={profileSubmitRef} className="hidden" />
        <div className="space-y-1">
          <label className="text-[10px] font-extrabold text-slate-400 px-1 uppercase tracking-wider">
            {language === 'uz' ? "Kompaniya nomi *" : language === 'ru' ? "Название компании *" : "Company Name *"}
          </label>
          <input type="text" required value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Masalan: Korzinka.uz" className="w-full bg-white border border-slate-200/80 rounded-xl py-2.5 px-3.5 text-xs font-semibold focus:border-brand-primary outline-none" />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-extrabold text-slate-400 px-1 uppercase tracking-wider">
            {language === 'uz' ? "Sohasi *" : language === 'ru' ? "Отрасль *" : "Industry *"}
          </label>
          <CustomSelect value={industry} onChange={setIndustry} placeholder={language === 'uz' ? "Tanlang" : "Select"} options={industries} />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-extrabold text-slate-400 px-1 uppercase tracking-wider">
            {language === 'uz' ? "Manzil *" : language === 'ru' ? "Адрес *" : "Location *"}
          </label>
          <input type="text" required value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Toshkent, Chilonzor" className="w-full bg-white border border-slate-200/80 rounded-xl py-2.5 px-3.5 text-xs font-semibold focus:border-brand-primary outline-none" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-slate-400 px-1 uppercase tracking-wider">
              {language === 'uz' ? "Xodimlar soni" : "Employees"}
            </label>
            <input type="text" value={employeesCount} onChange={(e) => setEmployeesCount(e.target.value)} placeholder="100-500" className="w-full bg-white border border-slate-200/80 rounded-xl py-2.5 px-3.5 text-xs font-semibold focus:border-brand-primary outline-none" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-slate-400 px-1 uppercase tracking-wider">
              {language === 'uz' ? "Tashkil topgan yil" : "Founded Year"}
            </label>
            <input type="number" value={foundedYear} onChange={(e) => setFoundedYear(e.target.value)} placeholder="2006" className="w-full bg-white border border-slate-200/80 rounded-xl py-2.5 px-3.5 text-xs font-semibold focus:border-brand-primary outline-none" />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-extrabold text-slate-400 px-1 uppercase tracking-wider">
            {language === 'uz' ? "Vebsayt" : "Website"}
          </label>
          <input type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="company.uz" className="w-full bg-white border border-slate-200/80 rounded-xl py-2.5 px-3.5 text-xs font-semibold focus:border-brand-primary outline-none" />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-extrabold text-slate-400 px-1 uppercase tracking-wider">
            {language === 'uz' ? "Kompaniya haqida" : "Company Bio"}
          </label>
          <textarea value={companyBio} onChange={(e) => setCompanyBio(e.target.value)} placeholder="Kompaniyangiz haqida ma'lumot..." rows={3} className="w-full bg-white border border-slate-200/80 rounded-xl py-2.5 px-3.5 text-xs font-semibold focus:border-brand-primary outline-none resize-none" />
        </div>
      </form>
    </motion.div>
  );
};
