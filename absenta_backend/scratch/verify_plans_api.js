const axios = require('axios');

async function verifyPlans() {
  try {
    const response = await axios.get('http://localhost:3001/api/billing/plans/public');
    if (response.data.success) {
      const plans = response.data.data;
      console.log(`Berhasil mengambil ${plans.length} paket.`);
      
      const firstPlanWithLabel = plans.find(p => p.size_label);
      if (firstPlanWithLabel) {
        console.log('✅ Verifikasi SUKSES: Kolom size_label ditemukan.');
        console.log('Contoh Paket:', {
          name: firstPlanWithLabel.name,
          size_label: firstPlanWithLabel.size_label,
          tier: firstPlanWithLabel.tier
        });
      } else {
        console.log('❌ Verifikasi GAGAL: Tidak ada paket dengan size_label.');
        console.log('Contoh Data (1 paket):', plans[0] ? JSON.stringify(plans[0], null, 2) : 'Kosong');
      }
      
      // Tampilkan ringkasan distribusi label
      const labels = plans.reduce((acc, p) => {
        const label = p.size_label || 'Standard (Fallback)';
        acc[label] = (acc[label] || 0) + 1;
        return acc;
      }, {});
      console.log('Distribusi Label:', labels);

    } else {
      console.error('API Error:', response.data.message);
    }
  } catch (error) {
    console.error('Fetch Error:', error.message);
  }
}

verifyPlans();
