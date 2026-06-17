import { jsPDF } from 'jspdf';
import api from '../../lib/axiosInstance';
import toast from 'react-hot-toast';

export interface CoopSettingsData {
  cooperative_name: string;
  cooperative_legal_no: string;
  cooperative_address: string;
  cooperative_phone: string;
  cooperative_email: string;
  cooperative_website: string;
  cooperative_logo_url: string;
  cooperative_default_interest_rate?: string | number;
  signatures: {
    bendahara: string;
    ketua: string;
    kepsek: string;
  };
}

/** Fetch cooperative settings from API */
export const fetchCoopSettings = async (): Promise<CoopSettingsData> => {
  try {
    const settingsRes = await api.get('/cooperative/settings');
    if (settingsRes.data && settingsRes.data.data) {
      const cfg = settingsRes.data.data;
      return {
        cooperative_name: cfg.cooperative_name || 'KOPERASI SEKOLAH',
        cooperative_legal_no: cfg.cooperative_legal_no || '',
        cooperative_address: cfg.cooperative_address || '',
        cooperative_phone: cfg.cooperative_phone || '',
        cooperative_email: cfg.cooperative_email || '',
        cooperative_website: cfg.cooperative_website || '',
        cooperative_logo_url: cfg.cooperative_logo_url || '',
        cooperative_default_interest_rate: cfg.cooperative_default_interest_rate || '',
        signatures: {
          bendahara: cfg.signatures?.bendahara || '........................',
          ketua: cfg.signatures?.ketua || '........................',
          kepsek: cfg.signatures?.kepsek || '........................'
        }
      };
    }
  } catch (e) {
    console.warn('Failed to load coop settings for document utility', e);
  }
  return {
    cooperative_name: 'KOPERASI SEKOLAH',
    cooperative_legal_no: '',
    cooperative_address: '',
    cooperative_phone: '',
    cooperative_email: '',
    cooperative_website: '',
    cooperative_logo_url: '',
    cooperative_default_interest_rate: '',
    signatures: {
      bendahara: '........................',
      ketua: '........................',
      kepsek: '........................'
    }
  };
};

/** Convert image URL to Base64 (supporting proxy routing for external URLs) */
export const getBase64ImageFromUrl = async (imageUrl: string): Promise<string | null> => {
  try {
    let blob: Blob;
    if (imageUrl.startsWith('/')) {
      const res = await fetch(window.location.origin + imageUrl);
      blob = await res.blob();
    } else {
      const response = await api.get(`/cooperative/settings/logo-proxy?url=${encodeURIComponent(imageUrl)}`, {
        responseType: 'blob'
      });
      blob = response.data;
    }

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const width = img.naturalWidth || img.width || 200;
          const height = img.naturalHeight || img.height || 200;
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/png'));
          } else {
            resolve(reader.result as string);
          }
        };
        img.onerror = () => resolve(null);
        img.src = reader.result as string;
      };
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn('Failed to load image via proxy or direct fetch', e);
    return null;
  }
};

