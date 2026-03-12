// ============================================
// Auto-loader: imports all node files in this directory
// Each .tsx file self-registers via registerNode() side-effect
// To add a new node type: just create a new .tsx file here
// ============================================

const modules = import.meta.glob('./*.tsx', { eager: true });

// Force TypeScript to keep the import (side-effect only)
void modules;
