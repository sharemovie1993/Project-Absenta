import React, { useState, createContext, useContext } from 'react';
import { cn } from '@/lib/utils';

interface TabsContextType {
  value: string;
  onValueChange: (value: string) => void;
  color: TabsColor;
  variant: TabsVariant;
}

const TabsContext = createContext<TabsContextType | undefined>(undefined);

type TabsColor = 'primary' | 'secondary' | 'accent' | 'blue' | 'green' | 'red' | 'purple' | 'indigo' | 'yellow';
type TabsVariant = 'solid' | 'soft' | 'outline';

interface TabsProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  children: React.ReactNode;
  color?: TabsColor;
  variant?: TabsVariant;
}

interface TabsListProps {
  className?: string;
  children: React.ReactNode;
}

interface TabsTriggerProps {
  value: string;
  className?: string;
  children: React.ReactNode;
}

interface TabsContentProps {
  value: string;
  className?: string;
  children: React.ReactNode;
}

function getPalette(color: TabsColor) {
  switch (color) {
    case 'primary':
      return { bg: 'bg-primary', text: 'text-primary', border: 'border-primary', hoverSoft: 'hover:bg-primary/10', fg: 'text-primary-foreground' };
    case 'secondary':
      return { bg: 'bg-secondary', text: 'text-secondary', border: 'border-secondary', hoverSoft: 'hover:bg-secondary/10', fg: 'text-secondary-foreground' };
    case 'accent':
      return { bg: 'bg-accent', text: 'text-accent', border: 'border-accent', hoverSoft: 'hover:bg-accent/10', fg: 'text-accent-foreground' };
    case 'blue':
      return { bg: 'bg-blue-600', text: 'text-blue-600', border: 'border-blue-600', hoverSoft: 'hover:bg-blue-50', fg: 'text-white' };
    case 'green':
      return { bg: 'bg-green-600', text: 'text-green-600', border: 'border-green-600', hoverSoft: 'hover:bg-green-50', fg: 'text-white' };
    case 'red':
      return { bg: 'bg-red-600', text: 'text-red-600', border: 'border-red-600', hoverSoft: 'hover:bg-red-50', fg: 'text-white' };
    case 'purple':
      return { bg: 'bg-purple-600', text: 'text-purple-600', border: 'border-purple-600', hoverSoft: 'hover:bg-purple-50', fg: 'text-white' };
    case 'indigo':
      return { bg: 'bg-indigo-600', text: 'text-indigo-600', border: 'border-indigo-600', hoverSoft: 'hover:bg-indigo-50', fg: 'text-white' };
    case 'yellow':
      return { bg: 'bg-yellow-500', text: 'text-yellow-600', border: 'border-yellow-500', hoverSoft: 'hover:bg-yellow-50', fg: 'text-gray-900' };
    default:
      return { bg: 'bg-primary', text: 'text-primary', border: 'border-primary', hoverSoft: 'hover:bg-primary/10', fg: 'text-primary-foreground' };
  }
}

export function Tabs({ 
  value: controlledValue, 
  defaultValue, 
  onValueChange, 
  className, 
  children,
  color = 'primary',
  variant = 'soft'
}: TabsProps) {
  const [internalValue, setInternalValue] = useState(defaultValue || '');
  
  const value = controlledValue !== undefined ? controlledValue : internalValue;
  
  const handleValueChange = (newValue: string) => {
    if (controlledValue === undefined) {
      setInternalValue(newValue);
    }
    onValueChange?.(newValue);
  };

  return (
    <TabsContext.Provider value={{ value, onValueChange: handleValueChange, color, variant }}>
      <div className={cn('w-full', className)}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

export function TabsList({ className, children }: TabsListProps) {
  return (
    <div className={cn(
      'inline-flex h-10 items-center justify-center rounded-md bg-gray-100 p-1 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
      className
    )}>
      {children}
    </div>
  );
}

export function TabsTrigger({ value, className, children }: TabsTriggerProps) {
  const context = useContext(TabsContext);
  
  if (!context) {
    throw new Error('TabsTrigger must be used within a Tabs component');
  }

  const { value: currentValue, onValueChange, color, variant } = context;
  const isActive = currentValue === value;
  const palette = getPalette(color);
  const activeClass = (() => {
    if (variant === 'solid') return cn(palette.bg, palette.fg, 'shadow-sm');
    if (variant === 'outline') return cn('border', palette.border, palette.text, 'bg-white dark:bg-gray-700 dark:text-white');
    return cn('bg-white dark:bg-gray-600 dark:text-white', palette.text);
  })();
  const inactiveClass = (() => {
    if (variant === 'solid') return cn('text-gray-600 dark:text-gray-400', palette.hoverSoft);
    if (variant === 'outline') return cn('border border-transparent text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600');
    return cn('hover:bg-white/50 dark:hover:bg-gray-700/50 text-gray-600 dark:text-gray-400');
  })();

  return (
    <button
      type="button"
      onClick={() => onValueChange(value)}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
        isActive ? activeClass : inactiveClass,
        className
      )}
    >
      {children}
    </button>
  );
}

export function TabsContent({ value, className, children }: TabsContentProps) {
  const context = useContext(TabsContext);
  
  if (!context) {
    throw new Error('TabsContent must be used within a Tabs component');
  }

  const { value: currentValue } = context;
  
  if (currentValue !== value) {
    return null;
  }

  return (
    <div className={cn(
      'mt-2 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
      className
    )}>
      {children}
    </div>
  );
}

export default Tabs;
