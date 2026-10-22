import React, { useState, useCallback } from 'react';
import {
  DigitalSignaturePadModal,
  type DigitalSignaturePadModalProps,
} from '@/components/ui/DigitalSignaturePadModal';

export interface UseDigitalSignaturePadOptions {
  title?: string;
  subtitle?: string;
  penName?: string;
  allowUploadAlternative?: boolean;
}

/**
 * Universal Hook for invoking Digital Signature Pad from anywhere in the app
 * 
 * @example
 * const { requestSignature, SignaturePadElement } = useDigitalSignaturePad();
 * 
 * const handleSign = () => {
 *   requestSignature((signatureBase64) => {
 *     console.log('Signed:', signatureBase64);
 *     setSignature(signatureBase64);
 *   }, { penName: 'Kepala Sekolah' });
 * };
 * 
 * return (
 *   <div>
 *     <button onClick={handleSign}>Tanda Tangan</button>
 *     {SignaturePadElement}
 *   </div>
 * );
 */
export function useDigitalSignaturePad(defaultOptions: UseDigitalSignaturePadOptions = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentOptions, setCurrentOptions] = useState<UseDigitalSignaturePadOptions>(defaultOptions);
  const [callback, setCallback] = useState<((signature: string) => void) | null>(null);
  const [initialSig, setInitialSig] = useState<string | null>(null);

  const requestSignature = useCallback(
    (
      onSignatureSaved: (signature: string) => void,
      options?: UseDigitalSignaturePadOptions & { initialSignature?: string | null }
    ) => {
      setCallback(() => onSignatureSaved);
      setCurrentOptions({ ...defaultOptions, ...options });
      setInitialSig(options?.initialSignature || null);
      setIsOpen(true);
    },
    [defaultOptions]
  );

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setCallback(null);
  }, []);

  const handleSave = useCallback(
    (signatureBase64: string) => {
      if (callback) {
        callback(signatureBase64);
      }
      setIsOpen(false);
    },
    [callback]
  );

  const SignaturePadElement = (
    <DigitalSignaturePadModal
      isOpen={isOpen}
      onClose={handleClose}
      onSave={handleSave}
      title={currentOptions.title}
      subtitle={currentOptions.subtitle}
      penName={currentOptions.penName}
      initialSignature={initialSig}
      allowUploadAlternative={currentOptions.allowUploadAlternative}
    />
  );

  return {
    isOpen,
    requestSignature,
    closeSignaturePad: handleClose,
    SignaturePadElement,
  };
}
