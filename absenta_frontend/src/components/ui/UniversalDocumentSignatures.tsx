import React from 'react';
import {
  useDocumentSigners,
  type UseDocumentSignersParams,
  type SignerPerson,
} from '@/hooks/useDocumentSigners';
import { cn } from '@/lib/utils';

export type DocumentSignatureLayout =
  | 'single_kepsek'
  | 'dual_walas_kepsek'
  | 'dual_unit_kepsek'
  | 'triangle_rapor'
  | 'tri_party_row';

export interface UniversalDocumentSignaturesProps extends UseDocumentSignersParams {
  layout: DocumentSignatureLayout;
  showTitimangsa?: boolean;
  spacingHeightMm?: number; // Space height for signature in mm (default 20)
  className?: string;
  fontFamilyClass?: string;
  unitRoleTitle?: string; // Optional custom role title for dual_unit_kepsek (e.g. "Ketua Program Keahlian")
  notesOrApprovalLabel?: string; // e.g. "Mengetahui," or "Menyetujui,"
  overrideSignerLeft?: Partial<SignerPerson> & { headerPrefix?: string; topDate?: string };
  overrideSignerRight?: Partial<SignerPerson> & { headerPrefix?: string; topDate?: string };
  overrideSignerCenter?: Partial<SignerPerson> & { headerPrefix?: string; topDate?: string };
  overrideSignerBottom?: Partial<SignerPerson> & { headerPrefix?: string; topDate?: string };
}

/**
 * 🏛️ Universal Document Signature Block Component
 * Single component to render official signature layouts across all school documents
 * with zero-fallback protection and automatic OrganizationalAssignment integration.
 */
