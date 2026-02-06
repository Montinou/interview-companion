'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Lightbulb, FileText, TrendingUp, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AIInsight } from '@/lib/db/schema';

interface InsightCardProps {
  insight: AIInsight;
  index: number;
}

const insightConfig = {
  'red-flag': {
    icon: AlertTriangle,
    gradient: 'from-red-500/10 via-red-500/5 to-transparent',
    border: 'border-red-500/30',
    iconBg: 'bg-red-500/10',
    iconColor: 'text-red-600',
    label: 'Red Flag',
    labelBg: 'bg-red-500/20 text-red-700',
  },
  'suggestion': {
    icon: Lightbulb,
    gradient: 'from-yellow-500/10 via-yellow-500/5 to-transparent',
    border: 'border-yellow-500/30',
    iconBg: 'bg-yellow-500/10',
    iconColor: 'text-yellow-600',
    label: 'Suggestion',
    labelBg: 'bg-yellow-500/20 text-yellow-700',
  },
  'observation': {
    icon: FileText,
    gradient: 'from-blue-500/10 via-blue-500/5 to-transparent',
    border: 'border-blue-500/30',
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-600',
    label: 'Observation',
    labelBg: 'bg-blue-500/20 text-blue-700',
  },
  'scorecard-update': {
    icon: TrendingUp,
    gradient: 'from-green-500/10 via-green-500/5 to-transparent',
    border: 'border-green-500/30',
    iconBg: 'bg-green-500/10',
    iconColor: 'text-green-600',
    label: 'Score Update',
    labelBg: 'bg-green-500/20 text-green-700',
  },
};

export function InsightCard({ insight, index }: InsightCardProps) {
  const config = insightConfig[insight.type as keyof typeof insightConfig] || insightConfig.observation;
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 20, scale: 0.95 }}
      transition={{
        duration: 0.3,
        delay: index * 0.05,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      whileHover={{ scale: 1.01, transition: { duration: 0.2 } }}
      className={cn(
        'group relative overflow-hidden rounded-xl border backdrop-blur-sm',
        'bg-gradient-to-br',
        config.gradient,
        config.border
      )}
    >
      {/* Animated background shimmer */}
      <motion.div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        animate={{
          backgroundPosition: ['0% 0%', '100% 100%'],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          repeatType: 'reverse',
        }}
        style={{
          background: 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.1) 50%, transparent 70%)',
          backgroundSize: '200% 200%',
        }}
      />

      <div className="relative p-5">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <motion.div
            initial={{ rotate: -180, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            transition={{ duration: 0.4, delay: index * 0.05 + 0.1 }}
            className={cn('rounded-lg p-2.5', config.iconBg)}
          >
            <Icon className={cn('h-5 w-5', config.iconColor)} />
          </motion.div>

          {/* Content */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', config.labelBg)}>
                {config.label}
              </span>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {new Date(insight.timestamp).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>

            <motion.p
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 + 0.2 }}
              className="text-sm leading-relaxed text-foreground/90"
            >
              {insight.content}
            </motion.p>
          </div>
        </div>
      </div>

      {/* Bottom accent line */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.5, delay: index * 0.05 + 0.3 }}
        className={cn('h-0.5 origin-left', config.iconColor.replace('text-', 'bg-'))}
      />
    </motion.div>
  );
}
