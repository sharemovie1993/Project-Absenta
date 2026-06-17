import React from 'react';
import { jest } from '@jest/globals';

export const useNavigate = jest.fn();
export const useSearchParams = jest.fn();
export const useParams = jest.fn();
export const Link = jest.fn(({ to, children, className }: any) => React.createElement('a', { href: to, className }, children));
export const Navigate = jest.fn(({ to }: any) => React.createElement('div', {}, `Redirected to ${to}`));
export const Outlet = jest.fn(() => React.createElement('div', {}, 'Outlet'));
