# MODULE OBSERVABILITY

## Deskripsi
Modul Observability memantau kesehatan operasional server, kueri database lambat, tekanan memori, antrean job Redis, serta memicu sistem alarm otomatis jika terdeteksi anomali pada infrastruktur Absenta.id.

## Aktor & Peran
- **DevOps / Platform Superadmin**: Penerima alert anomali sistem dan pemantau dashboard kesehatan platform global.

## Sub-Modul & Fitur Terimplementasi
### 1. Metrics Aggregator
- **ObservabilityAggregationService**: Mengumpulkan data performa database Prisma, penggunaan CPU/RAM, serta latensi routing HTTP.
- **Alert Engine**: Detektor ambang batas bahaya (misal: Memory > 90% atau API Response > 2s) yang memicu alert terenkripsi.

## Teknologi & Pattern
- **Pattern**: Monitoring System Pattern, Threshold-based Alerting.
- **Database**: Tabel `SystemHealthMetric`.
