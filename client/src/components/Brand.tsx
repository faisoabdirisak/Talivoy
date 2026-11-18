export function Brand({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <img
        src="/branding/talivoy-icon.png"
        alt=""
        width={40}
        height={40}
        className="h-9 w-9 shrink-0 object-contain"
      />
      <span className="text-xl font-bold tracking-tight text-app">Talivoy</span>
    </span>
  );
}
