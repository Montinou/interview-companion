'use client';

import { useState, useCallback } from 'react';

interface CVUploaderProps {
  candidateId?: number;
  onUploadComplete?: (data: { cvUrl: string; candidateId: number }) => void;
  onAnalysisComplete?: (data: any) => void;
}

export function CVUploader({ candidateId, onUploadComplete, onAnalysisComplete }: CVUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<'idle' | 'uploading' | 'uploaded' | 'analyzing' | 'done'>('idle');
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    const validTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
    ];
    if (!validTypes.includes(selected.type)) {
      setError('Solo se aceptan archivos PDF o Word (.docx)');
      return;
    }
    if (selected.size > 10 * 1024 * 1024) {
      setError('El archivo no puede superar 10MB');
      return;
    }

    setFile(selected);
    setError(null);
    setAnalysisResult(null);
    setProgress('idle');
  }, []);

  const handleUploadAndAnalyze = async () => {
    if (!file) return;
    setError(null);

    try {
      // Step 1: Get pre-signed upload URL
      setProgress('uploading');
      setUploading(true);

      const uploadRes = await fetch('/api/cv/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateId,
          candidateName: candidateId ? undefined : file.name.replace(/\.[^.]+$/, ''),
          fileName: file.name,
          contentType: file.type,
        }),
      });

      if (!uploadRes.ok) {
        const err = await uploadRes.json();
        throw new Error(err.error || 'Error al solicitar URL de subida');
      }

      const { uploadUrl, key, candidateId: resolvedCandidateId } = await uploadRes.json();

      // Step 2: Upload file to R2 via pre-signed URL
      const putRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      if (!putRes.ok) {
        throw new Error('Error al subir archivo a almacenamiento');
      }

      setProgress('uploaded');
      setUploading(false);
      onUploadComplete?.({ cvUrl: key, candidateId: resolvedCandidateId });

      // Step 3: Trigger AI analysis
      setProgress('analyzing');
      setAnalyzing(true);

      const analyzeRes = await fetch('/api/cv/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateId: resolvedCandidateId,
          r2Key: key,
          mimeType: file.type,
        }),
      });

      if (!analyzeRes.ok) {
        const err = await analyzeRes.json();
        throw new Error(err.error || 'Error en análisis de CV');
      }

      const analysis = await analyzeRes.json();
      setAnalysisResult(analysis);
      setProgress('done');
      onAnalysisComplete?.(analysis);

    } catch (err: any) {
      setError(err.message || 'Error inesperado');
      setProgress('idle');
    } finally {
      setUploading(false);
      setAnalyzing(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped) {
      const fakeEvent = { target: { files: [dropped] } } as any;
      handleFileSelect(fakeEvent);
    }
  }, [handleFileSelect]);

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
          ${file ? 'border-blue-500 bg-blue-500/10' : 'border-zinc-600 hover:border-zinc-400'}
          ${error ? 'border-red-500 bg-red-500/10' : ''}`}
        onClick={() => document.getElementById('cv-file-input')?.click()}
      >
        <input
          id="cv-file-input"
          type="file"
          accept=".pdf,.docx,.doc"
          onChange={handleFileSelect}
          className="hidden"
        />

        {file ? (
          <div>
            <p className="text-lg font-medium text-white">{file.name}</p>
            <p className="text-sm text-zinc-400 mt-1">
              {(file.size / 1024).toFixed(0)} KB • {file.type === 'application/pdf' ? 'PDF' : 'Word'}
            </p>
          </div>
        ) : (
          <div>
            <p className="text-lg text-zinc-300">Arrastrá un CV aquí o hacé click</p>
            <p className="text-sm text-zinc-500 mt-1">PDF o Word, máximo 10MB</p>
          </div>
        )}
      </div>

      {error && (
        <p className="text-red-400 text-sm">{error}</p>
      )}

      {/* Upload + Analyze button */}
      {file && progress === 'idle' && (
        <button
          onClick={handleUploadAndAnalyze}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 px-4 rounded-lg transition-colors"
        >
          Subir y Analizar CV
        </button>
      )}

      {/* Progress */}
      {progress !== 'idle' && progress !== 'done' && (
        <div className="bg-zinc-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full" />
            <span className="text-zinc-300">
              {progress === 'uploading' && 'Subiendo archivo...'}
              {progress === 'uploaded' && 'Archivo subido ✓'}
              {progress === 'analyzing' && 'Analizando con IA... (puede tomar ~10s)'}
            </span>
          </div>
        </div>
      )}

      {/* Analysis Result */}
      {analysisResult && progress === 'done' && (
        <CVAnalysisResult data={analysisResult} />
      )}
    </div>
  );
}

function CVAnalysisResult({ data }: { data: any }) {
  const { analysis, profileMatch } = data;
  if (!analysis) return null;

  return (
    <div className="bg-zinc-800 rounded-lg p-4 space-y-4">
      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
        ✅ Análisis Completo
      </h3>

      {/* Summary */}
      {analysis.summary && (
        <div>
          <p className="text-sm text-zinc-400 font-medium mb-1">Resumen</p>
          <p className="text-zinc-200 text-sm">{analysis.summary}</p>
        </div>
      )}

      {/* Experience */}
      {analysis.years_experience != null && (
        <div className="flex gap-4">
          <div className="bg-zinc-700 rounded px-3 py-2">
            <p className="text-xs text-zinc-400">Experiencia</p>
            <p className="text-lg font-bold text-white">{analysis.years_experience} años</p>
          </div>
          {analysis.seniority && (
            <div className="bg-zinc-700 rounded px-3 py-2">
              <p className="text-xs text-zinc-400">Seniority</p>
              <p className="text-lg font-bold text-white capitalize">{analysis.seniority}</p>
            </div>
          )}
        </div>
      )}

      {/* Tech Stack */}
      {analysis.tech_stack?.length > 0 && (
        <div>
          <p className="text-sm text-zinc-400 font-medium mb-2">Tech Stack</p>
          <div className="flex flex-wrap gap-1.5">
            {analysis.tech_stack.map((tech: string) => (
              <span key={tech} className="bg-blue-500/20 text-blue-300 text-xs px-2 py-1 rounded">
                {tech}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Pre-flags */}
      {analysis.flags?.length > 0 && (
        <div>
          <p className="text-sm text-zinc-400 font-medium mb-2">⚠️ Pre-Interview Flags</p>
          <ul className="space-y-1">
            {analysis.flags.map((flag: any, i: number) => (
              <li key={i} className={`text-sm flex items-start gap-2 ${
                flag.severity === 'red' ? 'text-red-400' :
                flag.severity === 'yellow' ? 'text-yellow-400' : 'text-zinc-300'
              }`}>
                <span>{flag.severity === 'red' ? '🔴' : flag.severity === 'yellow' ? '🟡' : 'ℹ️'}</span>
                <span>{flag.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Profile Match */}
      {profileMatch && (
        <div className="border-t border-zinc-700 pt-3">
          <p className="text-sm text-zinc-400 font-medium mb-2">Profile Match</p>
          {profileMatch.bestMatch ? (
            <div className="flex items-center gap-3">
              <div className={`text-2xl font-bold ${
                profileMatch.bestMatch.score >= 0.7 ? 'text-green-400' :
                profileMatch.bestMatch.score >= 0.4 ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {Math.round(profileMatch.bestMatch.score * 100)}%
              </div>
              <div>
                <p className="text-white text-sm">{profileMatch.bestMatch.profileName}</p>
                <p className="text-zinc-400 text-xs">
                  {profileMatch.bestMatch.matchedSkills?.join(', ')}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-zinc-500 text-sm">No hay perfiles para comparar</p>
          )}
        </div>
      )}
    </div>
  );
}
