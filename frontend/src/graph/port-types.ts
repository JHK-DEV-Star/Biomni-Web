// ============================================
// Port Type Compatibility System
// ============================================

import type { PortType } from './types';

class PortTypeSystem {
  private _groups: Map<string, Set<string>> = new Map();
  private _memberOf: Map<string, Set<string>> = new Map();

  defineGroup(groupName: string) {
    if (!this._groups.has(groupName)) {
      this._groups.set(groupName, new Set());
    }
  }

  define(typeName: string, memberOfGroups: string[] = []) {
    this._memberOf.set(typeName, new Set(memberOfGroups));
    for (const g of memberOfGroups) {
      if (!this._groups.has(g)) this._groups.set(g, new Set());
      this._groups.get(g)!.add(typeName);
    }
  }

  isGroup(typeName: string): boolean {
    return this._groups.has(typeName);
  }

  isCompatible(outType: PortType | string, inType: PortType | string): boolean {
    if (outType === 'image') return inType === 'image';
    if (inType === 'image') return outType === 'image';
    if (inType === 'any' || outType === 'any') return true;

    if (this.isGroup(inType)) {
      const accepted = this._groups.get(inType)!;
      if (accepted.has(outType)) return true;
      if (this.isGroup(outType)) {
        const outMembers = this._groups.get(outType)!;
        if (outMembers.size === 0) return false;
        for (const m of outMembers) {
          if (!accepted.has(m)) return false;
        }
        return true;
      }
      return false;
    }

    if (inType === 'table') return outType === 'table' || outType === 'data';
    if (inType === 'string') return true;
    if (inType === 'float' && outType === 'int') return true;
    return outType === inType;
  }
}

export const PortTypes = new PortTypeSystem();

// Define groups
PortTypes.defineGroup('numeric');
PortTypes.defineGroup('addable');

// Define concrete types
PortTypes.define('float',   ['numeric', 'addable']);
PortTypes.define('int',     ['numeric', 'addable']);
PortTypes.define('double',  ['numeric', 'addable']);
PortTypes.define('string',  ['addable']);
PortTypes.define('matrix',  ['numeric', 'addable']);
PortTypes.define('vector2', ['numeric', 'addable']);
PortTypes.define('vector3', ['numeric', 'addable']);
PortTypes.define('vector4', ['numeric', 'addable']);
PortTypes.define('color',   ['numeric', 'addable']);
PortTypes.define('boolean', []);
PortTypes.define('data',    []);
PortTypes.define('table',   []);
PortTypes.define('image',   []);

// Port type → color mapping
export const PORT_COLORS: Record<string, string> = {
  any:     '#8e8e93',
  float:   '#34c759',
  int:     '#30d158',
  double:  '#32d74b',
  string:  '#ff9f0a',
  boolean: '#ff453a',
  matrix:  '#bf5af2',
  vector2: '#64d2ff',
  vector3: '#5ac8fa',
  vector4: '#0a84ff',
  color:   '#ff6482',
  data:    '#ffd60a',
  table:   '#ac8e68',
  image:   '#ff375f',
  numeric: '#34c759',
  addable: '#ff9f0a',
};