export const UniversalDocumentSignatures: React.FC<UniversalDocumentSignaturesProps> = React.memo(({
  layout,
  showTitimangsa = true,
  spacingHeightMm = 20,
  className,
  fontFamilyClass = 'font-serif',
  unitRoleTitle,
  notesOrApprovalLabel = 'Mengetahui,',
  overrideSignerLeft,
  overrideSignerRight,
  overrideSignerCenter,
  overrideSignerBottom,
  ...hookParams
}) => {
  const signers = useDocumentSigners(hookParams);

  // Helper: Render individual signature column
  const renderSignerBox = (
    person: SignerPerson,
    options?: {
      headerPrefix?: string;
      topDate?: string;
      align?: 'left' | 'center' | 'right';
      widthClass?: string;
      overrideRoleTitle?: string;
      isParentDots?: boolean;
    }
  ) => {
    const {
      headerPrefix,
      topDate,
      align = 'left',
      widthClass = 'w-[75mm]',
      overrideRoleTitle,
      isParentDots = false,
    } = options || {};

    const alignClass =
      align === 'center'
        ? 'text-center items-center'
        : align === 'right'
        ? 'text-right items-end'
        : 'text-left items-start';

    return (
      <div className={cn('flex flex-col text-black leading-[1.3] text-[10pt]', widthClass, alignClass)}>
        {/* Titimangsa Date Line (Optional per signer box) */}
        {topDate ? (
          <div className="font-normal">{topDate}</div>
        ) : (
          /* Invisible placeholder of same height to maintain baseline alignment across columns */
          <div className="font-normal select-none opacity-0 pointer-events-none">&nbsp;</div>
        )}

        {/* Approval prefix (e.g. "Mengetahui,") */}
        {headerPrefix && <div className="font-normal">{headerPrefix}</div>}

        {/* Official Role Title */}
        <div className="font-normal">{overrideRoleTitle || person.roleTitle}</div>

        {/* Spacing for physical signature & stamp */}
        <div style={{ height: `${spacingHeightMm}mm` }} className="shrink-0" />

        {/* Signatory Name */}
        {isParentDots ? (
          <div className="font-normal text-[10pt] tracking-widest text-slate-800">
            {person.personName}
          </div>
        ) : (
          <div className="font-bold underline decoration-black decoration-[1px] underline-offset-2 inline-block text-[10.5pt]">
            {person.personName}
          </div>
        )}

        {/* NIP Line with Zero-Fallback Protection */}
        {person.nip ? (
          <div className="text-[9.5pt] font-normal text-slate-900 mt-0.5">
            NIP. {person.nip}
          </div>
        ) : (
          /* If no NIP (e.g. parent or non-PNS), render empty row to keep height intact */
          <div className="text-[9.5pt] font-normal select-none opacity-0 pointer-events-none">&nbsp;</div>
        )}
      </div>
    );
  };

  const containerStyle = cn('w-full select-none text-black', fontFamilyClass, className);

  // ── PRESET 1: Single Signer (Kepala Sekolah Kanan Bawah) ──
  if (layout === 'single_kepsek') {
    const person = { ...signers.kepsek, ...(overrideSignerRight || overrideSignerBottom) };
    const date = (overrideSignerRight?.topDate !== undefined)
      ? overrideSignerRight.topDate
      : (showTitimangsa ? signers.titimangsa : undefined);
    return (
      <div className={cn(containerStyle, 'flex justify-end pt-2')}>
        {renderSignerBox(person, {
          headerPrefix: overrideSignerRight?.headerPrefix || overrideSignerBottom?.headerPrefix,
          topDate: date,
          align: 'left',
          widthClass: 'w-[75mm]',
        })}
      </div>
    );
  }

  // ── PRESET 2: Dual Signer (Wali Kelas Kiri & Kepsek Kanan) ──
  if (layout === 'dual_walas_kepsek') {
    const leftPerson = { ...signers.walas, ...overrideSignerLeft };
    const rightPerson = { ...signers.kepsek, ...overrideSignerRight };
    const rightDate = (overrideSignerRight?.topDate !== undefined)
      ? overrideSignerRight.topDate
      : (showTitimangsa ? signers.titimangsa : undefined);
    return (
      <div className={cn(containerStyle, 'flex items-start justify-between pt-2')}>
        {/* Sisi Kiri: Wali Kelas */}
        {renderSignerBox(leftPerson, {
          headerPrefix: overrideSignerLeft?.headerPrefix,
          align: 'left',
          widthClass: 'w-[75mm]',
        })}

        {/* Sisi Kanan: Titimangsa + Kepala Sekolah */}
        {renderSignerBox(rightPerson, {
          headerPrefix: overrideSignerRight?.headerPrefix,
          topDate: rightDate,
          align: 'left',
          widthClass: 'w-[75mm]',
        })}
      </div>
    );
  }

  // ── PRESET 3: Dual Signer Unit / Kaprog (Kaprog/Waka Kiri & Kepsek Kanan) ──
  if (layout === 'dual_unit_kepsek') {
    const unitPerson = { ...signers.kaprog, ...overrideSignerLeft };
    const kepsekPerson = { ...signers.kepsek, ...overrideSignerRight };
    const rightDate = (overrideSignerRight?.topDate !== undefined)
      ? overrideSignerRight.topDate
      : (showTitimangsa ? signers.titimangsa : undefined);
    return (
      <div className={cn(containerStyle, 'flex items-start justify-between pt-2')}>
        {/* Sisi Kiri: Kaprog / Pejabat Unit */}
        {renderSignerBox(unitPerson, {
          headerPrefix: overrideSignerLeft?.headerPrefix,
          align: 'left',
          widthClass: 'w-[75mm]',
          overrideRoleTitle: unitRoleTitle,
        })}

        {/* Sisi Kanan: Titimangsa + Mengetahui Kepala Sekolah */}
        {renderSignerBox(kepsekPerson, {
          headerPrefix: overrideSignerRight?.headerPrefix || notesOrApprovalLabel,
          topDate: rightDate,
          align: 'left',
          widthClass: 'w-[75mm]',
        })}
      </div>
    );
  }

  // ── PRESET 4: Triangle Rapor (Orang Tua Kiri, Walas Kanan, Mengetahui Kepsek Bawah Tengah) ──
  if (layout === 'triangle_rapor') {
    const leftPerson = { ...signers.parent, ...overrideSignerLeft };
    const rightPerson = { ...signers.walas, ...overrideSignerRight };
    const bottomPerson = { ...signers.kepsek, ...(overrideSignerCenter || overrideSignerBottom) };
    const rightDate = (overrideSignerRight?.topDate !== undefined)
      ? overrideSignerRight.topDate
      : (showTitimangsa ? signers.titimangsa : undefined);
    return (
      <div className={cn(containerStyle, 'space-y-4 pt-2')}>
        {/* Baris 1: Orang Tua & Wali Kelas Sejajar Simetris */}
        <div className="flex items-start justify-between w-full">
          {/* Orang Tua / Wali */}
          {renderSignerBox(leftPerson, {
            headerPrefix: overrideSignerLeft?.headerPrefix,
            align: 'left',
            widthClass: 'w-[75mm]',
            isParentDots: true,
          })}

          {/* Wali Kelas dengan Titimangsa di Atasnya */}
          {renderSignerBox(rightPerson, {
            headerPrefix: overrideSignerRight?.headerPrefix,
            topDate: rightDate,
            align: 'left',
            widthClass: 'w-[75mm]',
          })}
        </div>

        {/* Baris 2: Mengetahui Kepala Sekolah di Posisi Tengah Bawah */}
        <div className="flex flex-col items-center justify-center text-center w-full pt-1">
          {renderSignerBox(bottomPerson, {
            headerPrefix: overrideSignerCenter?.headerPrefix || overrideSignerBottom?.headerPrefix || notesOrApprovalLabel,
            align: 'center',
            widthClass: 'w-[85mm]',
          })}
        </div>
      </div>
    );
  }

  // ── PRESET 5: Tri-Party Row (DUDI, Kaprog, Kepsek Sejajar 3 Kolom) ──
  if (layout === 'tri_party_row') {
    const leftPerson = { ...signers.dudi, ...overrideSignerLeft };
    const centerPerson = { ...signers.kaprog, ...overrideSignerCenter };
    const rightPerson = { ...signers.kepsek, ...overrideSignerRight };
    const rightDate = (overrideSignerRight?.topDate !== undefined)
      ? overrideSignerRight.topDate
      : (showTitimangsa ? signers.titimangsa : undefined);
    return (
      <div className={cn(containerStyle, 'grid grid-cols-3 gap-3 items-start pt-2')}>
        {/* Kolom 1: Pembimbing DUDI / Industri */}
        {renderSignerBox(leftPerson, {
          headerPrefix: overrideSignerLeft?.headerPrefix,
          topDate: overrideSignerLeft?.topDate,
          align: 'center',
          widthClass: 'w-full',
        })}

        {/* Kolom 2: Kaprog / Penguji Internal Sekolah */}
        {renderSignerBox(centerPerson, {
          headerPrefix: overrideSignerCenter?.headerPrefix,
          topDate: overrideSignerCenter?.topDate,
          align: 'center',
          widthClass: 'w-full',
          overrideRoleTitle: unitRoleTitle,
        })}

        {/* Kolom 3: Titimangsa + Mengetahui Kepala Sekolah */}
        {renderSignerBox(rightPerson, {
          headerPrefix: overrideSignerRight?.headerPrefix || notesOrApprovalLabel,
          topDate: rightDate,
          align: 'center',
          widthClass: 'w-full',
        })}
      </div>
    );
  }

  return null;
});

UniversalDocumentSignatures.displayName = 'UniversalDocumentSignatures';
