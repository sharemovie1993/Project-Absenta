import React from 'react';

interface ResolutionTextRendererProps {
  text: string;
  className?: string;
  isTeleprompter?: boolean;
}

// Regex to capture markdown bold **text**
const MARKDOWN_BOLD_REGEX = /\*\*(.*?)\*\*/g;

// Key legal and statistic patterns to automatically highlight
const STAT_PATTERNS = [
  /(\b\d+(?:[\.,]\d+)?\s*(?:suara|anggota)\b)/gi,
  /(\b\d+(?:[\.,]\d+)?%\b)/gi,
  /(Total Suara Masuk:)/gi,
  /(Kuorum kehadiran sah)/gi,
  /(Disetujui secara aklamasi)/gi,
];

/**
 * Splits line and renders bold tokens from both markdown **bold** and statutory legal keywords
 */
function renderStyledLine(lineText: string, isOrdinal = false): React.ReactNode {
  // If line contains markdown bold, parse it first
  if (MARKDOWN_BOLD_REGEX.test(lineText)) {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    const regex = new RegExp(MARKDOWN_BOLD_REGEX);
    let match: RegExpExecArray | null;

    while ((match = regex.exec(lineText)) !== null) {
      if (match.index > lastIndex) {
        parts.push(highlightStats(lineText.substring(lastIndex, match.index)));
      }
      parts.push(
        <strong key={`b-${match.index}`} className="font-bold text-slate-900 dark:text-white">
          {match[1]}
        </strong>
      );
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < lineText.length) {
      parts.push(highlightStats(lineText.substring(lastIndex)));
    }
    return <>{parts}</>;
  }

  // Otherwise, highlight ordinals and statutory stats automatically
  return highlightStats(lineText, isOrdinal);
}

/**
 * Automatically bold key figures (vote counts, member counts, percentages, and ordinals)
 */
function highlightStats(textChunk: string, isOrdinal = false): React.ReactNode {
  // Check for statutory ordinals at start
  const ordinalMatch = textChunk.match(/^(PERTAMA|KEDUA|KETIGA|KEEMPAT|KELIMA|KEENAM|KETUJUH|KEDELAPAN|KESEMBILAN|KESEPULUH):/i);
  if (ordinalMatch) {
    const ord = ordinalMatch[1].toUpperCase();
    const rest = textChunk.substring(ordinalMatch[0].length);
    return (
      <>
        <strong className="font-black text-slate-900 dark:text-white tracking-wide">
          {ord}:
        </strong>
        {highlightStats(rest)}
      </>
    );
  }

  // Auto-bold numbers with 'suara', 'anggota', percentages, and key labels
  let tokens: (string | React.ReactNode)[] = [textChunk];

  STAT_PATTERNS.forEach((pattern, pIdx) => {
    const nextTokens: (string | React.ReactNode)[] = [];
    tokens.forEach((token) => {
      if (typeof token !== 'string') {
        nextTokens.push(token);
        return;
      }
      const parts = token.split(pattern);
      for (let i = 0; i < parts.length; i++) {
        if (i % 2 === 1) {
          nextTokens.push(
            <strong key={`stat-${pIdx}-${i}`} className="font-bold text-slate-900 dark:text-white">
              {parts[i]}
            </strong>
          );
        } else if (parts[i]) {
          nextTokens.push(parts[i]);
        }
      }
    });
    tokens = nextTokens;
  });

  return <>{tokens}</>;
}

export const ResolutionTextRenderer: React.FC<ResolutionTextRendererProps> = React.memo(({
  text,
  className = '',
  isTeleprompter = false,
}) => {
  if (!text) return null;

  const lines = text.split('\n');

  return (
    <div className={`space-y-2.5 ${className}`}>
      {lines.map((rawLine, idx) => {
        const trimmed = rawLine.trim();

        // Empty line spacer
        if (!trimmed) {
          return <div key={`empty-${idx}`} className="h-2" />;
        }

        // Section Headers (MENIMBANG, MENGINGAT, MEMPERHATIKAN, MEMUTUSKAN, MENETAPKAN)
        const isSectionHeader = /^(MENIMBANG|MENGINGAT|MEMPERHATIKAN|MEMUTUSKAN|MENETAPKAN):?$/i.test(trimmed);
        if (isSectionHeader) {
          return (
            <div
              key={`header-${idx}`}
              className="font-sans font-black text-xs sm:text-sm tracking-wider uppercase text-slate-900 dark:text-white pt-3 pb-0.5 border-b border-slate-200 dark:border-slate-700/80"
            >
              {trimmed.replace(/:$/, '')}:
            </div>
          );
        }

        // Ordinal Decree items (PERTAMA:, KEDUA:, etc.)
        const isOrdinal = /^(PERTAMA|KEDUA|KETIGA|KEEMPAT|KELIMA|KEENAM|KETUJUH|KEDELAPAN):/i.test(trimmed);
        if (isOrdinal) {
          return (
            <div
              key={`ord-${idx}`}
              className="pl-3 sm:pl-4 border-l-2 border-indigo-500/80 dark:border-indigo-400 py-0.5 leading-relaxed"
            >
              {renderStyledLine(trimmed, true)}
            </div>
          );
        }

        // Bullet / Sub-item (1., 2., a., b., -)
        const isSubItem = /^(\d+\.|\w\.|-|\*)\s+/i.test(trimmed);
        if (isSubItem) {
          return (
            <div
              key={`sub-${idx}`}
              className="pl-4 sm:pl-6 -indent-4 sm:-indent-5 leading-relaxed text-slate-800 dark:text-slate-200"
            >
              {renderStyledLine(trimmed)}
            </div>
          );
        }

        // Standard text paragraph
        return (
          <p
            key={`p-${idx}`}
            className="leading-relaxed text-justify text-slate-800 dark:text-slate-200"
          >
            {renderStyledLine(trimmed)}
          </p>
        );
      })}
    </div>
  );
});

ResolutionTextRenderer.displayName = 'ResolutionTextRenderer';
