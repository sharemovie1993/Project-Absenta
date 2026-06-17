# Blueprint – Deploy K8s Single Node (k3s) via WireGuard

Dokumen ini merinci skenario simulasi Kubernetes single‑node (k3s) untuk Absenta, dengan reverse proxy dan database/redis tetap terhubung melalui WireGuard. Tujuan: owner dapat “tinggal pilih mode” di script, dan arsitektur siap tumbuh ke multi‑node/cluster tanpa rombak aplikasi.

## Topologi (Simulasi)

```
Internet
   |
   v
VPS Reverse Proxy (Publik)
  - Nginx/Traefik
  - WireGuard peer (wg0)
   |
   |  (WireGuard tunnel)
   v
VPS Backend (k3s single-node)
  - k3s (Kubernetes ringan)
  - Pod: backend-api
  - Pod: worker-attendance (N replicas)
  - Pod: worker-notification (N replicas)
  - Pod: worker-billing, analytics, maintenance, infra
  - Ingress Controller (Traefik k3s) atau Service NodePort
   |
   |  (WireGuard tunnel)
   v
Sekolah (On-Prem VM)
  - PostgreSQL (listen wg-ip:5432, pg_hba allow wg-backend)
  - Redis (bind wg-ip:6379, requirepass/ACL)
```

Catatan: Untuk simulasi awal, disarankan Reverse Proxy → Backend via NodePort terlebih dahulu (paling sederhana), baru kemudian dirapikan ke Ingress.

## Prasyarat

- VPS Backend (8 vCPU, 8 GB RAM) menjalankan WireGuard ke sekolah dan reverse proxy.
- VM PostgreSQL & Redis di sekolah sudah terhubung wg dan hanya menerima koneksi dari wg backend.
- Image container Absenta (backend dan frontend) tersedia (Docker registry publik/privat).
- Domain & SSL tetap di reverse proxy VPS (publik), upstream ke backend via WireGuard.

## Mode Routing yang Disarankan (Simulasi Pertama)

1) NodePort (paling mudah)
- Ingress Controller optional; expose Service `backend-api` via NodePort (mis. 32001).
- Reverse Proxy upstream ke `http://<WG_BACKEND_IP>:32001` untuk `/api` dan ke port NodePort frontend (jika frontend ikut k3s).

2) Ingress Controller (lebih rapi, langkah selanjutnya)
- Gunakan Traefik bawaan k3s.
- Reverse Proxy upstream ke `http://<WG_BACKEND_IP>:80` (Traefik).

## Langkah Implementasi (Owner‑Friendly)

1) Install k3s (single node) di VPS Backend
- Skrip akan:
  - Memasang k3s
  - Memastikan `kubectl` tersedia
  - Membuat namespace: `absenta`

2) Siapkan Secrets & ConfigMap
- Simpan kredensial ke Secret:
  - `DATABASE_URL=postgresql://user:pass@<WG_PG_IP>:5432/absensi`
  - `REDIS_URL=redis://:pass@<WG_REDIS_IP>:6379`
  - Secret lain (email/payment) jika diperlukan.
- Simpan non‑secret config (domain publik aplikasi, base URL invoice, dsb.) ke ConfigMap.

3) Deploy API & Workers
- Deployment `backend-api` (replica 1).
- Deployment `worker-attendance` (replica 2), `worker-notification` (replica 2), `worker-billing` (replica 1), `worker-analytics`, `worker-maintenance`, `worker-infra` (masing‑masing 1).
- Service untuk `backend-api`: NodePort 32001 (contoh). Workers umumnya tidak diekspos.

4) Reverse Proxy Update
- Nginx/Traefik di VPS Reverse Proxy:
  - Upstream `/api` → `http://<WG_BACKEND_IP>:32001`
  - (Jika frontend di luar k3s, abaikan. Jika frontend di k3s, sediakan NodePort lain dan arahkan `/` ke port tersebut.)

