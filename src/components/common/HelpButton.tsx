import React, { useState, useRef, useEffect } from 'react';
import { HelpCircle, X } from 'lucide-react';

interface HelpButtonProps {
  title: string;
  description: string;
  ariaLabel?: string;
}

export const HelpButton: React.FC<HelpButtonProps> = ({
  title,
  description,
  ariaLabel = 'Ver explicación',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="help-button-container" ref={containerRef}>
      <button
        type="button"
        className={`help-icon-btn ${isOpen ? 'active' : ''}`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        title={ariaLabel}
      >
        <span className="help-icon-char">?</span>
      </button>

      {isOpen && (
        <div
          className="inline-help-card"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="inline-help-header">
            <div className="inline-help-title">
              <HelpCircle size={15} color="var(--primary)" />
              <span>{title}</span>
            </div>
            <button
              type="button"
              className="inline-help-close"
              onClick={() => setIsOpen(false)}
              aria-label="Cerrar ayuda"
            >
              <X size={14} />
            </button>
          </div>
          <p className="inline-help-text">{description}</p>
        </div>
      )}
    </div>
  );
};
