// @ts-nocheck
import { prisma } from '../../../utils/prisma';
import { appLogger } from '@/utils/app-logger';
import { AccountType } from '@prisma/client';

export interface AccountNode {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  isHeader: boolean;
  parentId: string | null;
  isSystem: boolean;
  isActive: boolean;
  balance: number;
  level: number;
  children?: AccountNode[];
  journalCount?: number;
}

export interface CreateAccountInput {
  code: string;
  name: string;
  type: AccountType;
  isHeader?: boolean;
  parentId?: string | null;
}

export interface UpdateAccountInput {
  code?: string;
  name?: string;
  isHeader?: boolean;
  parentId?: string | null;
  isActive?: boolean;
}

export class AccountService {
  /**
   * Standar Hirarki Bagan Akun Enterprise untuk Koperasi Sekolah
   */
  static DEFAULT_HIERARCHICAL_ACCOUNTS = [
    // ── 1. AKTIVA ──
    { code: '1000', name: 'AKTIVA', type: 'ASSET', isHeader: true, parentCode: null },
    { code: '1100', name: 'Aktiva Lancar', type: 'ASSET', isHeader: true, parentCode: '1000' },
    { code: '1010', name: 'Kas Koperasi', type: 'ASSET', isHeader: false, parentCode: '1100' },
    { code: '1011', name: 'Kas Bank Koperasi', type: 'ASSET', isHeader: false, parentCode: '1100' },
    { code: '1020', name: 'Piutang Anggota', type: 'ASSET', isHeader: false, parentCode: '1100' },
    { code: '1030', name: 'Persediaan Barang Toko', type: 'ASSET', isHeader: false, parentCode: '1100' },
    { code: '1500', name: 'Aktiva Tetap', type: 'ASSET', isHeader: true, parentCode: '1000' },
    { code: '1510', name: 'Aktiva Tetap & Peralatan Koperasi', type: 'ASSET', isHeader: false, parentCode: '1500' },
    { code: '1520', name: 'Akumulasi Penyusutan Aktiva Tetap', type: 'ASSET', isHeader: false, parentCode: '1500' },

    // ── 2. KEWAJIBAN ──
    { code: '2000', name: 'KEWAJIBAN', type: 'LIABILITY', isHeader: true, parentCode: null },
    { code: '2100', name: 'Kewajiban Jangka Pendek & Simpanan', type: 'LIABILITY', isHeader: true, parentCode: '2000' },
    { code: '2010', name: 'Tabungan Sukarela Anggota', type: 'LIABILITY', isHeader: false, parentCode: '2100' },
    { code: '2011', name: 'Simpanan Pokok Anggota', type: 'LIABILITY', isHeader: false, parentCode: '2100' },
    { code: '2012', name: 'Simpanan Wajib Anggota', type: 'LIABILITY', isHeader: false, parentCode: '2100' },
    { code: '2013', name: 'Simpanan Sukarela Anggota', type: 'LIABILITY', isHeader: false, parentCode: '2100' },
    { code: '2014', name: 'Simpanan Hari Raya Anggota', type: 'LIABILITY', isHeader: false, parentCode: '2100' },
    { code: '2020', name: 'Tabungan Pokok & Wajib Anggota', type: 'LIABILITY', isHeader: false, parentCode: '2100' },
    { code: '2030', name: 'Hutang Dana Pengurus', type: 'LIABILITY', isHeader: false, parentCode: '2100' },
    { code: '2040', name: 'Hutang Dana Sosial', type: 'LIABILITY', isHeader: false, parentCode: '2100' },
    { code: '2050', name: 'Hutang Dana Pembangunan', type: 'LIABILITY', isHeader: false, parentCode: '2100' },

    // ── 3. EKUITAS & MODAL ──
    { code: '3000', name: 'EKUITAS & MODAL', type: 'EQUITY', isHeader: true, parentCode: null },
    { code: '3010', name: 'Ekuitas Koperasi', type: 'EQUITY', isHeader: false, parentCode: '3000' },
    { code: '3020', name: 'Dana Cadangan Koperasi', type: 'EQUITY', isHeader: false, parentCode: '3000' },

    // ── 4. PENDAPATAN ──
    { code: '4000', name: 'PENDAPATAN', type: 'REVENUE', isHeader: true, parentCode: null },
    { code: '4010', name: 'Pendapatan Toko Koperasi', type: 'REVENUE', isHeader: false, parentCode: '4000' },
    { code: '4020', name: 'Pendapatan Bunga Pinjaman', type: 'REVENUE', isHeader: false, parentCode: '4000' },
    { code: '4030', name: 'Pendapatan Sewa & Kerjasama', type: 'REVENUE', isHeader: false, parentCode: '4000' },
    { code: '4040', name: 'Pendapatan Jasa Giro & Bunga Bank', type: 'REVENUE', isHeader: false, parentCode: '4000' },
    { code: '4090', name: 'Pendapatan Operasional Lain-lain', type: 'REVENUE', isHeader: false, parentCode: '4000' },

    // ── 5. BEBAN & BIAYA ──
    { code: '5000', name: 'BEBAN & BIAYA', type: 'EXPENSE', isHeader: true, parentCode: null },
    { code: '5010', name: 'Beban Pokok Penjualan (COGS)', type: 'EXPENSE', isHeader: false, parentCode: '5000' },
    { code: '5020', name: 'Beban Operasional & Administrasi', type: 'EXPENSE', isHeader: true, parentCode: '5000' },
    { code: '5021', name: 'Beban Listrik, Air & Utilitas', type: 'EXPENSE', isHeader: false, parentCode: '5020' },
    { code: '5022', name: 'Beban Komunikasi & Internet', type: 'EXPENSE', isHeader: false, parentCode: '5020' },
    { code: '5023', name: 'Beban Aplikasi, Perangkat Lunak & TI', type: 'EXPENSE', isHeader: false, parentCode: '5020' },
    { code: '5024', name: 'Beban ATK & Perlengkapan Kantor', type: 'EXPENSE', isHeader: false, parentCode: '5020' },
    { code: '5025', name: 'Beban Pemeliharaan & Servis Sarana', type: 'EXPENSE', isHeader: false, parentCode: '5020' },
    { code: '5026', name: 'Beban Rapat & Operasional Pengurus', type: 'EXPENSE', isHeader: false, parentCode: '5020' },
    { code: '5030', name: 'Beban Penyusutan Aktiva Tetap', type: 'EXPENSE', isHeader: false, parentCode: '5000' },
    { code: '5090', name: 'Beban Operasional Lain-lain', type: 'EXPENSE', isHeader: false, parentCode: '5000' },
  ];

