import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

export function ProgressBar({ current, total }: { current: number; total: number }) {
  const progress = (current / total) * 100;
  return (
    <div className="w-full h-1.5 bg-nexus-silver/50 rounded-full overflow-hidden mb-8">
      <motion.div
        className="h-full bg-nexus-cobalt"
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      />
    </div>
  );
}

export function OptionCard({
  title,
  selected,
  onClick,
}: {
  key?: React.Key;
  title: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 sm:p-4 rounded-xl border-2 transition-all duration-200 flex items-center justify-between ${
        selected
          ? 'border-nexus-cobalt bg-nexus-cobalt/5 shadow-[0_4px_14px_0_rgba(37,99,235,0.1)]'
          : 'border-nexus-silver bg-white hover:border-nexus-cobalt/30 hover:bg-nexus-bg'
      }`}
    >
      <span className={`text-sm sm:text-base font-medium ${selected ? 'text-nexus-navy' : 'text-gray-700'}`}>
        {title}
      </span>
      <div
        className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
          selected ? 'border-nexus-cobalt bg-nexus-cobalt' : 'border-nexus-silver'
        }`}
      >
        {selected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
      </div>
    </button>
  );
}

export function Chip({
  title,
  selected,
  onClick,
}: {
  key?: React.Key;
  title: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-200 border ${
        selected
          ? 'border-nexus-cobalt bg-nexus-cobalt text-white shadow-md'
          : 'border-nexus-silver bg-white text-gray-600 hover:border-nexus-cobalt/30 hover:bg-nexus-bg'
      }`}
    >
      {title}
    </button>
  );
}

export function TextInput({
  label,
  placeholder,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (val: string) => void;
  type?: string;
}) {
  return (
    <div className="flex flex-col gap-2 w-full">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full p-3 rounded-xl border border-nexus-silver bg-white text-nexus-navy placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-nexus-cobalt focus:border-transparent transition-all"
      />
    </div>
  );
}

export function TextArea({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (val: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2 w-full">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={4}
        className="w-full p-3 rounded-xl border border-nexus-silver bg-white text-nexus-navy placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-nexus-cobalt focus:border-transparent transition-all resize-none"
      />
    </div>
  );
}

export function Button({
  children,
  onClick,
  disabled,
  variant = 'primary',
  loading = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
  loading?: boolean;
}) {
  const baseStyle = "w-full py-4 px-6 rounded-xl font-bold text-lg transition-all duration-200 flex items-center justify-center gap-2";
  const primaryStyle = "bg-nexus-cobalt text-white hover:bg-nexus-cobalt/90 active:bg-nexus-navy shadow-lg shadow-nexus-cobalt/20 disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none";
  const secondaryStyle = "bg-white text-nexus-cobalt border-2 border-nexus-silver hover:bg-nexus-bg hover:border-nexus-cobalt/30 active:bg-nexus-silver disabled:bg-gray-50 disabled:text-gray-400 disabled:border-gray-200";

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseStyle} ${variant === 'primary' ? primaryStyle : secondaryStyle}`}
    >
      {loading ? (
        <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
      ) : (
        children
      )}
    </button>
  );
}

export function ScreenTransition({ children, keyId }: { children: React.ReactNode; keyId: string }) {
  return (
    <motion.div
      key={keyId}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="w-full flex flex-col items-center"
    >
      {children}
    </motion.div>
  );
}
