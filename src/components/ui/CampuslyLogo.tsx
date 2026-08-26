import React from 'react';

interface CampuslyLogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'custom';
  showText?: boolean;
  textSize?: string;
}

export const CampuslyLogo: React.FC<CampuslyLogoProps> = ({
  className = '',
  size = 'md',
  showText = false,
  textSize = 'text-xl',
}) => {
  const sizeClasses = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20',
    custom: '',
  };

  const selectedSizeClass = size !== 'custom' ? sizeClasses[size] : '';

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className={`${selectedSizeClass} flex items-center justify-center shrink-0 overflow-hidden`}>
        <img
          src="/logo.png"
          onError={(e) => {
            // Fallback if local asset is loading or missing
            const target = e.currentTarget;
            if (target.src !== 'https://i.ibb.co/1Y78Q44X/Blue-Bold-Connected-Letter-C-Logo.png') {
              target.src = 'https://i.ibb.co/1Y78Q44X/Blue-Bold-Connected-Letter-C-Logo.png';
            }
          }}
          alt="Campusly Logo"
          className="w-full h-full object-contain scale-120 select-none transition-transform"
          loading="eager"
          referrerPolicy="no-referrer"
        />
      </div>
      {showText && (
        <div>
          <span className={`${textSize} font-bold tracking-tight text-slate-900 dark:text-white leading-none`}>
            Campusly
          </span>
          <p className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 tracking-wider uppercase mt-0.5">
            Student OS
          </p>
        </div>
      )}
    </div>
  );
};
