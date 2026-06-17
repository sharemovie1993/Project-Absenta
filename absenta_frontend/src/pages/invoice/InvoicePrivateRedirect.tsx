import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getPublicInvoiceLink } from '../../api/mySubscription.api';
import { Loader } from '../../components/ui';
import { EnhancedAlert } from '../../components/ui';

export default function InvoicePrivateRedirect() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!id) {
        setError('Invoice ID tidak valid');
        return;
      }
      try {
        const res = await getPublicInvoiceLink(id);
        const url = res?.data?.url;
        const token = res?.data?.token;
        if (!alive) return;
        if (url) {
          window.location.replace(url);
        } else if (token) {
          navigate(`/invoice/public/${encodeURIComponent(token)}`, { replace: true });
        } else {
          setError('Gagal mendapatkan tautan publik invoice.');
        }
      } catch (e: any) {
        if (!alive) return;
        setError(e?.response?.data?.message || e?.message || 'Gagal mengarahkan ke invoice publik.');
      }
    })();
    return () => { alive = false; };
  }, [id, navigate]);

  if (error) {
    return <EnhancedAlert variant="destructive" title="Terjadi kesalahan" description={error} />;
  }
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader size="lg" />
    </div>
  );
}
