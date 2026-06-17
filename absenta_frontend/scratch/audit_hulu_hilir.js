
const BASE_URL = 'http://localhost:3001/api';
const EMAIL = 'neple@gmail.com';
const PASS = 'admin1234';

async function audit() {
  console.log('=== AUDIT HULU KE HILIR: PENUGASAN KAPROG (THE OVERWRITE TEST) ===\n');

  try {
    // 1. LOGIN
    console.log('[1/5] Melakukan Otentikasi...');
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: EMAIL, password: PASS })
    });
    const loginData = await loginRes.json();
    if (!loginData.success) throw new Error('Login Gagal: ' + loginData.message);
    
    const token = loginData.data.token;
    const tenantId = loginData.data.user.tenant_id;
    console.log('✅ Login Berhasil. Tenant ID:', tenantId);

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Tenant-ID': tenantId
    };

    // 2. AMBIL TREE
    console.log('\n[2/5] Mengambil Data Tree Organisasi...');
    const treeRes = await fetch(`${BASE_URL}/academic/struktur-organisasi/tree`, { headers });
    const treeData = await treeRes.json();
    
    let targetNode = null;
    let targetMember = null;
    const kaprogs = treeData.data.KAPROG || [];
    
    for (const node of kaprogs) {
      if (node.members && node.members.length > 0) {
        targetNode = node;
        targetMember = node.members[0];
        break;
      }
    }

    if (!targetNode) throw new Error('Tidak ditemukan KAPROG yang terisi untuk testing');

    console.log('🎯 Target Ditemukan:');
    console.log('   - Jabatan:', targetNode.nama);
    console.log('   - Penghuni Saat Ini:', targetMember.name);
    console.log('   - Unit ID (Konteks):', targetMember.unit_id);

    // 3. CARI GURU PENGGANTI
    console.log('\n[3/5] Mengambil Daftar Guru untuk Pengganti...');
    const guruRes = await fetch(`${BASE_URL}/academic/guru?page=1&limit=50&search=`, { headers });
    const guruListData = await guruRes.json();
    
    console.log('📦 RAW GURU LIST DATA:', JSON.stringify(guruListData, null, 2).substring(0, 1000));
    
    // Cari array gurunya
    const gurus = guruListData.data?.data || guruListData.data || [];
    if (gurus.length === 0) throw new Error('Daftar guru kosong di API');

    const newGuru = gurus.find(g => (g.nama_guru || g.name) !== targetMember.name) || gurus[0];
    const newGuruId = newGuru.id;
    const newGuruName = newGuru.nama_guru || newGuru.name;

    console.log(`🎯 Calon Pengganti: ${newGuruName} (ID: ${newGuruId})`);

    // 4. UJI TIMPA (POST WITH CONTEXT)
    const postPayload = {
      guru_id: newGuruId,
      unit_id: targetNode.unit_id || targetMember.unit_id,
      start_date: new Date().toISOString().split('T')[0]
    };

    console.log('\n[4/5] Mengirim POST (Assign) dengan Payload Konteks Penuh...');
    console.log('📡 Payload:', JSON.stringify(postPayload, null, 2));
    
    const postRes = await fetch(`${BASE_URL}/academic/struktur-organisasi/${targetNode.id}/guru`, {
      method: 'POST',
      headers,
      body: JSON.stringify(postPayload)
    });
    const postData = await postRes.json();
    console.log('📡 POST Response Status:', postRes.status);
    console.log('📡 POST Response Body:', JSON.stringify(postData, null, 2));

    // 5. VALIDASI AKHIR
    console.log('\n[5/5] Melakukan Validasi Akhir (Refresh Tree)...');
    await new Promise(r => setTimeout(r, 1500)); // Tunggu lebih lama sedikit
    const finalTreeRes = await fetch(`${BASE_URL}/academic/struktur-organisasi/tree`, { headers });
    const finalTreeData = await finalTreeRes.json();
    
    const finalNode = finalTreeData.data.KAPROG.find(n => n.id === targetNode.id);
    console.log('🏁 Hasil Akhir di Jabatan', targetNode.nama, ':');
    if (finalNode.members && finalNode.members.length > 0) {
      console.log('   ✅ Penghuni Sekarang:', finalNode.members[0].name);
      if (finalNode.members[0].name === newGuru.nama_guru) {
        console.log('\n🌟 KESIMPULAN: AUDIT BERHASIL! POST dengan Konteks Penuh Berhasil Menimpa Data.');
      } else {
        console.log('\n❌ KESIMPULAN: DATA TIDAK BERUBAH. Bahkan POST dengan Konteks pun gagal menimpa.');
      }
    }

  } catch (err) {
    console.error('\n❌ AUDIT TERHENTI:', err.message);
  }
}

audit();
