interface Props {
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
}

const sizeMap = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' };

export default function LoadingSpinner({ size = 'md', fullScreen = false }: Props) {
  const spinner = (
    <div className={`animate-spin rounded-full border-2 border-primary-200 border-t-primary-600 ${sizeMap[size]}`} />
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white/80 z-50">
        {spinner}
      </div>
    );
  }
  return <div className="flex justify-center py-8">{spinner}</div>;
}
