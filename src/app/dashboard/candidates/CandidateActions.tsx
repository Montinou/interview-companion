'use client';

import { useState } from 'react';
import { CVUploader } from '@/components/cv/CVUploader';

export function CandidateActions() {
  const [showUpload, setShowUpload] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowUpload(!showUpload)}
        className="bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
      >
        {showUpload ? 'Cerrar' : '+ Subir CV'}
      </button>

      {showUpload && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 rounded-xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Subir CV de Candidato</h2>
              <button
                onClick={() => setShowUpload(false)}
                className="text-zinc-400 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            <CVUploader
              onUploadComplete={(data) => {
                console.log('CV uploaded:', data);
              }}
              onAnalysisComplete={(data) => {
                console.log('CV analyzed:', data);
                // Reload page after a short delay
                setTimeout(() => window.location.reload(), 1500);
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}
