import React from 'react';

interface VendromLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
  textClassName?: string;
}

export const VendromLogo: React.FC<VendromLogoProps> = ({ 
  className = '', 
  size = 40,
  showText = true,
  textClassName = ''
}) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img 
        src="/vendrome-logo.svg" 
        alt="Vendrome"
        width={size}
        height={size}
        className="flex-shrink-0 object-contain"
      />

      {showText && (
        <span className={`font-bold text-xl ${textClassName}`}>
          <span className="vendrom-gradient-text">Vendrome</span>
        </span>
      )}
    </div>
  );
};

export default VendromLogo;
