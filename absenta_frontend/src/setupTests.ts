// Jest setup file
import '@testing-library/jest-dom';
import { jest } from '@jest/globals';
import { TextEncoder, TextDecoder } from 'util';

Object.assign(global, { TextDecoder, TextEncoder });

// Type declarations for Node.js environment
declare var process: {
  env: {
    [key: string]: string | undefined;
  };
};

// Extend global interface for test environment
declare global {
  namespace NodeJS {
    interface Global {
      localStorage: Storage;
      sessionStorage: Storage;
      ResizeObserver: any;
      IntersectionObserver: any;
    }
  }
}

// Mock untuk environment variables
process.env.VITE_API_BASE_URL = 'http://localhost:3000/api';
(globalThis as any).__VITE_API_BASE_URL__ = process.env.VITE_API_BASE_URL;

// Mock untuk localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
(globalThis as any).localStorage = localStorageMock;

// Mock untuk sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
(globalThis as any).sessionStorage = sessionStorageMock;

// Mock untuk window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock untuk ResizeObserver
(globalThis as any).ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock untuk IntersectionObserver
(globalThis as any).IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));
