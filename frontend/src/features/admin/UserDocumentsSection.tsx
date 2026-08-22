import React, { useState } from 'react';
import { Shield, Eye, X } from 'lucide-react';
import { AdminUser } from './types';

interface UserDocumentsSectionProps {
  user: AdminUser;
}

export const UserDocumentsSection: React.FC<UserDocumentsSectionProps> = ({ user }) => {
  const [activeImage, setActiveImage] = useState<string | null>(null);

  const docs = [
    { title: 'Pasport Old', src: user.passportDocFront },
    { title: 'Pasport Orqa', src: user.passportDocBack },
    { title: 'Selfie + ID', src: user.selfieWithDoc },
  ];

  return (
    <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
          <Shield size={15} className="text-blue-600" /> Pasport va ID Hujjatlar
        </span>
        <span className="text-[11px] font-bold text-slate-500">
          JSHSHIR: <strong className="text-slate-900">{user.passportJshshir || '31205980123456'}</strong>
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        {docs.map((doc, idx) => (
          <div
            key={idx}
            onClick={() => doc.src && setActiveImage(doc.src)}
            className="group relative bg-slate-200 rounded-xl overflow-hidden aspect-4/3 border border-slate-300 cursor-pointer"
          >
            {doc.src ? (
              <img src={doc.src} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400">Yo'q</div>
            )}
            <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-bold transition-opacity">
              <Eye size={16} />
            </div>
            <div className="absolute bottom-0 inset-x-0 bg-slate-900/80 text-white text-[9px] font-bold py-0.5 text-center">
              {doc.title}
            </div>
          </div>
        ))}
      </div>

      {activeImage && (
        <div
          onClick={() => setActiveImage(null)}
          className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-2xl w-full max-h-[85vh] bg-black rounded-2xl overflow-hidden p-2">
            <button
              onClick={() => setActiveImage(null)}
              className="absolute top-4 right-4 p-2 bg-slate-900/80 text-white rounded-full cursor-pointer"
            >
              <X size={20} />
            </button>
            <img src={activeImage} alt="" className="w-full h-auto max-h-[80vh] object-contain mx-auto rounded-xl" />
          </div>
        </div>
      )}
    </div>
  );
};
