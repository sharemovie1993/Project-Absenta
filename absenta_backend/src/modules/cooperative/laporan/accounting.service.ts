// @ts-nocheck
import { prisma } from '../../../utils/prisma';
import { AccountType, JournalType } from '@prisma/client';

export class AccountingService {
    // Akun default untuk inisialisasi per tenant (termasuk kode simpanan koperasi)
    static DEFAULT_COOP_ACCOUNTS = [
        { code: '1010', name: 'Kas Koperasi',                    type: 'ASSET'     as AccountType },
        { code: '1020', name: 'Piutang Anggota',                 type: 'ASSET'     as AccountType },
        { code: '1030', name: 'Persediaan Barang Toko',          type: 'ASSET'     as AccountType },
        { code: '2010', name: 'Tabungan Sukarela Anggota',       type: 'LIABILITY' as AccountType },
        { code: '2011', name: 'Simpanan Pokok Anggota',          type: 'LIABILITY' as AccountType },
        { code: '2012', name: 'Simpanan Wajib Anggota',          type: 'LIABILITY' as AccountType },
        { code: '2013', name: 'Simpanan Sukarela Anggota',       type: 'LIABILITY' as AccountType },
        { code: '2014', name: 'Simpanan Hari Raya Anggota',      type: 'LIABILITY' as AccountType },
        { code: '2020', name: 'Tabungan Pokok & Wajib Anggota',  type: 'LIABILITY' as AccountType },
        { code: '2030', name: 'Hutang Dana Pengurus',            type: 'LIABILITY' as AccountType },
        { code: '2040', name: 'Hutang Dana Sosial',              type: 'LIABILITY' as AccountType },
        { code: '2050', name: 'Hutang Dana Pembangunan',         type: 'LIABILITY' as AccountType },
        { code: '3010', name: 'Ekuitas Koperasi',                type: 'EQUITY'    as AccountType },
        { code: '3020', name: 'Dana Cadangan Koperasi',          type: 'EQUITY'    as AccountType },
        { code: '4010', name: 'Pendapatan Toko Koperasi',        type: 'REVENUE'   as AccountType },
        { code: '4020', name: 'Pendapatan Bunga Pinjaman',       type: 'REVENUE'   as AccountType },
        { code: '5010', name: 'Beban Pokok Penjualan (COGS)',     type: 'EXPENSE'   as AccountType },
        { code: '5020', name: 'Beban Administrasi Koperasi',     type: 'EXPENSE'   as AccountType },
    ];

    /**
     * Inisialisasi atau pastikan akun default sudah ada untuk tenant ini.
     * SELALU dipanggil SEBELUM prisma.$transaction (tidak boleh di dalam tx).
     * Menggunakan pola find-or-create yang aman dari race condition.
     */
    static async getOrCreateDefaultAccounts(tenantId: string): Promise<Record<string, string>> {
        const accounts: Record<string, string> = {};

        for (const defaultAcc of this.DEFAULT_COOP_ACCOUNTS) {
            let acc = await prisma.account.findFirst({
                where: { tenantId, code: defaultAcc.code }
            });

            if (!acc) {
                try {
                    acc = await prisma.account.create({
                        data: {
                            tenantId,
                            code: defaultAcc.code,
                            name: defaultAcc.name,
                            type: defaultAcc.type,
                        }
                    });
                } catch {
                    // Race condition: akun sudah dibuat oleh request lain — coba findFirst lagi
                    acc = await prisma.account.findFirst({
                        where: { tenantId, code: defaultAcc.code }
                    });
                }
            }

            if (acc) accounts[defaultAcc.code] = acc.id;
        }

        return accounts;
    }

    /**
     * Resolve satu account ID berdasarkan kode — dengan fallback auto-create.
     * SELALU dipanggil SEBELUM prisma.$transaction.
     */
    static async resolveAccountId(tenantId: string, code: string, nameFallback?: string): Promise<string> {
        let acc = await prisma.account.findFirst({ where: { tenantId, code } });

        if (!acc) {
            const accType: AccountType =
                code.startsWith('1') ? 'ASSET' :
                code.startsWith('2') ? 'LIABILITY' :
                code.startsWith('3') ? 'EQUITY' :
                code.startsWith('4') ? 'REVENUE' :
                'EXPENSE';

            const accName = nameFallback
                ?? this.DEFAULT_COOP_ACCOUNTS.find(a => a.code === code)?.name
                ?? `Rekening ${code}`;

            try {
                acc = await prisma.account.create({
                    data: { tenantId, code, name: accName, type: accType }
                });
            } catch {
                // Race condition: sudah dibuat oleh request lain
                acc = await prisma.account.findFirst({ where: { tenantId, code } });
            }
        }

        if (!acc) throw new Error(`Gagal menginisialisasi akun dengan kode ${code} untuk tenant ${tenantId}`);
        return acc.id;
    }

    /**
     * Mencatat satu entri jurnal umum (Double-Entry Bookkeeping).
     *
     * PENTING: HARUS dipanggil DI DALAM prisma.$transaction dengan `tx` yang valid.
     * Semua akun HARUS sudah di-pre-warm sebelum masuk tx menggunakan getOrCreateDefaultAccounts().
     *
     * @param tenantId    ID tenant
     * @param description Deskripsi jurnal
     * @param reference   Referensi unik (mis: "SAV-{id}", "LN-{id}", "POS-{id}")
     * @param items       Array { accountCode, type, amount }
     * @param tx          Prisma transaction client (WAJIB)
     * @param date        Tanggal transaksi (default: now)
     */
    static async createJournalEntry(
        tenantId: string,
        description: string,
        reference: string,
        items: { accountCode: string; type: JournalType; amount: number }[],
        tx: any,
        date?: Date,
    ) {
        const client = tx; // Selalu gunakan tx yang diberikan

        // Resolve semua account ID (READ only — akun harus sudah ada dari pre-warm)
        let debitSum  = 0;
        let creditSum = 0;
        const journalItemsData = [];

        for (const item of items) {
            // Cari akun via tx (READ only)
            const acc = await client.account.findFirst({
                where: { tenantId, code: item.accountCode }
            });

            if (!acc) {
                throw new Error(
                    `[AUDIT INTEGRITAS] Akun kode "${item.accountCode}" tidak ditemukan untuk tenant ${tenantId}. ` +
                    `Pastikan getOrCreateDefaultAccounts() atau resolveAccountId() sudah dipanggil sebelum $transaction. ` +
                    `Referensi: ${reference}`
                );
            }

            const roundedAmount = Math.round(item.amount); // Rupiah tidak pakai desimal

            if (item.type === 'DEBIT') debitSum  += roundedAmount;
            else                       creditSum += roundedAmount;

            journalItemsData.push({
                accountId: acc.id,
                type:      item.type,
                amount:    roundedAmount,
            });
        }

        // Validasi keseimbangan Debit = Kredit (threshold 0 — tidak ada toleransi selisih)
        if (debitSum !== creditSum) {
            throw new Error(
                `[AUDIT INTEGRITAS] Jurnal tidak seimbang! ` +
                `Debit: Rp ${debitSum.toLocaleString('id-ID')}, ` +
                `Kredit: Rp ${creditSum.toLocaleString('id-ID')}. ` +
                `Referensi: ${reference}`
            );
        }

        // Simpan Jurnal & Jurnal Items
        return client.journal.create({
            data: {
                tenantId,
                date:        date ?? new Date(),
                description,
                reference,
                items: {
                    create: journalItemsData,
                },
            },
            include: {
                items: { include: { account: true } },
            },
        });
    }
}
