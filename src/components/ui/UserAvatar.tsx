import React, { useState } from 'react';
import { User as UserIcon } from 'lucide-react';

interface UserAvatarProps {
  src?: string | null;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  className?: string;
  ring?: boolean;
  alt?: string;
  onClick?: () => void;
}

const sizeMap = {
  xs: { box: 'w-6 h-6', icon: 'w-3.5 h-3.5' },
  sm: { box: 'w-8 h-8', icon: 'w-4 h-4' },
  md: { box: 'w-10 h-10', icon: 'w-5 h-5' },
  lg: { box: 'w-12 h-12', icon: 'w-6 h-6' },
  xl: { box: 'w-16 h-16', icon: 'w-8 h-8' },
  '2xl': { box: 'w-20 h-20', icon: 'w-10 h-10' },
  '3xl': { box: 'w-24 h-24', icon: 'w-12 h-12' },
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  src,
  name = 'Student',
  size = 'md',
  className = '',
  ring = true,
  alt,
  onClick,
}) => {
  const [imageError, setImageError] = useState(false);
  const sizeStyles = sizeMap[size] || sizeMap.md;
  const ringStyle = ring ? 'ring-2 ring-slate-200/80 dark:ring-[#1E293B] shadow-xs' : '';

  // If a valid uploaded custom image exists and hasn't errored out
  if (src && typeof src === 'string' && src.trim() !== '' && !imageError) {
    return (
      <div
        className={`relative rounded-full overflow-hidden shrink-0 select-none bg-slate-100 dark:bg-[#101823] ${sizeStyles.box} ${ringStyle} ${className}`}
        onClick={onClick}
      >
        <img
          src={src}
          alt={alt || name}
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  // Blank placeholder: Clean white circle/box with a basic line-art profile icon
  return (
    <div
      className={`relative rounded-full shrink-0 select-none flex items-center justify-center bg-white dark:bg-[#101823] border border-slate-200 dark:border-[#1E293B] text-slate-400 dark:text-slate-500 shadow-xs ${sizeStyles.box} ${ringStyle} ${className}`}
      onClick={onClick}
      title={name}
      aria-label={name}
    >
      <UserIcon className={`${sizeStyles.icon} stroke-[1.75]`} />
    </div>
  );
};
