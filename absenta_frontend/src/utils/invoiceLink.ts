export function invoicePublicPath(token: string): string {
  const t = String(token || '').trim();
  return `/invoice/public/${encodeURIComponent(t)}`;
}

export function openInvoicePublic(token: string, target: '_blank' | '_self' = '_blank') {
  const url = invoicePublicPath(token);
  if (typeof window !== 'undefined') {
    if (target === '_self') {
      window.location.assign(url);
    } else {
      window.open(url, target);
    }
  }
  return url;
}
