'use client';

import { useEffect, useState } from 'react';
import { cn } from '../../lib/cn';
import { resolveBrandingUrl } from '../../lib/system-branding';
import { useSystemBranding } from '../system-branding-provider';

export function BrandMark({
  className,
  imageClassName,
}: {
  className?: string;
  imageClassName?: string;
}) {
  const { branding } = useSystemBranding();
  const [imageFailed, setImageFailed] = useState(false);
  const imageUrl = resolveBrandingUrl(branding.logoUrl);
  useEffect(() => setImageFailed(false), [imageUrl]);
  return (
    <span className={cn('grid shrink-0 place-items-center overflow-hidden', className)}>
      {imageUrl && !imageFailed ? (
        <img
          src={imageUrl}
          alt=""
          className={cn('h-full w-full object-contain', imageClassName)}
          onError={() => setImageFailed(true)}
        />
      ) : (
        branding.shortName.slice(0, 1).toUpperCase()
      )}
    </span>
  );
}
