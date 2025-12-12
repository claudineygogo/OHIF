import React from 'react';
import type { IconProps } from '../types';

export const IconPerformance = (props: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    width="24px"
    height="24px"
    {...props}
  >
    {/* Gauge Arc */}
    <path d="M12 15a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />
    <path d="M12 15v-6" />
    <path d="M20.66 17S22 15 22 12A10 10 0 0 0 2 12c0 3 1.34 5 1.34 5" />
    <path d="M2 12h5" />
    <path d="M17 12h5" />
    {/* Custom gauge dividers/segments style similar to image */}
    <path d="M12 2v5" />
    <path d="M4.93 4.93l3.54 3.54" />
    <path d="M15.54 8.46l3.53-3.53" />
  </svg>
);

export default IconPerformance;
