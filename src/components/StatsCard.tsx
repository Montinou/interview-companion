'use client';

import { motion } from 'framer-motion';
import { Clock, User, CheckCircle, AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';

// Map of icon names to components - icons must be defined in client component
const iconMap = {
  clock: Clock,
  user: User,
  check: CheckCircle,
  alert: AlertTriangle,
  'trending-up': TrendingUp,
  'trending-down': TrendingDown,
} as const;

type IconName = keyof typeof iconMap;

interface StatsCardProps {
  icon: IconName;
  label: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple';
  delay?: number;
}

const colorClasses = {
  blue: 'from-blue-500/10 to-blue-600/5 border-blue-500/20 text-blue-600',
  green: 'from-green-500/10 to-green-600/5 border-green-500/20 text-green-600',
  red: 'from-red-500/10 to-red-600/5 border-red-500/20 text-red-600',
  yellow: 'from-yellow-500/10 to-yellow-600/5 border-yellow-500/20 text-yellow-600',
  purple: 'from-purple-500/10 to-purple-600/5 border-purple-500/20 text-purple-600',
};

export function StatsCard({
  icon,
  label,
  value,
  subtitle,
  trend,
  color = 'blue',
  delay = 0,
}: StatsCardProps) {
  const Icon = iconMap[icon];
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
    >
      <Card className={cn(
        'relative overflow-hidden bg-gradient-to-br backdrop-blur-sm',
        colorClasses[color]
      )}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground mb-1">{label}</p>
              <motion.p
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3, delay: delay + 0.1 }}
                className="text-3xl font-bold tracking-tight"
              >
                {value}
              </motion.p>
              {subtitle && (
                <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
              )}
            </div>
            <motion.div
              initial={{ rotate: -180, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: delay + 0.2 }}
              className={cn('rounded-lg p-3', `bg-${color}-500/10`)}
            >
              <Icon className="h-6 w-6" />
            </motion.div>
          </div>
          
          {trend && (
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              transition={{ duration: 0.6, delay: delay + 0.3 }}
              className={cn(
                'absolute bottom-0 left-0 h-1',
                trend === 'up' && 'bg-green-500',
                trend === 'down' && 'bg-red-500',
                trend === 'neutral' && 'bg-gray-500'
              )}
            />
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
