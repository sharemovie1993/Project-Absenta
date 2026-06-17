Instruksi – Feature State Engine Implementation

Tujuan implementasi ini adalah menentukan status layanan tenant secara konsisten di seluruh sistem Absenta.

State layanan:

LOCKED
TRIAL
ACTIVE
EXPIRED

State dihitung secara runtime berdasarkan subscription tenant.

---

STEP 1 – Tambahkan FeatureState Enum

Buat enum baru:

src/types/feature-state.ts

export enum FeatureState {
LOCKED = "LOCKED",
TRIAL = "TRIAL",
ACTIVE = "ACTIVE",
EXPIRED = "EXPIRED"
}

---

STEP 2 – Buat FeatureStateResolver

Buat service baru:

src/services/feature-state-resolver.service.ts

Service ini menentukan status layanan tenant.

Method utama:

resolveFeatureState(tenantId, feature)

Logic:

Jika tenant tidak memiliki subscription untuk feature

return LOCKED

Jika subscription.trial_end > now

return TRIAL

Jika subscription.status == ACTIVE

return ACTIVE

Jika subscription.status == EXPIRED

return EXPIRED

---

STEP 3 – Integrasi dengan SidebarRenderingService

Update sidebar service.

Saat membangun menu:

menu.feature_state = resolveFeatureState(tenantId, requiredFeature)

Contoh response API:

{
label: "Absensi",
path: "/menu/attendance",
feature: "ABSENSI",
feature_state: "TRIAL"
}

Jika feature belum dibeli:

feature_state = LOCKED

---

STEP 4 – Update ServiceFeatureGuard

Update guard agar membaca feature_state.

Logic:

LOCKED → allow GET, block mutation
TRIAL → allow all
ACTIVE → allow all
EXPIRED → allow GET, block mutation

Mutation berarti:

POST
PUT
PATCH
DELETE

Response jika mutation diblok:

403 FEATURE_NOT_ENABLED

---

STEP 5 – Update Sidebar API Response

Endpoint:

GET /api/menu/sidebar

Tambahkan field:

feature_state

Contoh:

{
label: "Koperasi",
path: "/menu/cooperative",
feature_state: "LOCKED"
}

---

STEP 6 – UI Compatibility

Frontend harus mengenali:

feature_state

Mapping UI:

LOCKED → icon lock
TRIAL → badge trial
ACTIVE → normal
EXPIRED → warning icon

---

STEP 7 – Verification

Simulasikan tenant dengan kondisi berikut.

Tenant tanpa layanan:

feature_state = LOCKED

Tenant trial:

feature_state = TRIAL

Tenant berlangganan:

feature_state = ACTIVE

Tenant expired:

feature_state = EXPIRED

Sidebar harus menampilkan state tersebut.
