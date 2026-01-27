import React from 'react';
import { getNoteName, isMarkedFret } from '../utils/noteLogic';

interface FretboardProps {
  showNotes?: boolean;
  highlightedNote?: { string: number; fret: number } | null;
  onFretClick?: (stringIndex: number, fret: number) => void;
  fretCount?: number;
}

export const Fretboard: React.FC<FretboardProps> = ({ 
  showNotes = false, 
  highlightedNote, 
  onFretClick, 
  fretCount = 12 
}) => {
  const strings = 6;
  
  // Dimensions
  const height = 200;
  const width = 800;
  const paddingX = 40;
  const paddingY = 20;
  const stringSpacing = (height - 2 * paddingY) / (strings - 1);
  const fretSpacing = (width - 2 * paddingX) / fretCount;

  const renderStrings = () => {
    return Array.from({ length: strings }).map((_, i) => {
      const y = paddingY + i * stringSpacing;
      return (
        <line
          key={`string-${i}`}
          x1={paddingX}
          y1={y}
          x2={width - paddingX}
          y2={y}
          stroke="#e2e8f0"
          strokeWidth={i + 1} // Thicker for low strings (high index)
          className="opacity-80"
        />
      );
    });
  };

  const renderFrets = () => {
    return Array.from({ length: fretCount + 1 }).map((_, i) => {
      const x = paddingX + i * fretSpacing;
      return (
        <React.Fragment key={`fret-${i}`}>
          {/* Fret Bar */}
          {i > 0 && (
            <line
              x1={x}
              y1={paddingY}
              x2={x}
              y2={height - paddingY}
              stroke="#94a3b8"
              strokeWidth={4}
            />
          )}
          {/* Fret Marker (Inlay) */}
          {isMarkedFret(i) && (
            <circle
              cx={paddingX + (i * fretSpacing) - (fretSpacing / 2)}
              cy={height / 2}
              r={6}
              fill="#64748b"
              className="opacity-50"
            />
          )}
          {/* Double marker for 12th fret */}
          {i === 12 && (
             <circle
             cx={paddingX + (i * fretSpacing) - (fretSpacing / 2)}
             cy={height / 2 + stringSpacing}
             r={6}
             fill="#64748b"
             className="opacity-50"
           />
          )}
          {/* Fret Number */}
          <text
            x={paddingX + (i * fretSpacing) - (fretSpacing / 2)}
            y={height + 20}
            fill="#94a3b8"
            fontSize="12"
            textAnchor="middle"
          >
            {i === 0 ? "Open" : i}
          </text>
        </React.Fragment>
      );
    });
  };

  const renderInteractionTargets = () => {
    const targets = [];
    for (let s = 0; s < strings; s++) {
      for (let f = 0; f <= fretCount; f++) {
        const x = paddingX + f * fretSpacing - (f === 0 ? 10 : fretSpacing / 2);
        const y = paddingY + s * stringSpacing;
        
        const isHighlighted = highlightedNote?.string === s && highlightedNote?.fret === f;
        const noteName = getNoteName(s, f);

        targets.push(
          <g 
            key={`target-${s}-${f}`} 
            onClick={() => onFretClick && onFretClick(s, f)}
            className="cursor-pointer hover:opacity-80"
          >
            {/* Invisible Hitbox for easier tapping */}
            <rect
              x={f === 0 ? paddingX - 20 : paddingX + (f - 1) * fretSpacing}
              y={y - stringSpacing / 2}
              width={f === 0 ? 30 : fretSpacing}
              height={stringSpacing}
              fill="transparent"
            />
            
            {/* Note Circle (Visible if highlighted or showNotes) */}
            {(showNotes || isHighlighted) && (
              <circle
                cx={f === 0 ? paddingX - 10 : x}
                cy={y}
                r={12}
                fill={isHighlighted ? '#10b981' : '#334155'}
                stroke={isHighlighted ? '#ffffff' : 'none'}
                strokeWidth={2}
              />
            )}

            {/* Note Text */}
            {(showNotes || isHighlighted) && (
               <text
               x={f === 0 ? paddingX - 10 : x}
               y={y + 4}
               fill="#fff"
               fontSize="10"
               textAnchor="middle"
               fontWeight="bold"
               pointerEvents="none"
             >
               {noteName}
             </text>
            )}
          </g>
        );
      }
    }
    return targets;
  };

  return (
    <div className="w-full overflow-x-auto p-4 bg-slate-800 rounded-lg shadow-xl">
      <svg
        viewBox={`0 0 ${width} ${height + 30}`}
        className="w-full min-w-[800px]"
        style={{ touchAction: 'pan-x' }} // Allow horizontal scroll but not zoom
      >
        {renderFrets()}
        {renderStrings()}
        {renderInteractionTargets()}
      </svg>
    </div>
  );
};
