import React from 'react';
import { Loader } from './Loader';

export interface SpinnerProps {
  size?: 'sm' | 'default' | 'lg' | 'xl';
  color?: 'primary' | 'secondary' | 'white' | 'muted';
  className?: string;
  text?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'default',
  color = 'primary',
  className,
  text,
}) => {
  return <Loader type="spinner" size={size} color={color} className={className} text={text} />;
};

export default Spinner;
