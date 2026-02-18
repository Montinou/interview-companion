'use client';

import { Globe, Check } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

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
  const current = LANGUAGES.find((l) => l.code === value) || LANGUAGES[0];

  if (compact) {
    // Inline toggle buttons using ToggleGroup
    return (
      <ToggleGroup
        type="single"
        value={value}
        onValueChange={(v) => v && onChange?.(v as LanguageCode)}
        className="gap-1 p-1 bg-muted/50 border rounded-lg"
      >
        {LANGUAGES.map((lang) => (
          <ToggleGroupItem
            key={lang.code}
            value={lang.code}
            className="px-2.5 py-1 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            title={lang.name}
          >
            <span className="mr-1">{lang.flag}</span>
            {lang.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    );
  }

  // Dropdown style using DropdownMenu
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="bg-card/50">
          <Globe className="h-4 w-4 mr-2 text-muted-foreground" />
          <span>{current.flag}</span>
          <span className="ml-1">{current.label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[160px]">
        {LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => onChange?.(lang.code)}
            className={value === lang.code ? 'bg-primary/10 text-primary font-medium' : ''}
          >
            <span className="text-base mr-3">{lang.flag}</span>
            <div className="flex-1">
              <p className="font-medium">{lang.label}</p>
              <p className="text-xs text-muted-foreground">{lang.name}</p>
            </div>
            {value === lang.code && (
              <Check className="h-4 w-4 ml-auto" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