  /**
   * Pastikan struktur pohon default sudah terbentuk untuk tenant ini
   */
  static async ensureDefaultHierarchy(tenantId: string) {
    const existingAccounts = await prisma.account.findMany({
      where: { tenantId },
      select: { id: true, code: true, parentId: true, isHeader: true, isSystem: true }
    });

    const codeToIdMap = new Map<string, string>();
    existingAccounts.forEach(a => codeToIdMap.set(a.code, a.id));

    // 1. Buat semua akun yang belum ada
    for (const def of this.DEFAULT_HIERARCHICAL_ACCOUNTS) {
      if (!codeToIdMap.has(def.code)) {
        try {
          const created = await prisma.account.create({
            data: {
              tenantId,
              code: def.code,
              name: def.name,
              type: def.type as AccountType,
              isHeader: def.isHeader,
              isSystem: true,
              isActive: true,
            }
          });
          codeToIdMap.set(def.code, created.id);
        } catch (e) {
          appLogger.warn({ err: e, code: def.code }, '[AccountService] Race condition saat create default account');
        }
      } else {
        // Tandai sebagai sistem jika akun bawaan
        const acc = existingAccounts.find(a => a.code === def.code);
        if (acc && (!acc.isSystem || acc.isHeader !== def.isHeader)) {
          await prisma.account.update({
            where: { id: acc.id },
            data: { isSystem: true, isHeader: def.isHeader }
          });
        }
      }
    }

    // 2. Hubungkan parentId sesuai parentCode
    for (const def of this.DEFAULT_HIERARCHICAL_ACCOUNTS) {
      if (def.parentCode) {
        const accId = codeToIdMap.get(def.code);
        const parentId = codeToIdMap.get(def.parentCode);
        if (accId && parentId) {
          const current = existingAccounts.find(a => a.id === accId);
          if (!current || current.parentId !== parentId) {
            await prisma.account.update({
              where: { id: accId },
              data: { parentId }
            });
          }
        }
      }
    }
  }

