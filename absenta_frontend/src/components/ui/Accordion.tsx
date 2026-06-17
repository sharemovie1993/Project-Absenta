import React, { createContext, useContext, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils'; // Assuming cn utility exists, or I will use tailwind-merge directly if not

// Context to manage open state
type AccordionContextType = {
  openValue: string | null;
  toggle: (value: string) => void;
};

const AccordionContext = createContext<AccordionContextType | undefined>(undefined);

interface AccordionProps {
  children: React.ReactNode;
  type?: 'single' | 'multiple'; // Currently implementing single only for simplicity
  collapsible?: boolean;
  className?: string;
  defaultValue?: string;
}

export const Accordion = ({ children, className, defaultValue }: AccordionProps) => {
  const [openValue, setOpenValue] = useState<string | null>(defaultValue || null);

  const toggle = (value: string) => {
    setOpenValue(prev => (prev === value ? null : value));
  };

  return (
    <AccordionContext.Provider value={{ openValue, toggle }}>
      <div className={className}>{children}</div>
    </AccordionContext.Provider>
  );
};

interface AccordionItemProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export const AccordionItem = ({ value, children, className }: AccordionItemProps) => {
  return (
    <div className={cn("border border-gray-200 dark:border-gray-700 rounded-lg mb-2", className)}>
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          // @ts-expect-error - Cloning element to inject value prop
          return React.cloneElement(child, { value });
        }
        return child;
      })}
    </div>
  );
};

interface AccordionTriggerProps {
  children: React.ReactNode;
  className?: string;
  value?: string; // Injected by Item
}

export const AccordionTrigger = ({ children, className, value }: AccordionTriggerProps) => {
  const context = useContext(AccordionContext);
  if (!context) throw new Error("AccordionTrigger must be used within Accordion");
  
  const isOpen = context.openValue === value;

  return (
    <button
      type="button" // Important to prevent form submission
      onClick={() => value && context.toggle(value)}
      className={cn(
        "flex w-full items-center justify-between bg-white dark:bg-slate-900 px-4 py-3 text-sm font-medium transition-all hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-200",
        "rounded-t-lg",
        !isOpen && "rounded-b-lg",
        className
      )}
    >
      {children}
      <ChevronDown
        className={cn("h-4 w-4 shrink-0 transition-transform duration-200", isOpen ? "rotate-180" : "")}
      />
    </button>
  );
};

interface AccordionContentProps {
  children: React.ReactNode;
  className?: string;
  value?: string; // Injected by Item
}

export const AccordionContent = ({ children, className, value }: AccordionContentProps) => {
  const context = useContext(AccordionContext);
  if (!context) throw new Error("AccordionContent must be used within Accordion");

  const isOpen = context.openValue === value;

  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0, overflow: "hidden" }}
          animate={{ height: "auto", opacity: 1, transitionEnd: { overflow: "visible" } }}
          exit={{ height: 0, opacity: 0, overflow: "hidden" }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="bg-white dark:bg-slate-900"
        >
          <div className={cn("px-4 pb-4 pt-0 rounded-b-lg", className)}>{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
