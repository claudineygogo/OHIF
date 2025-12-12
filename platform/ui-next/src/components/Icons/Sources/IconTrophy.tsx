import React from 'react';
import type { IconProps } from '../types';

export const IconTrophy = (props: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    width="24px"
    height="24px"
    {...props}
  >
    <path
      fillRule="evenodd"
      d="M5.25 2.25a.75.75 0 00-.75.75v2.25H3.75a.75.75 0 00-.75.75v5.063c0 2.457 1.765 4.516 4.103 4.953 1.096 1.139 2.508 1.956 4.092 2.184v1.238a2.915 2.915 0 00-1.638 2.627.75.75 0 00.75.75h7.376a.75.75 0 00.75-.75 2.913 2.913 0 00-1.637-2.625v-1.24c1.583-.228 2.996-1.045 4.092-2.184 2.338-.437 4.102-2.496 4.102-4.953V3.75a.75.75 0 00-.75-.75H19.5V3a.75.75 0 00-.75-.75H5.25zm.75 3v5.063c0 1.634 1.173 3.003 2.723 3.294A5.962 5.962 0 017.5 9V5.25h-1.5zm12 0V9c0 1.635-1.168 3.518-2.673 4.606 1.488-.306 2.673-1.65 2.673-3.293V5.25h-1.5z"
      clipRule="evenodd"
    />
    <path d="M12 4.5a3.75 3.75 0 100 7.5 3.75 3.75 0 000-7.5z" />
  </svg>
);

export default IconTrophy;