5) Uji Coba
- Cek `kubectl get pods -n absenta` sampai semua pod READY.
- Cek `/health` API via reverse proxy (domain publik) memastikan upstream jalan.
- Uji koneksi DB/Redis melalui log pod API (jika perlu).

## Contoh Manifest (Skeleton)

Namespace:
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: absenta
```

Secret (DATABASE_URL & REDIS_URL):
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: absenta-secrets
  namespace: absenta
type: Opaque
data:
  DATABASE_URL: <base64>
  REDIS_URL: <base64>
```

ConfigMap (non‑secret):
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: absenta-config
  namespace: absenta
data:
  MAIN_DOMAIN: "example.com"
  PUBLIC_APP_URL: "https://app.example.com"
  PUBLIC_INVOICE_BASE_URL: "https://app.example.com/invoices"
```

Deployment API + Service NodePort:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend-api
  namespace: absenta
spec:
  replicas: 1
  selector:
    matchLabels: { app: backend-api }
  template:
    metadata:
      labels: { app: backend-api }
    spec:
      containers:
        - name: api
          image: absenta-backend:latest
          command: ["node","dist/server.js"]
          envFrom:
            - secretRef: { name: absenta-secrets }
            - configMapRef: { name: absenta-config }
          ports:
            - containerPort: 3001
---
apiVersion: v1
kind: Service
metadata:
  name: backend-api
  namespace: absenta
spec:
  type: NodePort
  selector: { app: backend-api }
  ports:
    - name: http
      port: 3001
      targetPort: 3001
      nodePort: 32001
```

Deployment Worker (contoh attendance, pola sama untuk lainnya):
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: worker-attendance
  namespace: absenta
spec:
  replicas: 2
  selector:
    matchLabels: { app: worker-attendance }
  template:
    metadata:
      labels: { app: worker-attendance }
    spec:
      containers:
        - name: worker
          image: absenta-backend:latest
          command: ["node","dist/workers/attendance.worker.js"]
          envFrom:
            - secretRef: { name: absenta-secrets }
            - configMapRef: { name: absenta-config }
```

## Desain Menu di `deploylinux.sh` (Blueprint)

Tambahkan pilihan baru:

- “Deploy/Update K3S (Single Node)”
  - Install k3s jika belum ada
  - Apply namespace, secrets, configmap
  - Apply Deployment + Service NodePort API, Deployment workers
  - (Opsional) Apply Ingress Controller (Traefik) dan Ingress (jika bukan NodePort)

- “Status K3S (Pods/Services)”
  - Menjalankan `kubectl get pods,svc -n absenta`

- “Uninstall K3S stack Absenta”
  - Delete resources `kubectl delete -n absenta ...`

## Catatan Keamanan & Operasional

- Pastikan PostgreSQL & Redis hanya menerima koneksi dari IP WireGuard backend (tight firewall).
- Simpan secrets ke K8s Secret, jangan hardcode di manifest.
- Gunakan registry image yang stabil/terautentikasi (jika privat).
- Logging & monitoring: siapkan akses log pod (`kubectl logs`) dan metrics dasar.

## Jalan ke Depan (Autoscale K8s)

- Tambahkan **KEDA** (autoscaling lewat antrean Redis) agar replica worker naik/turun otomatis.
- Tambahkan HPA untuk `backend-api` berbasis CPU/memory atau custom metrics.
- Jika cluster bertambah, reverse proxy tetap via WireGuard; Ingress Controller akan mengatur routing internal ke pods.

---
Dokumen ini menyederhanakan proses dari sudut pandang owner: simulasi k3s single node bisa dilakukan tanpa merombak cara Bapak mengelola reverse proxy dan WireGuard. Ketika beban naik, tinggal menambah replicas/VM; saat waktunya pindah multi‑node, manifest yang sama dapat dipakai di cluster yang lebih besar.

