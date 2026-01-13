
import React, { useState, useEffect, useRef } from 'react';
import { useI18n } from '../context/I18nContext';
import { Camera, X, CheckCircle, UserCheck, ShieldAlert, RefreshCw, UserPlus, ArrowRight } from 'lucide-react';

export const CheckInModule: React.FC<{ onDismiss: () => void }> = ({ onDismiss }) => {
  const { t } = useI18n();
  const [mode, setMode] = useState<'scan' | 'visitor'>('scan');
  const [result, setResult] = useState<null | 'success' | 'error'>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (mode === 'scan') {
      async function setupCamera() {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
          if (videoRef.current) videoRef.current.srcObject = stream;
        } catch (err) { console.error("Camera access failed", err); }
      }
      setupCamera();
      return () => {
        const stream = videoRef.current?.srcObject as MediaStream;
        stream?.getTracks().forEach(track => track.stop());
      };
    }
  }, [mode]);

  const simulateScan = () => {
    setTimeout(() => setResult(Math.random() > 0.2 ? 'success' : 'error'), 800);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center p-6">
      <button onClick={onDismiss} className="absolute top-6 right-6 text-white/50 hover:text-white p-2">
        <X size={32} />
      </button>

      <div className="w-full max-w-md bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-white/10">
        {mode === 'scan' ? (
          <div className="p-8 space-y-8">
            <div className="text-center">
              <h2 className="text-xl font-bold text-white">{t.attendance.memberCheckIn}</h2>
              <p className="text-slate-400 text-sm mt-1">{t.attendance.scanVerification}</p>
            </div>

            <div className="relative aspect-square rounded-2xl overflow-hidden bg-black ring-1 ring-white/20">
              <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
              <div className="absolute inset-0 border-[40px] border-slate-900/40"></div>
              <div className="absolute inset-10 border-2 border-blue-500/50 rounded-lg animate-pulse"></div>

              {result && (
                <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center animate-in zoom-in-95">
                  <div className={`p-4 rounded-full mb-4 ${result === 'success' ? 'bg-green-500' : 'bg-red-500'} text-white`}>
                    {result === 'success' ? <CheckCircle size={48} /> : <ShieldAlert size={48} />}
                  </div>
                  <h3 className="text-white font-bold text-lg">{result === 'success' ? t.attendance.verifiedSuccessfully : t.attendance.unrecognizedIdentity}</h3>
                  <button onClick={() => setResult(null)} className="mt-6 text-blue-400 text-sm font-bold uppercase tracking-widest">{t.attendance.retryScan}</button>
                </div>
              )}
            </div>

            <div className="flex flex-col space-y-3">
              <button onClick={simulateScan} className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center space-x-2">
                <Camera size={20} />
                <span>{t.attendance.simulateRecognition}</span>
              </button>
              <button onClick={() => setMode('visitor')} className="w-full py-4 bg-slate-800 text-slate-300 rounded-xl font-bold flex items-center justify-center space-x-2 border border-white/5">
                <UserPlus size={20} />
                <span>{t.attendance.visitorRegistration}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-8 space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-bold text-white">{t.attendance.visitorSignIn}</h2>
              <p className="text-slate-400 text-sm mt-1">{t.attendance.visitorSignInDesc}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t.attendance.fullName}</label>
                <input type="text" className="w-full bg-slate-800 border-none rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500" placeholder={t.attendance.fullNamePlaceholder} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t.attendance.organization}</label>
                <input type="text" className="w-full bg-slate-800 border-none rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500" placeholder={t.attendance.organizationPlaceholder} />
              </div>
            </div>

            <div className="pt-4 space-y-3">
              <button
                onClick={() => {setResult('success'); setMode('scan');}}
                className="w-full py-4 bg-green-600 text-white rounded-xl font-bold flex items-center justify-center space-x-2"
              >
                <span>{t.attendance.completeRegistration}</span>
                <ArrowRight size={20} />
              </button>
              <button onClick={() => setMode('scan')} className="w-full text-slate-500 text-sm font-bold">{t.attendance.backToScanner}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
