import React from 'react';

export const ProviderLogo: React.FC<{ provider: string; className?: string }> = ({ provider, className = 'w-6 h-6' }) => {
  switch (provider.toLowerCase()) {
    case 'supabase':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M21.3622 9.35425H12V0.3125C12 0.0520833 11.6875 -0.09375 11.4792 0.0833333L0.166667 12.0156C-0.03125 12.224 0.114583 12.5729 0.395833 12.5729H9.75V21.6146C9.75 21.875 10.0625 22.0208 10.2708 21.8438L21.5833 9.91146C21.7812 9.70312 21.6354 9.35425 21.3622 9.35425Z"
            fill="url(#supabase-gradient)"
          />
          <defs>
            <linearGradient id="supabase-gradient" x1="0" y1="0" x2="22" y2="22" gradientUnits="userSpaceOnUse">
              <stop stopColor="#24E19C" />
              <stop offset="1" stopColor="#3ECF8E" />
            </linearGradient>
          </defs>
        </svg>
      );

    case 'google_gemini':
    case 'gemini':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M12 0C12 6.627 6.627 12 0 12C6.627 12 12 17.373 12 24C12 17.373 17.373 12 24 12C17.373 12 12 6.627 12 0Z"
            fill="url(#gemini-gradient)"
          />
          <defs>
            <linearGradient id="gemini-gradient" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
              <stop stopColor="#4E8CFF" />
              <stop offset="0.5" stopColor="#8E78FF" />
              <stop offset="1" stopColor="#F872A4" />
            </linearGradient>
          </defs>
        </svg>
      );

    case 'freellmapi':
    case 'freellm':
    case 'qwen':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="url(#qwen-grad)" strokeWidth="2" />
          <circle cx="12" cy="12" r="4" fill="url(#qwen-grad)" />
          <path d="M12 2V6M12 18V22M2 12H6M18 12H22" stroke="url(#qwen-grad)" strokeWidth="2" strokeLinecap="round" />
          <defs>
            <linearGradient id="qwen-grad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
              <stop stopColor="#A855F7" />
              <stop offset="1" stopColor="#6366F1" />
            </linearGradient>
          </defs>
        </svg>
      );

    case 'google_workspace':
    case 'gmail':
      return (
        <svg viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg">
          <path d="M1.5 5.5v13a2 2 0 0 0 2 2h2.5V11.25L12 15.5l6-4.25V20.5h2.5a2 2 0 0 0 2-2v-13a2 2 0 0 0-3.15-1.63L12 9.25 4.65 3.87A2 2 0 0 0 1.5 5.5z" fill="#EA4335" />
          <path d="M6 20.5V11.25L1.5 8v10.5a2 2 0 0 0 2 2H6z" fill="#4285F4" />
          <path d="M18 20.5h2.5a2 2 0 0 0 2-2V8l-4.5 3.25V20.5z" fill="#34A853" />
          <path d="M18 5.5L12 9.75 6 5.5 4.65 3.87A2 2 0 0 1 6 3.5h12c.53 0 1.04.21 1.41.58L18 5.5z" fill="#FBBC05" />
        </svg>
      );

    case 'netlify':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M6.88 12.35L11.53 7.7a.64.64 0 0 1 .91 0l4.65 4.65a.64.64 0 0 1 0 .91l-4.65 4.65a.64.64 0 0 1-.91 0l-4.65-4.65a.64.64 0 0 1 0-.91z"
            fill="#00C7B7"
          />
          <path d="M12 2L2 12l10 10 10-10L12 2zm0 17.5L4.5 12 12 4.5 19.5 12 12 19.5z" fill="#20C6B7" fillOpacity="0.4" />
        </svg>
      );

    case 'google_places':
    case 'google_maps':
      return (
        <svg viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#EA4335" />
          <circle cx="12" cy="9" r="3" fill="#FFFFFF" />
        </svg>
      );

    case 'tavily':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="9" stroke="#38BDF8" strokeWidth="2" />
          <path d="M12 7V17M7 12H17" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" />
          <circle cx="12" cy="12" r="2.5" fill="#38BDF8" />
        </svg>
      );

    case 'hunter':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="9" stroke="#F97316" strokeWidth="2" />
          <circle cx="12" cy="12" r="5" stroke="#F97316" strokeWidth="1.5" strokeDasharray="3 3" />
          <circle cx="12" cy="12" r="2" fill="#F97316" />
        </svg>
      );

    case 'prospeo':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L4 6V11C4 16.55 7.42 21.74 12 23C16.58 21.74 20 16.55 20 11V6L12 2Z" stroke="#EC4899" strokeWidth="2" fill="#EC4899" fillOpacity="0.15" />
          <path d="M9 12L11 14L15 10" stroke="#EC4899" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case 'whatsapp':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" fill="#25D366" />
          <path
            d="M17.5 14.3c-.2-.1-1.3-.6-1.5-.7-.2-.1-.3-.1-.5.1-.1.2-.5.7-.7.8-.1.1-.3.1-.5 0-.2-.1-.9-.3-1.7-1.1-.6-.6-1.1-1.3-1.2-1.5-.1-.2 0-.3.1-.5.1-.1.2-.2.3-.4.1-.1.1-.2.2-.3 0-.1 0-.2 0-.3s-.4-1.1-.6-1.5c-.2-.4-.4-.3-.5-.3h-.4c-.1 0-.4.1-.6.3-.2.2-.8.8-.8 1.9s.8 2.2.9 2.4c.1.1 1.6 2.5 3.9 3.5.5.2 1 .4 1.3.5.6.2 1.1.2 1.5.1.5-.1 1.3-.6 1.5-1.1.2-.5.2-1 .1-1.1-.1-.2-.2-.2-.4-.3z"
            fill="#FFFFFF"
          />
        </svg>
      );

    default:
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v8M8 12h8" />
        </svg>
      );
  }
};
