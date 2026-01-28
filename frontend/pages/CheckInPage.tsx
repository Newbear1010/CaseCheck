import React, { useEffect, useState } from 'react';
import { attendanceService } from '../services/attendanceService';
import { useI18n } from '../context/I18nContext';

export const CheckInPage: React.FC = () => {
  const { t } = useI18n();
  const [qrCode, setQrCode] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error' | 'loading'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) {
      setQrCode(code);
      handleCheckIn(code);
    }
  }, []);

  const handleCheckIn = async (codeOverride?: string) => {
    const code = codeOverride ?? qrCode.trim();
    if (!code) {
      setStatus('error');
      setMessage(t.attendance.qrCodeRequired);
      return;
    }
    setStatus('loading');
    setMessage('');
    try {
      await attendanceService.checkIn(code);
      setStatus('success');
      setMessage(t.attendance.checkInSuccess);
    } catch (error: any) {
      setStatus('error');
      setMessage(error?.response?.data?.message || t.attendance.scanFailed);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-slate-900 border border-white/10 rounded-2xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-xl font-bold">{t.attendance.checkIn}</h1>
          <p className="text-sm text-slate-400">{t.attendance.scanVerification}</p>
          <p className="text-xs text-slate-500">{t.attendance.checkInPageHint}</p>
        </div>

        <div className="space-y-3">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t.attendance.qrCodeLabel}</label>
          <input
            value={qrCode}
            onChange={(event) => setQrCode(event.target.value)}
            className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
            placeholder={t.attendance.qrCodePlaceholder}
          />
        </div>

        <button
          onClick={() => handleCheckIn()}
          className="w-full py-3 rounded-lg bg-blue-600 font-bold disabled:opacity-60"
          disabled={status === 'loading'}
        >
          {status === 'loading' ? t.attendance.scanning : t.attendance.submitScan}
        </button>

        {message && (
          <div className={`text-sm ${status === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
};
