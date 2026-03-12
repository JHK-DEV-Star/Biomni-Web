import { createContext, useContext, useReducer, useCallback, useEffect, type ReactNode, type Dispatch } from 'react';

// ─── Types ───

export interface ToastItem {
  id: number;
  message: string;
  type: 'error' | 'success' | 'info';
}

type ToastAction =
  | { type: 'ADD'; payload: ToastItem }
  | { type: 'REMOVE'; payload: number };

// ─── Reducer ───

function toastReducer(state: ToastItem[], action: ToastAction): ToastItem[] {
  switch (action.type) {
    case 'ADD':
      return [...state, action.payload];
    case 'REMOVE':
      return state.filter((t) => t.id !== action.payload);
    default:
      return state;
  }
}

// ─── Context ───

interface ToastContextValue {
  toasts: ToastItem[];
  dispatch: Dispatch<ToastAction>;
  addToast: (message: string, type?: ToastItem['type']) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextToastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, dispatch] = useReducer(toastReducer, []);

  const addToast = useCallback((message: string, type: ToastItem['type'] = 'error') => {
    const id = ++nextToastId;
    dispatch({ type: 'ADD', payload: { id, message, type } });
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, dispatch, addToast }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

// ─── Toast Item View ───

function ToastItemView({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: number) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 5000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const bgColor = toast.type === 'error'
    ? 'var(--error-color, #ef4444)'
    : toast.type === 'success'
      ? 'var(--success-color, #10b981)'
      : 'var(--primary-color, #6366f1)';

  return (
    <div
      style={{
        padding: '12px 16px',
        marginTop: '8px',
        borderRadius: '8px',
        background: bgColor,
        color: '#fff',
        fontSize: '14px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        cursor: 'pointer',
        maxWidth: '360px',
        wordBreak: 'break-word',
      }}
      onClick={() => onDismiss(toast.id)}
    >
      {toast.message}
    </div>
  );
}

// ─── Toast Container ───

export function ToastContainer() {
  const { toasts, dispatch } = useToast();

  const handleDismiss = useCallback((id: number) => {
    dispatch({ type: 'REMOVE', payload: id });
  }, [dispatch]);

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
      }}
    >
      {toasts.map((toast) => (
        <ToastItemView key={toast.id} toast={toast} onDismiss={handleDismiss} />
      ))}
    </div>
  );
}