  /**
   * Mengambil daftar akun beserta saldo riil dan struktur pohon hierarki
   */
  static async listAccounts(tenantId: string, options?: { tree?: boolean; search?: string; type?: string }) {
    const where: any = { tenantId };
    if (options?.type && options.type !== 'ALL') {
      where.type = options.type as AccountType;
    }

    // Ambil semua akun
    const accounts = await prisma.account.findMany({
      where,
      orderBy: { code: 'asc' },
      include: {
        _count: {
          select: { journalItems: true }
        }
      }
    });

    // Ambil agregasi debit & kredit seluruh akun
    const accountIds = accounts.map(a => a.id);
    const journalSums = accountIds.length > 0 ? await prisma.journalItem.groupBy({
      by: ['accountId', 'type'],
      where: { accountId: { in: accountIds } },
      _sum: { amount: true }
    }) : [];

    // Map saldo individual per akun (sebelum rollup)
    const rawBalanceMap = new Map<string, number>();
    for (const acc of accounts) {
      rawBalanceMap.set(acc.id, 0);
    }

    const accMap = new Map(accounts.map(a => [a.id, a]));
    for (const group of journalSums) {
      const acc = accMap.get(group.accountId);
      if (!acc) continue;
      const amt = Number(group._sum?.amount || 0);
      const isDebitIncrease = acc.type === 'ASSET' || acc.type === 'EXPENSE';
      const net = (group.type === 'DEBIT') === isDebitIncrease ? amt : -amt;
      const current = rawBalanceMap.get(acc.id) || 0;
      rawBalanceMap.set(acc.id, current + net);
    }

    // Bangun map anak untuk penghitungan rollup hierarki
    const childrenMap = new Map<string, string[]>();
    for (const acc of accounts) {
      if (acc.parentId) {
        const list = childrenMap.get(acc.parentId) || [];
        list.push(acc.id);
        childrenMap.set(acc.parentId, list);
      }
    }

    // Fungsi rekursif untuk menghitung total saldo anak (Rollup)
    const computeRollupBalance = (accId: string): number => {
      let sum = rawBalanceMap.get(accId) || 0;
      const childIds = childrenMap.get(accId) || [];
      for (const cid of childIds) {
        sum += computeRollupBalance(cid);
      }
      return sum;
    };

    // Fungsi menghitung level kedalaman akun
    const getLevel = (accId: string): number => {
      let level = 1;
      let curr = accMap.get(accId);
      while (curr && curr.parentId) {
        level++;
        curr = accMap.get(curr.parentId);
      }
      return level;
    };

    // Konversi akun menjadi AccountNode
    const nodes: AccountNode[] = accounts.map(acc => {
      const balance = acc.isHeader ? computeRollupBalance(acc.id) : (rawBalanceMap.get(acc.id) || 0);
      return {
        id: acc.id,
        code: acc.code,
        name: acc.name,
        type: acc.type,
        isHeader: acc.isHeader,
        parentId: acc.parentId,
        isSystem: acc.isSystem,
        isActive: acc.isActive,
        balance: Math.round(balance),
        level: getLevel(acc.id),
        journalCount: acc._count.journalItems,
      };
    });

    // Jika difilter search teks
    let filteredNodes = nodes;
    if (options?.search && options.search.trim()) {
      const term = options.search.trim().toLowerCase();
      filteredNodes = nodes.filter(n => n.code.toLowerCase().includes(term) || n.name.toLowerCase().includes(term));
    }

    // Jika meminta format struktur pohon (Tree)
    if (options?.tree) {
      const nodeMap = new Map<string, AccountNode>();
      nodes.forEach(n => nodeMap.set(n.id, { ...n, children: [] }));

      const tree: AccountNode[] = [];
      for (const n of nodes) {
        const mapped = nodeMap.get(n.id)!;
        if (n.parentId && nodeMap.has(n.parentId)) {
          nodeMap.get(n.parentId)!.children!.push(mapped);
        } else {
          tree.push(mapped);
        }
      }

      return {
        tree,
        flat: filteredNodes,
        summary: {
          totalAccounts: nodes.length,
          totalHeaders: nodes.filter(n => n.isHeader).length,
          totalPostingAccounts: nodes.filter(n => !n.isHeader).length
        }
      };
    }

    return {
      flat: filteredNodes,
      summary: {
        totalAccounts: nodes.length,
        totalHeaders: nodes.filter(n => n.isHeader).length,
        totalPostingAccounts: nodes.filter(n => !n.isHeader).length
      }
    };
  }

