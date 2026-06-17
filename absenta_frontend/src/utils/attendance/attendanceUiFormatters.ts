export function formatDateId(dateStr: string) {
  if (!dateStr) return '-';
  const [y, m, d] = String(dateStr).split('-');
  const dt = new Date(Number(y), Number(m) - 1, Number(d));
  return dt.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
}
