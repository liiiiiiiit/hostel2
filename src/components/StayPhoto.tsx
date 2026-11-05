import { Building2 } from 'lucide-react';
import { useState } from 'react';

/** Keep the card's geometry and useful alternative text when an owner image fails. */
export function StayPhoto({ src, alt, className = '', eager = false }: {
  src?: string; alt: string; className?: string; eager?: boolean;
}) {
  const [failedSource, setFailedSource] = useState<string>();
  const visible = src && src !== failedSource;
  return <div className={`stay-photo ${className}`}>
    <div className="stay-photo-fallback" role={visible ? undefined : 'img'} aria-label={visible ? undefined : alt} aria-hidden={visible ? true : undefined}>
      <Building2 size={40} strokeWidth={1} />
    </div>
    {visible && <img src={src} alt={alt} loading={eager ? 'eager' : 'lazy'} fetchPriority={eager ? 'high' : undefined} onError={() => setFailedSource(src)} />}
  </div>;
}