  /**
   * Membuat akun baru dengan validasi integritas hierarki
   */
  static async createAccount(tenantId: string, data: CreateAccountInput) {
    const code = data.code.trim();
    const name = data.name.trim();

    if (!code || !name) {
      throw new Error('Kode akun dan nama akun wajib diisi');
    }

    // Cek duplikasi kode akun
    const existing = await prisma.account.findFirst({
      where: { tenantId, code }
    });
    if (existing) {
      throw new Error(`Akun dengan kode "${code}" sudah terdaftar`);
    }

    let parentId: string | null = null;
    let type = data.type;

    if (data.parentId) {
      const parent = await prisma.account.findFirst({
        where: { id: data.parentId, tenantId }
      });
      if (!parent) {
        throw new Error('Akun induk (parent) tidak ditemukan');
      }
      parentId = parent.id;
      type = parent.type; // Akun anak mewarisi tipe akun induknya

      // Pastikan parent ditandai sebagai isHeader
      if (!parent.isHeader) {
        await prisma.account.update({
          where: { id: parent.id },
          data: { isHeader: true }
        });
      }
    }

    const created = await prisma.account.create({
      data: {
        tenantId,
        code,
        name,
        type,
        isHeader: data.isHeader ?? false,
        parentId,
        isSystem: false,
        isActive: true,
      }
    });

    appLogger.info({ action: 'CREATE_ACCOUNT', tenantId, code, name }, '[AccountService] Berhasil membuat akun baru');
    return created;
  }

  /**
   * Mengubah akun yang ada
   */
  static async updateAccount(tenantId: string, id: string, data: UpdateAccountInput) {
    const account = await prisma.account.findFirst({
      where: { id, tenantId },
      include: { children: true }
    });

    if (!account) {
      throw new Error('Akun tidak ditemukan');
    }

    const updateData: any = {};

    if (data.name !== undefined) {
      const name = data.name.trim();
      if (!name) throw new Error('Nama akun tidak boleh kosong');
      updateData.name = name;
    }

    if (data.code !== undefined && data.code.trim() !== account.code) {
      if (account.isSystem) {
        throw new Error('Kode akun bawaan sistem tidak boleh diubah');
      }
      const code = data.code.trim();
      const existing = await prisma.account.findFirst({
        where: { tenantId, code, id: { not: id } }
      });
      if (existing) {
        throw new Error(`Akun dengan kode "${code}" sudah digunakan oleh akun lain`);
      }
      updateData.code = code;
    }

    if (data.parentId !== undefined) {
      if (data.parentId === id) {
        throw new Error('Akun tidak dapat menjadi induk bagi dirinya sendiri');
      }

      if (data.parentId) {
        const parent = await prisma.account.findFirst({
          where: { id: data.parentId, tenantId }
        });
        if (!parent) throw new Error('Akun induk tidak ditemukan');
        if (parent.type !== account.type) {
          throw new Error('Tipe akun induk harus sama dengan tipe akun ini');
        }
        updateData.parentId = parent.id;

        // Pastikan parent bertanda isHeader
        if (!parent.isHeader) {
          await prisma.account.update({
            where: { id: parent.id },
            data: { isHeader: true }
          });
        }
      } else {
        updateData.parentId = null;
      }
    }

    if (data.isHeader !== undefined) {
      if (!data.isHeader && account.children.length > 0) {
        throw new Error('Akun tidak dapat diubah menjadi akun detail karena masih memiliki sub-akun');
      }
      updateData.isHeader = data.isHeader;
    }

    if (data.isActive !== undefined) {
      updateData.isActive = data.isActive;
    }

    const updated = await prisma.account.update({
      where: { id },
      data: updateData
    });

    appLogger.info({ action: 'UPDATE_ACCOUNT', tenantId, id }, '[AccountService] Berhasil memperbarui akun');
    return updated;
  }

  /**
   * Menghapus akun (dengan perlindungan integritas akuntansi)
   */
  static async deleteAccount(tenantId: string, id: string) {
    const account = await prisma.account.findFirst({
      where: { id, tenantId },
      include: {
        children: true,
        _count: { select: { journalItems: true } }
      }
    });

    if (!account) {
      throw new Error('Akun tidak ditemukan');
    }

    if (account.isSystem) {
      throw new Error('Akun bawaan sistem tidak dapat dihapus');
    }

    if (account.children.length > 0) {
      throw new Error(`Akun "${account.code} - ${account.name}" masih memiliki ${account.children.length} sub-akun. Hapus atau pindahkan sub-akun terlebih dahulu.`);
    }

    if (account._count.journalItems > 0) {
      throw new Error(`Akun "${account.code} - ${account.name}" sudah memiliki ${account._count.journalItems} transaksi jurnal dan tidak dapat dihapus. Anda dapat menonaktifkan akun ini.`);
    }

    await prisma.account.delete({ where: { id } });
    appLogger.info({ action: 'DELETE_ACCOUNT', tenantId, id, code: account.code }, '[AccountService] Berhasil menghapus akun');
    return { success: true, message: `Akun ${account.code} berhasil dihapus` };
  }
}
