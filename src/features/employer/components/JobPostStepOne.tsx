import React, { useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Briefcase, Building, FileText, ClipboardList, Image as ImageIcon, Upload, X, Tag as TagIcon, Plus } from 'lucide-react';

interface Category {
  id: string;
  label: string;
}

interface JobPostStepOneProps {
  language: string;
  title: string;
  setTitle: (val: string) => void;
  category: string;
  setCategory: (val: string) => void;
  categories: Category[];
  company: string;
  setCompany: (val: string) => void;
  imageUrl?: string;
  setImageUrl?: (val: string) => void;
  responsibilities: string;
  setResponsibilities: (val: string) => void;
  description: string;
  setDescription: (val: string) => void;
  tags?: string[];
  setTags?: (tags: string[]) => void;
}

const PRESET_TAGS = ['#Tajribali', '#Tezkor', '#AyniVaqtda', "#KunlikTo'lov", '#TushlikBilan', '#TransportBilan', '#StudentlarGacha', '#Shoshilinch'];

export const JobPostStepOne: React.FC<JobPostStepOneProps> = ({
  language, title, setTitle, category, setCategory, categories, company, setCompany, imageUrl = '', setImageUrl, responsibilities, setResponsibilities, description, setDescription, tags = [], setTags
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [customTag, setCustomTag] = useState('');

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && setImageUrl) {
      const reader = new FileReader();
      reader.onloadend = () => reader.result && setImageUrl(reader.result.toString());
      reader.readAsDataURL(file);
    }
  };

  const toggleTag = (tag: string) => {
    if (!setTags) return;
    if (tags.includes(tag)) setTags(tags.filter(t => t !== tag));
    else setTags([...tags, tag]);
  };

  const handleAddCustomTag = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!customTag.trim() || !setTags) return;
    const formatted = customTag.startsWith('#') ? customTag.trim() : `#${customTag.trim()}`;
    if (!tags.includes(formatted)) setTags([...tags, formatted]);
    setCustomTag('');
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col gap-5 bg-white p-5 sm:p-6 rounded-3xl border border-slate-100 shadow-xs">
      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
          <Briefcase size={14} className="text-brand-primary" />
          {language === 'uz' ? "Ish / Vazifa nomi *" : "Job Title *"}
        </label>
        <input type="text" placeholder={language === 'uz' ? "Masalan: Omborda yuk tashuvchi / Kassir" : "e.g. Warehouse Loader"} className="w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-brand-primary/20" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
          <ImageIcon size={14} className="text-brand-primary" />
          {language === 'uz' ? "Ish rasmi (Banner / Rasm)" : "Job Image"}
        </label>
        {imageUrl ? (
          <div className="relative w-full h-44 rounded-2xl overflow-hidden border border-slate-200 group">
            <img src={imageUrl} alt="Job Banner" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
              <button type="button" onClick={() => fileInputRef.current?.click()} className="px-3 py-1.5 bg-white text-slate-800 text-xs font-bold rounded-lg cursor-pointer">O'zgartirish</button>
              <button type="button" onClick={() => setImageUrl && setImageUrl('')} className="p-1.5 bg-rose-600 text-white rounded-lg cursor-pointer"><X size={16} /></button>
            </div>
          </div>
        ) : (
          <div onClick={() => fileInputRef.current?.click()} className="w-full h-32 border-2 border-dashed border-slate-200 bg-slate-50/60 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-slate-100/50">
            <Upload size={22} className="text-brand-primary/70" />
            <span className="text-xs font-bold text-slate-600">{language === 'uz' ? "Rasm yuklash uchun bosing" : "Click to upload image"}</span>
          </div>
        )}
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
          <Building size={14} className="text-brand-primary" />
          {language === 'uz' ? "Kategoriya *" : "Category *"}
        </label>
        <div className="flex flex-wrap gap-2">
          {categories.map(c => (
            <button key={c.id} type="button" onClick={() => setCategory(c.id)} className={`px-3 py-2 rounded-xl text-xs font-bold border cursor-pointer outline-none ${category === c.id ? 'bg-brand-primary text-white border-brand-primary' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>{c.label}</button>
          ))}
        </div>
      </div>

      {/* Teglar (Tags) Section */}
      <div className="flex flex-col gap-2.5">
        <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
          <TagIcon size={14} className="text-brand-primary" />
          {language === 'uz' ? "Ish Teglari (Tags)" : "Job Tags"}
        </label>
        <div className="flex flex-wrap gap-2">
          {PRESET_TAGS.map(t => {
            const isSel = tags.includes(t);
            return (
              <button key={t} type="button" onClick={() => toggleTag(t)} className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all border cursor-pointer ${isSel ? 'bg-purple-600 text-white border-purple-600 shadow-xs' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}>{t}</button>
            );
          })}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <input type="text" placeholder={language === 'uz' ? "Yangi teg qo'shish (#Student, #Bo'shVaqt)..." : "Add custom tag..."} className="flex-1 bg-slate-50 border rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 outline-none" value={customTag} onChange={(e) => setCustomTag(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddCustomTag(e)} />
          <button type="button" onClick={() => handleAddCustomTag()} className="px-3.5 py-2 bg-brand-primary text-white text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer"><Plus size={14} /> {language === 'uz' ? "Qo'shish" : "Add"}</button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
          <Building size={14} className="text-brand-primary" />
          {language === 'uz' ? "Tashkilot nomi" : "Company Name"}
        </label>
        <input type="text" placeholder="e.g. Murod Buildings" className="w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 outline-none" value={company} onChange={(e) => setCompany(e.target.value)} />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
          <ClipboardList size={14} className="text-brand-primary" />
          {language === 'uz' ? "Ish vazifalari *" : "Job Responsibilities *"}
        </label>
        <textarea rows={3} placeholder={language === 'uz' ? "1. Yuklarni tushirish va joylash..." : "1. Unloading goods"} className="w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 outline-none resize-none" value={responsibilities} onChange={(e) => setResponsibilities(e.target.value)} />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
          <FileText size={14} className="text-brand-primary" />
          {language === 'uz' ? "Qo'shimcha ma'lumot" : "Additional Description"}
        </label>
        <textarea rows={2} placeholder={language === 'uz' ? "Ish sharoitlari haqida..." : "General info..."} className="w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 outline-none resize-none" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
    </motion.div>
  );
};
