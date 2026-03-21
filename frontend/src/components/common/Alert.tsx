type AlertType = 'success' | 'error' | 'warning' | 'info';

interface Props {
  type: AlertType;
  message: string;
  onClose?: () => void;
}

const styles: Record<AlertType, string> = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error:   'bg-red-50 border-red-200 text-red-800',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  info:    'bg-blue-50 border-blue-200 text-blue-800',
};

const icons: Record<AlertType, string> = {
  success: '✓',
  error:   '✕',
  warning: '⚠',
  info:    'ℹ',
};

export default function Alert({ type, message, onClose }: Props) {
  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-xl border text-sm ${styles[type]}`}>
      <span className="font-bold text-base leading-5">{icons[type]}</span>
      <span className="flex-1">{message}</span>
      {onClose && (
        <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100 transition-opacity font-bold">×</button>
      )}
    </div>
  );
}
