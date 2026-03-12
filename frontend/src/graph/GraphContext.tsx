// ============================================
// Graph Context — provides port event handlers to nested components
// ============================================

import { createContext, useContext } from 'react';

interface GraphContextValue {
  onPortMouseDown: (
    e: React.MouseEvent,
    nodeId: string,
    portName: string,
    portDir: 'in' | 'out',
    portType: string,
  ) => void;
}

const GraphContext = createContext<GraphContextValue>({
  onPortMouseDown: () => {},
});

export const GraphProvider = GraphContext.Provider;

export function useGraphContext() {
  return useContext(GraphContext);
}
