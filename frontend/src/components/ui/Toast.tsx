import { useEffect, useState } from 'react';

interface ToastMessage {
  id: number;
  text: string;
  type: 'success' | 'error';
}

let toastId = 0;
const listeners: Array<(toast: ToastMessage) => void> = [];

// Returns a state-updater function that removes the toast with the given id.
// Defined at module level to avoid deep nesting inside the component.
function exclude(id: number): (toasts: ToastMessage[]) => ToastMessage[] {
  return toasts => toasts.filter(t => t.id !== id);
}

export function showToast(text: string, type: 'success' | 'error' = 'success') {
  const toast: ToastMessage = { id: ++toastId, text, type };
  listeners.forEach(fn => fn(toast));
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const handler = (toast: ToastMessage) => {
      setToasts(prev => [...prev, toast]);
      setTimeout(setToasts, 3000, exclude(toast.id));
    };
    listeners.push(handler);
    return () => {
      const idx = listeners.indexOf(handler);
      if (idx >= 0) listeners.splice(idx, 1);
    };
  }, []);

  return (
    <>
      {toasts.map(toast => (
        <div key={toast.id} className={`toast toast-${toast.type}`}>
          {toast.text}
        </div>
      ))}
    </>
  );
}