/** Format Date to standard Indonesian long format */
export const formatIndonesianDate = (dateInput: Date | string | number | undefined | null): string => {
  if (!dateInput) return '-';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '-';

  const day = String(d.getDate()).padStart(2, '0');
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

/** Format Date and Time to standard Indonesian format */
export const formatIndonesianDateTime = (dateInput: Date | string | number | undefined | null): string => {
  if (!dateInput) return '-';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '-';

  const dateStr = formatIndonesianDate(d);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${dateStr} ${hours}:${minutes}`;
};

/** Convert number to Indonesian written text (terbilang) */
export const formatTerbilangIndonesian = (num: number): string => {
  const words = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'];
  const numFloor = Math.floor(Math.abs(num));
  if (numFloor < 12) {
    return words[numFloor];
  }
  if (numFloor < 20) {
    return formatTerbilangIndonesian(numFloor - 10) + ' Belas';
  }
  if (numFloor < 100) {
    return formatTerbilangIndonesian(numFloor / 10) + ' Puluh ' + formatTerbilangIndonesian(numFloor % 10);
  }
  if (numFloor < 200) {
    return 'Seratus ' + formatTerbilangIndonesian(numFloor - 100);
  }
  if (numFloor < 1000) {
    return formatTerbilangIndonesian(numFloor / 100) + ' Ratus ' + formatTerbilangIndonesian(numFloor % 100);
  }
  if (numFloor < 2000) {
    return 'Seribu ' + formatTerbilangIndonesian(numFloor - 1000);
  }
  if (numFloor < 1000000) {
    return formatTerbilangIndonesian(numFloor / 1000) + ' Ribu ' + formatTerbilangIndonesian(numFloor % 1000);
  }
  if (numFloor < 1000000000) {
    return formatTerbilangIndonesian(numFloor / 1000000) + ' Juta ' + formatTerbilangIndonesian(numFloor % 1000000);
  }
  return String(numFloor);
};

/** Draw standard cooperative document letterhead/header to jsPDF instance */
export const drawCoopPDFHeader = (
  doc: jsPDF,
  settings: CoopSettingsData,
  logoBase64: string | null,
  startY: number = 15,
  endX: number = 195
): number => {
  const textStartX = 38;
  let currentY = startY;

  // Render logo image or dynamic placeholder
  if (logoBase64) {
    const format = logoBase64.startsWith('data:image/png') ? 'PNG' : 'JPEG';
    doc.addImage(logoBase64, format, 15, currentY - 7, 18, 18);
  } else {
    doc.setFillColor(79, 70, 229);
    doc.circle(24, currentY, 9, 'F');
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.5);
    doc.circle(24, currentY, 8, 'D');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    const initial = settings.cooperative_name.trim().charAt(0) || 'K';
    doc.text(initial, 22.5, currentY + 3.5);
  }

  // Draw cooperative details
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(30, 58, 138);
  doc.text(settings.cooperative_name.toUpperCase(), textStartX, currentY);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);

  if (settings.cooperative_legal_no) {
    currentY += 4.5;
    doc.text(`Badan Hukum: ${settings.cooperative_legal_no}`, textStartX, currentY);
  }

  if (settings.cooperative_address) {
    currentY += 4.5;
    doc.text(settings.cooperative_address, textStartX, currentY, { maxWidth: endX - textStartX });
  }

  const contactParts: string[] = [];
  if (settings.cooperative_phone) contactParts.push(`Telp: ${settings.cooperative_phone}`);
  if (settings.cooperative_email) contactParts.push(`Email: ${settings.cooperative_email}`);
  if (settings.cooperative_website) contactParts.push(`Web: ${settings.cooperative_website}`);

  if (contactParts.length > 0) {
    currentY += 4.5;
    doc.text(contactParts.join(' | '), textStartX, currentY);
  }

  // Double horizontal lines
  currentY += 6;
  doc.setDrawColor(79, 70, 229);
  doc.setLineWidth(0.8);
  doc.line(15, currentY, endX, currentY);

  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.2);
  doc.line(15, currentY + 0.8, endX, currentY + 0.8);

  return currentY + 8;
};

/** Print standard POS digital receipt in a popup window */
export const printCoopReceipt = (
  sale: any,
  coopSettings: CoopSettingsData,
  buyerName: string,
  buyerNo: string = '',
  cashierName: string = 'Mandiri'
): void => {
  if (!sale) return;
  const printWindow = window.open('', '_blank', 'width=400,height=600');
  if (!printWindow) {
    toast.error('Gagal membuka halaman cetak. Periksa blocker popup browser Anda.');
    return;
  }

  const itemsHtml = (sale.items || []).map((item: any) => `
      <tr>
          <td style="padding: 4px 0; max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              ${item.product?.name || 'Produk'}
          </td>
          <td style="text-align: center; padding: 4px 0; white-space: nowrap; width: 30px;">${item.quantity}</td>
          <td style="text-align: right; padding: 4px 0; white-space: nowrap; width: 70px;">Rp ${(Number(item.price) * item.quantity).toLocaleString('id-ID')}</td>
      </tr>
  `).join('');

  const formattedName = buyerName.length > 20 ? buyerName.slice(0, 20) + '...' : buyerName;
  const memberNoStr = buyerNo ? `(${buyerNo})` : '';

  printWindow.document.write(`
      <html>
      <head>
          <title>Struk Pembelian #${sale.id.slice(0, 8)}</title>
          <style>
              @page { size: 58mm auto; margin: 0; }
              body, table, th, td, p, div {
                  font-family: 'Courier New', Courier, monospace;
                  font-size: 10px;
                  line-height: 1.3;
                  color: #000;
              }
              body {
                  width: 58mm;
                  margin: 0;
                  padding: 8px;
                  box-sizing: border-box;
              }
              .center { text-align: center; }
              .divider { border-bottom: 1px dashed #000; margin: 6px 0; }
              table { width: 100%; border-collapse: collapse; }
              th, td { font-size: 10px; }
              .right { text-align: right; }
              .bold { font-weight: bold; }
          </style>
      </head>
      <body>
           <div class="center">
                <h3 style="margin: 0; font-size: 12px; font-weight: bold; text-transform: uppercase;">${coopSettings.cooperative_name || 'KOPERASI SEKOLAH'}</h3>
                <p style="margin: 2px 0; font-size: 9px;">${coopSettings.cooperative_address || 'Kantin & Minimarket'}</p>
                ${coopSettings.cooperative_phone ? `<p style="margin: 2px 0; font-size: 9px;">Telp: ${coopSettings.cooperative_phone}</p>` : ''}
                <p style="margin: 2px 0; font-size: 9px;">${new Date(sale.date).toLocaleString('id-ID')}</p>
            </div>
            <div class="divider"></div>
            <div>
                <p style="margin: 2px 0;">No Struk: #${sale.id.slice(0, 8)}</p>
                <p style="margin: 2px 0;">Pembeli : ${formattedName} ${memberNoStr}</p>
                <p style="margin: 2px 0;">Kasir   : ${cashierName}</p>
            </div>
            <div class="divider"></div>
            <table>
                <thead>
                    <tr style="border-bottom: 1px dashed #000;">
                        <th style="text-align: left; padding-bottom: 4px; width: 100px;">Item</th>
                        <th style="text-align: center; padding-bottom: 4px; width: 30px;">Qty</th>
                        <th style="text-align: right; padding-bottom: 4px; width: 70px;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHtml}
                </tbody>
            </table>
            <div class="divider"></div>
            <table>
                ${sale.discount && Number(sale.discount) > 0 ? `
                <tr>
                    <td style="white-space: nowrap;">DISKON VOUCHER (${sale.voucherCode})</td>
                    <td class="right" style="white-space: nowrap;">-Rp ${Number(sale.discount).toLocaleString('id-ID')}</td>
                </tr>
                ` : ''}
                <tr>
                    <td class="bold" style="white-space: nowrap;">TOTAL</td>
                    <td class="right bold" style="white-space: nowrap;">Rp ${Number(sale.total).toLocaleString('id-ID')}</td>
                </tr>
                <tr>
                    <td style="white-space: nowrap;">Metode Bayar</td>
                    <td class="right" style="white-space: nowrap;">${sale.paymentMethod === 'SAVING' ? 'Tabungan' : 'Tunai'}</td>
                </tr>
                ${sale.paymentMethod === 'CASH' ? `
                <tr>
                    <td style="white-space: nowrap;">Bayar</td>
                    <td class="right" style="white-space: nowrap;">Rp ${Number(sale.cashAmount || 0).toLocaleString('id-ID')}</td>
                </tr>
                <tr>
                    <td style="white-space: nowrap;">Kembali</td>
                    <td class="right" style="white-space: nowrap;">Rp ${Number(sale.changeAmount || 0).toLocaleString('id-ID')}</td>
                </tr>
                ` : (sale.member ? `
                <tr>
                    <td style="white-space: nowrap;">Sisa Saldo</td>
                    <td class="right" style="white-space: nowrap;">Rp ${(sale.member.sukarelaBalance - Number(sale.total)).toLocaleString('id-ID')}</td>
                </tr>
                ` : '')}
            </table>
            ${(sale.memberId || sale.member) && sale.total >= 10000 ? `
            <div class="divider"></div>
            <div class="center" style="margin: 8px 0; font-weight: bold; border: 1px dashed #000; padding: 4px;">
                POIN DIPEROLEH: +${Math.floor(sale.total / 10000)} Poin
            </div>
            ` : ''}
            <div class="divider"></div>
            <div class="center" style="margin-top: 10px;">
                <p style="margin: 0;">Terima Kasih</p>
                <p style="margin: 2px 0; font-size: 8px;">Selamat Belanja Kembali</p>
            </div>
            <script>
                window.onload = function() {
                    window.print();
                    setTimeout(function() { window.close(); }, 500);
                }
            </script>
       </body>
       </html>
  `);
  printWindow.document.close();
};

