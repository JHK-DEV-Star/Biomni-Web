// ============================================
// Create Node Menu — shows on double-click in empty area
// ============================================

import { useState, useRef, useEffect } from 'react';
import { getByCategory } from '../node-registry';
import type { I18nField } from '../types';

interface CreateNodeMenuProps {
  x: number;
  y: number;
  onSelect: (type: string) => void;
  onClose: () => void;
}

// Module-level: persists toggle state across menu open/close within session
let sessionExpandedCats: Set<string> = new Set();

function resolveI18n(field?: I18nField): string {
  if (!field) return '';
  const lang = document.documentElement.lang || 'en';
  return field[lang] || field.en || Object.values(field)[0] || '';
}

export function CreateNodeMenu({ x, y, onSelect, onClose }: CreateNodeMenuProps) {
  const [search, setSearch] = useState('');
  const [expandedCats, setExpandedCats] = useState<Set<string>>(sessionExpandedCats);
  const searchRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const categories = getByCategory();
  const lowerSearch = search.toLowerCase();

  const toggleCategory = (cat: string) => {
    setExpandedCats(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      sessionExpandedCats = next;
      return next;
    });
  };

  return (
    <div
      ref={menuRef}
      className="ng-create-menu"
      style={{ left: x, top: y }}
    >
      <div className="ng-create-menu-title">Create Node</div>
      <div className="ng-create-menu-search-wrap">
        <span className="ng-create-menu-search-icon">🔍</span>
        <input
          ref={searchRef}
          className="ng-create-menu-search"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="ng-create-menu-list">
        {Object.entries(categories).map(([cat, items]) => {
          const filtered = items.filter(item => {
            if (!lowerSearch) return true;
            const label = item.label.toLowerCase();
            const tag = resolveI18n(item.definition.defaultConfig.menuTag).toLowerCase();
            return label.includes(lowerSearch) || tag.includes(lowerSearch);
          });
          if (filtered.length === 0) return null;
          const isExpanded = expandedCats.has(cat) || !!search;

          return (
            <div key={cat} className={isExpanded ? 'ng-cat-expanded' : ''}>
              <div
                className="ng-create-menu-category-header"
                onClick={() => toggleCategory(cat)}
              >
                <span className="ng-create-menu-cat-arrow">{isExpanded ? '▼' : '▶'}</span>
                <span>{cat}</span>
                <span style={{ opacity: 0.4, marginLeft: 'auto', fontSize: 11 }}>{filtered.length}</span>
              </div>
              <div className="ng-create-menu-items">
                {filtered.map(item => (
                  <div
                    key={item.type}
                    className="ng-create-menu-item"
                    onClick={() => onSelect(item.type)}
                  >
                    <div className="ng-create-menu-item-name">
                      {resolveI18n(item.definition.defaultConfig.menuTag) || item.label}
                    </div>
                    <div className="ng-create-menu-item-desc">
                      {resolveI18n(item.definition.defaultConfig.description)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
