import React, { useRef, useState } from 'react';
import { clickable } from '../../../utils/clickable';
import { motion } from 'motion/react';
import { Briefcase, Building, FileText, ClipboardList, Image as ImageIcon, Upload, X, Tag as TagIcon, Plus } from 'lucide-react';
import { uploadFileApi } from '../../../api/queries';

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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && setImageUrl) {
      // 1. Instant local preview
      const reader = new FileReader();
      reader.onloadend = () => reader.result && setImageUrl(reader.result.toString());
      reader.readAsDataURL(file);

      // 2. Upload to MinIO S3
      try {
        const uploadedUrl = await uploadFileApi(file, 'job');
        setImageUrl(uploadedUrl);
      } catch (err) {
        console.error('Job image upload to MinIO failed:', err);
      }
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
          {language === 'uz' ? "Ish / Vazifa nomi *" : language === 'ru' ? "Название вакансии *" : "Job Title *"}
        </label>
        <input
              aria-label={language === 'ru' ? "Например: грузчик на склад / кассир" : language === 'en' ? "For example: Warehouse loader / Cashier" : "Masalan: Omborda yuk tashuvchi / Kassir"} type="text" placeholder={language === 'ru' ? "Например: грузчик на склад / кассир" : language === 'en' ? "For example: Warehouse loader / Cashier" : "Masalan: Omborda yuk tashuvchi / Kassir"} className="w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus:ring-2 focus:ring-brand-primary/20" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
          <ImageIcon size={14} className="text-brand-primary" />
          {language === 'uz' ? "Ish rasmi (Banner / Rasm) *" : language === 'ru' ? "Изображение вакансии *" : "Job Image *"}
        </label>
        {imageUrl ? (
          <div className="relative w-full h-44 rounded-2xl overflow-hidden border border-slate-200 group">
            <img src={imageUrl} alt={language === 'ru' ? "Изображение объявления" : language === 'en' ? "Posting image" : "E'lon rasmi"} className="w-full h-full object-cover"  onError={(e) => {
        const target = e.currentTarget;
        const fallback = 'https://ui-avatars.com/api/?name=U&background=F1F5F9&color=94A3B8&size=150';
        if (target.src !== fallback) {
          target.src = fallback;
        }
      }} />
            <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
              <button type="button" onClick={() => fileInputRef.current?.click()} className="px-3 py-1.5 bg-white text-slate-800 text-xs font-bold rounded-lg cursor-pointer">{language === 'ru' ? 'Изменить' : language === 'en' ? 'Change' : "O'zgartirish"}</button>
              <button type="button" onClick={() => setImageUrl && setImageUrl('')} className="p-1.5 bg-rose-600 text-white rounded-lg cursor-pointer"><X size={16} /></button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div {...clickable(() => fileInputRef.current?.click())} className="w-full h-32 border-2 border-dashed border-slate-200 bg-slate-50/60 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-slate-100/50">
              <Upload size={22} className="text-brand-primary/70" />
              <span className="text-xs font-bold text-slate-600">{language === 'uz' ? "Rasm yuklash majburiy (bosing)" : language === 'ru' ? "Загрузка изображения обязательна (нажмите)" : "Image upload is required (click)"}</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                aria-label={language === 'uz' ? "Rasm havolasi (URL)" : language === 'ru' ? "Ссылка на изображение" : "Image URL"}
                type="text"
                value={imageUrl}
                onChange={(e) => setImageUrl && setImageUrl(e.target.value)}
                placeholder={language === 'uz' ? "Yoki rasm havolasini (URL) kiriting..." : language === 'ru' ? "Или введите ссылку на изображение..." : "Or enter image URL..."}
                className="w-full bg-slate-50 border rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
              />
            </div>
          </div>
        )}
        <input
              aria-label={language === 'ru' ? "Загрузить изображение объявления" : language === 'en' ? "Upload a photo for the posting" : "E'lon rasmini yuklash"} ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
          <Building size={14} className="text-brand-primary" />
          {language === 'uz' ? "Kategoriya *" : language === 'ru' ? "Категория *" : "Category *"}
        </label>
        {/* Fourteen categories as chips wrapped to four rows and pushed the rest
            of the form off the screen. Exactly one can be picked, which is what
            a select is for — and the city field further down the same form
            already uses one. */}
        <select
          aria-label={language === 'uz' ? 'Kategoriya' : language === 'ru' ? 'Категория' : 'Category'}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm font-extrabold text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus:ring-2 focus:ring-brand-primary/20"
        >
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
      </div>

      {/* Teglar (Tags) Section */}
      <div className="flex flex-col gap-2.5">
        <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
          <TagIcon size={14} className="text-brand-primary" />
          {language === 'uz' ? "Ish Teglari (Tags)" : language === 'ru' ? "Теги вакансии" : "Job Tags"}
        </label>
        {/* These drive the badges on the shift card. Without saying so, an
            employer has no way to know that #TushlikBilan is what puts "🍲
            Tushlik" in front of a candidate. */}
        <p className="text-[11px] text-slate-400 font-medium -mt-1">
          {language === 'uz'
            ? "Tanlanganlari e'lon kartochkasida ko'rinadi — masalan #TushlikBilan → 🍲 Tushlik"
            : language === 'ru' ? 'Выбранные теги будут отображаться на карточке' : 'The ones you pick appear as badges on the shift card'}
        </p>
        <div className="flex flex-wrap gap-2">
          {PRESET_TAGS.map(t => {
            const isSel = tags.includes(t);
            return (
              <button key={t} type="button" onClick={() => toggleTag(t)} className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all border cursor-pointer ${isSel ? 'bg-purple-600 text-white border-purple-600 shadow-xs' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}>{t}</button>
            );
          })}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <input
              aria-label={language === 'uz' ? "Yangi teg qo'shish (#Student, #Bo'shVaqt)..." : language === 'ru' ? "Добавить тег..." : "Add custom tag..."} type="text" placeholder={language === 'uz' ? "Yangi teg qo'shish (#Student, #Bo'shVaqt)..." : language === 'ru' ? "Добавить тег..." : "Add custom tag..."} className="flex-1 bg-slate-50 border rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2" value={customTag} onChange={(e) => setCustomTag(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddCustomTag(e)} />
          <button type="button" onClick={() => handleAddCustomTag()} className="px-3.5 py-2 bg-brand-primary text-white text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer"><Plus size={14} /> {language === 'uz' ? "Qo'shish" : language === 'ru' ? "Добавить" : "Add"}</button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
          <Building size={14} className="text-brand-primary" />
          {language === 'uz' ? "Tashkilot nomi (ixtiyoriy)" : language === 'ru' ? "Название компании (необязательно)" : "Company Name (Optional)"}
        </label>
        <input
              aria-label={language === 'ru' ? 'Название компании' : language === 'en' ? 'Company name' : 'Tashkilot nomi'} type="text" placeholder={language === 'ru' ? "Название компании (если пусто — покажем ваше имя)" : language === 'en' ? "Company name (your own name is used if left empty)" : "Tashkilot nomi (bo'sh qolsa ismingiz ko'rsatiladi)"} className="w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2" value={company} onChange={(e) => setCompany(e.target.value)} />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
          <ClipboardList size={14} className="text-brand-primary" />
          {language === 'uz' ? "Ish vazifalari *" : language === 'ru' ? "Обязанности *" : "Job Responsibilities *"}
        </label>
        <textarea rows={3} placeholder={language === 'ru' ? "1. Разгрузка и размещение товара..." : language === 'en' ? "1. Unloading and stacking goods..." : "1. Yuklarni tushirish va joylash..."} className="w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 resize-none" value={responsibilities} onChange={(e) => setResponsibilities(e.target.value)} />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
          <FileText size={14} className="text-brand-primary" />
          {language === 'uz' ? "Qo'shimcha ma'lumot" : language === 'ru' ? "Дополнительная информация" : "Additional Description"}
        </label>
        <textarea rows={2} placeholder={language === 'ru' ? "Об условиях работы..." : language === 'en' ? "About the working conditions..." : "Ish sharoitlari haqida..."} className="w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 resize-none" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
    </motion.div>
  );
};
