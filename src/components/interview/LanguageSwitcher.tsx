'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe } from 'lucide-react';

const LANGUAGES = [
  { code: 'es', label: 'ES', flag: '🇪🇸', name: 'Español' },
  { code: 'en', label: 'EN', flag: '🇺🇸', name: 'English' },
  { code: 'multi', label: 'Multi', flag: '🌐', name: 'Multilingual' },
] as const;

type LanguageCode = (typeof LANGUAGES)[number]['code'];

interface LanguageSwitcherProps {
  value?: LanguageCode;
  onChange?: (language: LanguageCode) => void;
  /** Compact mode for tight spaces */
  compact?: boolean;
}

export function LanguageSwitcher({
  value = 'es',
  onChange,
  compact = false,
}: LanguageSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const current = LANGUAGES.find((l) => l.code === value) || LANGUAGES[0];

  const handleSelect = (code: LanguageCode) => {
    onChange?.(code);
    setIsOpen(false);
  };

  if (compact) {
    // Inline toggle buttons
    return (
      <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50 border">
        {LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            onClick={() => handleSelect(lang.code)}
            className={`
              px-2.5 py-1 rounded-md text-xs font-medium transition-all
              ${value === lang.code
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }
            `}
            title={lang.name}
          >
            <span className="mr-1">{lang.flag}</span>
            {lang.label}
          </button>
        ))}
      </div>
    );
  }

  // Dropdown style
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-card/50 hover:bg-card transition-colors text-sm font-medium"
      >
        <Globe className="h-4 w-4 text-muted-foreground" />
        <span>{current.flag}</span>
        <span>{current.label}</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            
            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 z-50 min-w-[160px] rounded-xl border bg-card shadow-lg p-1"
            >
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleSelect(lang.code)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors
                    ${value === lang.code
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'hover:bg-muted text-foreground'
                    }
                  `}
                >
                  <span className="text-base">{lang.flag}</span>
                  <div className="text-left">
                    <p className="font-medium">{lang.label}</p>
                    <p className="text-xs text-muted-foreground">{lang.name}</p>
                  </div>
                  {value === lang.code && (
                    <motion.div
                      layoutId="language-check"
                      className="ml-auto h-2 w-2 rounded-full bg-primary"
                    />
                  )}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
