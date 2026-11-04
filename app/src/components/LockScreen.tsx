import React, { useState, useEffect } from 'react';
import { Lock, ArrowRight, AlertCircle, ShieldAlert, KeyRound, Eye, EyeOff } from 'lucide-react';

interface LockScreenProps {
  onUnlock: (pin: string) => Promise<boolean>;
}

export const LockScreen: React.FC<LockScreenProps> = ({ onUnlock }) => {
  const [pin, setPin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (enteredPin = pin) => {
    if (!enteredPin.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const success = await onUnlock(enteredPin.trim());
      if (!success) {
        setErrorMsg('Invalid Security Clearance PIN.');
        setShake(true);
        setTimeout(() => setShake(false), 500);
      }
    } catch {
      setErrorMsg('Clearance verification error. Try again.');
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Physical Keyboard Support
  useEffect(() => {
    const handlePhysicalKeyDown = (e: KeyboardEvent) => {
      // Numbers 0-9
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        setPin((prev) => (prev.length < 12 ? prev + e.key : prev));
        setErrorMsg(null);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        setPin((prev) => prev.slice(0, -1));
        setErrorMsg(null);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      } else if (e.key === 'Escape' || e.key.toLowerCase() === 'c') {
        setPin('');
        setErrorMsg(null);
      }
    };

    window.addEventListener('keydown', handlePhysicalKeyDown);
    return () => window.removeEventListener('keydown', handlePhysicalKeyDown);
  }, [pin, isSubmitting]);

  const handleKeypadPress = (val: string) => {
    if (val === 'C') {
      setPin('');
      setErrorMsg(null);
    } else if (val === 'DEL') {
      setPin((prev) => prev.slice(0, -1));
      setErrorMsg(null);
    } else if (val === 'ENTER') {
      handleSubmit();
    } else {
      if (pin.length < 12) {
        setPin((prev) => prev + val);
        setErrorMsg(null);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#060608] flex items-center justify-center p-4 relative overflow-hidden select-none font-sans text-zinc-100">
      {/* Background ambient dark glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[360px] bg-gradient-to-b from-white/[0.04] to-transparent rounded-full blur-3xl pointer-events-none"></div>

      <div className={`w-full max-w-sm relative z-10 transition-transform ${shake ? 'animate-bounce' : ''}`}>
        <div className="rounded-2xl bg-zinc-950/85 border border-white/[0.1] backdrop-blur-2xl p-7 shadow-2xl shadow-black/95 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-black border border-white/20 shadow-[0_0_20px_rgba(255,255,255,0.2)] mb-1">
              <span className="text-xl text-white select-none">✦</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white uppercase font-sans">
              Irzam Studio
            </h1>
            <p className="text-xs text-zinc-400 font-medium">
              Autonomous Operative Platform · Clearance Required
            </p>
          </div>

          {/* PIN Input */}
          <div className="space-y-2">
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                readOnly
                value={pin}
                placeholder="••••"
                className="w-full bg-zinc-900/90 border border-white/10 focus:border-white/30 rounded-xl px-4 py-3 text-center text-xl font-mono tracking-widest text-white placeholder-zinc-700 focus:outline-none transition shadow-inner cursor-default"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-1 cursor-pointer"
                title={showPassword ? 'Hide PIN' : 'Show PIN'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {errorMsg ? (
              <div className="flex items-center justify-center gap-1.5 text-xs text-rose-400 font-medium pt-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{errorMsg}</span>
              </div>
            ) : (
              <p className="text-center text-[10px] text-zinc-500 font-mono">
                Type directly with keyboard or use keypad below
              </p>
            )}
          </div>

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'DEL'].map((btn) => (
              <button
                key={btn}
                type="button"
                onClick={() => handleKeypadPress(btn)}
                className="py-3 rounded-xl bg-zinc-900/60 hover:bg-zinc-800 border border-white/[0.06] text-sm font-mono font-semibold text-zinc-200 hover:text-white transition active:scale-95 cursor-pointer shadow-sm"
              >
                {btn}
              </button>
            ))}
          </div>

          {/* Submit */}
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={!pin || isSubmitting}
            className={`w-full py-3 rounded-xl font-bold text-xs tracking-wide transition cursor-pointer flex items-center justify-center gap-2 shadow-lg ${
              pin && !isSubmitting
                ? 'bg-white text-zinc-950 hover:bg-zinc-200'
                : 'bg-zinc-900 text-zinc-500 cursor-not-allowed border border-white/[0.04]'
            }`}
          >
            <span>{isSubmitting ? 'Verifying Clearance...' : 'Authenticate Access'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <div className="text-center pt-1 border-t border-white/[0.06]">
            <span className="text-[11px] text-zinc-500 font-mono">
              Owner PIN is securely configured for this deployment.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
