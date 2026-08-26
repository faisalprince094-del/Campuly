import React, { useState } from 'react';
import { User as UserIcon, GraduationCap } from 'lucide-react';

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
  xs: { box: 'w-6 h-6', text: 'text-[10px]', icon: 'w-3 h-3' },
  sm: { box: 'w-8 h-8', text: 'text-xs', icon: 'w-4 h-4' },
  md: { box: 'w-10 h-10', text: 'text-sm font-bold', icon: 'w-5 h-5' },
  lg: { box: 'w-12 h-12', text: 'text-base font-bold', icon: 'w-6 h-6' },
  xl: { box: 'w-16 h-16', text: 'text-lg font-black', icon: 'w-7 h-7' },
  '2xl': { box: 'w-20 h-20', text: 'text-xl font-black', icon: 'w-9 h-9' },
  '3xl': { box: 'w-24 h-24', text: 'text-2xl font-black', icon: 'w-11 h-11' },
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

  // Extract initials
  const getInitials = (fullName: string) => {
    if (!fullName) return 'S';
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const initials = getInitials(name);
  const ringStyle = ring ? 'ring-2 ring-blue-500/30 dark:ring-blue-400/30 shadow-xs' : '';

  // If valid image source exists and hasn't errored out
  if (src && !imageError) {
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

  // Fallback clean gradient avatar with user initials
  return (
    <div
      className={`relative rounded-full shrink-0 select-none flex items-center justify-center bg-gradient-to-tr from-blue-600 via-blue-500 to-sky-500 text-white font-bold tracking-wider ${sizeStyles.box} ${ringStyle} ${className}`}
      onClick={onClick}
      title={name}
      aria-label={name}
    >
      {initials ? (
        <span className={sizeStyles.text}>{initials}</span>
      ) : (
        <UserIcon className={sizeStyles.icon} />
      )}
    </div>
  );
};
