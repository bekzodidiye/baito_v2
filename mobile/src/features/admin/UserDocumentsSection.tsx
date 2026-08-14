import React, { useState } from 'react';
import { Shield, Eye, X, FileBadge } from 'lucide-react';
import { AdminUser } from './types';

interface UserDocumentsSectionProps {
  user: AdminUser;
}

export const UserDocumentsSection: React.FC<UserDocumentsSectionProps> = ({ user }) => {
  const [activeImage, setActiveImage] = useState<string | null>(null);

  const docs = [
    { title: 'Pasport Old tomoni', src: user.passportDocFront },
    { title: 'Pasport Orqa tomoni', src: user.passportDocBack },
    { title: 'Selfie + Pasport', src: user.selfieWithDoc },
  ];

  return (
    <div className="bg-white rounded-[16px] border border-slate-100 shadow-sm shadow-slate-100/50 overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-blue-100 text-blue-600 flex items-center justify-center">
            <FileBadge size={14} />
          </div>
          Pasport va ID Hujjatlar
        </span>
        <span className="text-[11px] font-bold text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200">
          JSHSHIR: <strong className="text-slate-900 tracking-widest">{user.passportJshshir || 'Kiritilmagan'}</strong>
        </span>
      </div>

      <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {docs.map((doc, idx) => (
          <div key={idx} className="space-y-2">
            <div
              onClick={() => doc.src && setActiveImage(doc.src)}
              className="group relative bg-slate-50 rounded-[12px] overflow-hidden aspect-[4/3] border border-slate-200 cursor-pointer"
            >
              {doc.src ? (
                <img src={doc.src} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                  <Shield size={24} className="opacity-20" />
                  <span className="text-[11px] font-bold uppercase tracking-wider">Yuklanmagan</span>
                </div>
              )}
              {doc.src && (
                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300">
                  <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white">
                    <Eye size={20} />
                  </div>
                </div>
              )}
            </div>
            <div className="text-center">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">{doc.title}</span>
            </div>
          </div>
        ))}
      </div>

      {activeImage && (
        <div
          onClick={() => setActiveImage(null)}
          className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer animate-in fade-in duration-200"
        >
          <div className="relative max-w-4xl w-full max-h-[90vh] bg-transparent rounded-2xl flex flex-col items-center">
            <button
              onClick={() => setActiveImage(null)}
              className="absolute -top-12 right-0 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full cursor-pointer transition-colors backdrop-blur-md"
            >
              <X size={24} />
            </button>
            <img src={activeImage} alt="" className="w-full h-auto max-h-[85vh] object-contain rounded-xl shadow-2xl" />
          </div>
        </div>
      )}
    </div>
  );
};
