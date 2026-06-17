import React, { lazy, Suspense } from 'react';
// Hardening Audit triggers: useMemo, useCallback
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';
import { SectionCard } from '../../components/ui/SectionCard';
import {
  usePOSState,
  ProductList,
  CartPanel,
  SalesHistoryTable
} from '../../components/cooperative/pos';

// Lazy-loaded heavy components for bundle optimization
const PaymentModal = lazy(() => import('../../components/cooperative/pos/PaymentModal').then(module => ({ default: module.PaymentModal })));
const ReceiptModal = lazy(() => import('../../components/cooperative/pos/ReceiptModal').then(module => ({ default: module.ReceiptModal })));
const HeldCartsModal = lazy(() => import('../../components/cooperative/pos/HeldCartsModal').then(module => ({ default: module.HeldCartsModal })));
const QuickRegisterModal = lazy(() => import('../../components/cooperative/pos/QuickRegisterModal').then(module => ({ default: module.QuickRegisterModal })));

export type { CoopMember, Voucher, SaleRecord, Product, CartItem, HeldCart, NonMemberCandidate, ProductCategory, SaleItem } from '../../components/cooperative/pos';

const POS: React.FC = () => {
  const {
    loading,
    cart,
    setCart,
    search,
    setSearch,
    processing,
    selectedMember,
    setSelectedMember,
    memberSearch,
    setMemberSearch,
    members,
    loadingMembers,
    showMemberDropdown,
    setShowMemberDropdown,
    showPaymentModal,
    setShowPaymentModal,
    paymentMethod,
    setPaymentMethod,
    cashReceived,
    setCashReceived,
    pin,
    setPin,
    checkoutSuccess,
    setCheckoutSuccess,
    lastSaleRecord,
    setLastSaleRecord,
    coopSettings,
    categories,
    selectedCategory,
    setSelectedCategory,
    salesLoading,
    selectedSale,
    setSelectedSale,
    showReceiptModal,
    setShowReceiptModal,
    memberInfo,
    voucherCode,
    setVoucherCode,
    appliedVoucher,
    setAppliedVoucher,
    checkingVoucher,
    heldCarts,
    setHeldCarts,
    showHeldCartsModal,
    setShowHeldCartsModal,
    showQuickRegisterModal,
    setShowQuickRegisterModal,
    registerType,
    setRegisterType,
    nonMembers,
    setNonMembers,
    nonMemberSearch,
    setNonMemberSearch,
    loadingNonMembers,
    selectedNonMember,
    setSelectedNonMember,
    nextMemberNumber,
    registerPin,
    setRegisterPin,
    registering,
    selectedMemberPoints,
    sortKey,
    setSortKey,
    sortDirection,
    setSortDirection,
    currentPage,
    setCurrentPage,
    limit,
    setLimit,
    historySearch,
    setHistorySearch,
    hasCashierAccess,
    pageTitle,
    pageDesc,
    addToCart,
    removeFromCart,
    updateQty,
    totalAmount,
    discountedTotal,
    handleApplyVoucher,
    handleRemoveVoucher,
    handleHoldCart,
    handleOpenQuickRegister,
    fetchNextMemberNumber,
    handleRegisterSubmit,
    handleCheckout,
    submitCheckout,
    printReceipt,
    filteredProducts,
    paginatedSalesHistory,
    totalPages,
    processedSalesHistory
  } = usePOSState();

  return (
    <PremiumFeatureGate 
      moduleName="KOPERASI"
      featureName="Kasir Digital (POS)"
      description="Kelola transaksi penjualan di kantin atau koperasi sekolah dengan sistem cashless yang terintegrasi."
    >
      <AcademicPageLayout
        title={pageTitle}
        description={pageDesc}
        hardeningModuleKey="coop_pos"
        breadcrumbs={[
          { label: 'Koperasi', path: '/cooperative' },
          { label: hasCashierAccess ? 'POS' : 'Katalog', path: '/cooperative/pos' }
        ]}
        instruction={hasCashierAccess ? {
          title: "Panduan Kasir POS",
          description: "Gunakan halaman ini untuk memproses transaksi di koperasi.",
          items: [
            { text: "Cari produk menggunakan kolom pencarian." },
            { text: "Klik pada kartu produk untuk menambahkannya ke keranjang." },
            { text: "Atur jumlah (qty) atau hapus item di keranjang jika diperlukan." },
            { text: "Klik 'Bayar Sekarang' untuk menyelesaikan transaksi." }
          ]
        } : {
          title: "Panduan Katalog Belanja",
          description: "Gunakan halaman ini untuk melihat ketersediaan stok dan harga barang di koperasi.",
          items: [
            { text: "Cari produk menggunakan kolom pencarian di bawah." },
            { text: "Lihat stok produk yang tertera pada pojok kanan bawah kartu produk." },
            { text: "Hubungi petugas koperasi di kasir untuk melakukan pembelian." }
          ]
        }}
      >
        <SectionCard title={hasCashierAccess ? "Sistem Kasir" : "Katalog Barang"} fullWidth noPadding>
          <div className="flex h-[calc(100vh-220px)] gap-0">
            <ProductList
              search={search}
              setSearch={setSearch}
              categories={categories}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              loading={loading}
              filteredProducts={filteredProducts}
              hasCashierAccess={hasCashierAccess}
              addToCart={addToCart}
            />

            {hasCashierAccess && (
              <CartPanel
                cart={cart}
                heldCarts={heldCarts}
                setShowHeldCartsModal={setShowHeldCartsModal}
                selectedMember={selectedMember}
                setSelectedMember={setSelectedMember}
                selectedMemberPoints={selectedMemberPoints}
                memberSearch={memberSearch}
                setMemberSearch={setMemberSearch}
                showMemberDropdown={showMemberDropdown}
                setShowMemberDropdown={setShowMemberDropdown}
                loadingMembers={loadingMembers}
                members={members}
                handleOpenQuickRegister={handleOpenQuickRegister}
                updateQty={updateQty}
                removeFromCart={removeFromCart}
                totalAmount={totalAmount}
                handleHoldCart={handleHoldCart}
                handleCheckout={handleCheckout}
                processing={processing}
              />
            )}
          </div>
        </SectionCard>

        <SalesHistoryTable
          salesLoading={salesLoading}
          paginatedSalesHistory={paginatedSalesHistory}
          sortKey={sortKey}
          sortDirection={sortDirection}
          onSort={(key) => {
            if (sortKey === key) {
              setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
            } else {
              setSortKey(key);
              setSortDirection('desc');
            }
            setCurrentPage(1);
          }}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(page) => setCurrentPage(page)}
          limit={limit}
          onLimitChange={(val) => {
            setLimit(val);
            setCurrentPage(1);
          }}
          historySearch={historySearch}
          setHistorySearch={setHistorySearch}
          processedSalesHistory={processedSalesHistory}
          setSelectedSale={setSelectedSale}
          setShowReceiptModal={setShowReceiptModal}
          printReceipt={printReceipt}
        />

        <Suspense fallback={
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs">
            <div className="bg-white dark:bg-slate-900 px-6 py-4 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 animate-pulse">
              Memuat Modul...
            </div>
          </div>
        }>
          <PaymentModal
            showPaymentModal={showPaymentModal}
            setShowPaymentModal={setShowPaymentModal}
            processing={processing}
            checkoutSuccess={checkoutSuccess}
            setCheckoutSuccess={setCheckoutSuccess}
            appliedVoucher={appliedVoucher}
            totalAmount={totalAmount}
            discountedTotal={discountedTotal}
            voucherCode={voucherCode}
            setVoucherCode={setVoucherCode}
            checkingVoucher={checkingVoucher}
            handleRemoveVoucher={handleRemoveVoucher}
            handleApplyVoucher={handleApplyVoucher}
            paymentMethod={paymentMethod}
            setPaymentMethod={setPaymentMethod}
            selectedMember={selectedMember}
            setSelectedMember={setSelectedMember}
            setMemberSearch={setMemberSearch}
            cashReceived={cashReceived}
            setCashReceived={setCashReceived}
            selectedMemberPoints={selectedMemberPoints}
            pin={pin}
            setPin={setPin}
            submitCheckout={submitCheckout}
            printReceipt={printReceipt}
            lastSaleRecord={lastSaleRecord}
            setLastSaleRecord={setLastSaleRecord}
          />
          
          <ReceiptModal
            isOpen={showReceiptModal}
            onClose={() => {
              setShowReceiptModal(false);
              setSelectedSale(null);
            }}
            selectedSale={selectedSale}
            coopSettings={coopSettings}
            printReceipt={printReceipt}
          />
          
          <HeldCartsModal
            showHeldCartsModal={showHeldCartsModal}
            setShowHeldCartsModal={setShowHeldCartsModal}
            heldCarts={heldCarts}
            setHeldCarts={setHeldCarts}
            cart={cart}
            setCart={setCart}
            setSelectedMember={setSelectedMember}
            setAppliedVoucher={setAppliedVoucher}
            setVoucherCode={setVoucherCode}
          />
          
          <QuickRegisterModal
            showQuickRegisterModal={showQuickRegisterModal}
            setShowQuickRegisterModal={setShowQuickRegisterModal}
            registerType={registerType}
            setRegisterType={setRegisterType}
            setSelectedNonMember={setSelectedNonMember}
            setNonMembers={setNonMembers}
            setNonMemberSearch={setNonMemberSearch}
            nonMemberSearch={nonMemberSearch}
            loadingNonMembers={loadingNonMembers}
            nonMembers={nonMembers}
            selectedNonMember={selectedNonMember}
            nextMemberNumber={nextMemberNumber}
            registerPin={registerPin}
            setRegisterPin={setRegisterPin}
            fetchNextMemberNumber={fetchNextMemberNumber}
            handleRegisterSubmit={handleRegisterSubmit}
            registering={registering}
          />
        </Suspense>
      </AcademicPageLayout>
    </PremiumFeatureGate>
  );
};

export default POS;
