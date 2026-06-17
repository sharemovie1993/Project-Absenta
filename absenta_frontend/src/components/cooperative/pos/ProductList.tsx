import React from 'react';
import { Search, ShoppingCart } from 'lucide-react';
import type { Product, ProductCategory } from './usePOSState';

interface ProductListProps {
  search: string;
  setSearch: (val: string) => void;
  categories: ProductCategory[];
  selectedCategory: string | null;
  setSelectedCategory: (val: string | null) => void;
  loading: boolean;
  filteredProducts: Product[];
  hasCashierAccess: boolean;
  addToCart: (product: Product) => void;
}

export const ProductList: React.FC<ProductListProps> = ({
  search,
  setSearch,
  categories,
  selectedCategory,
  setSelectedCategory,
  loading,
  filteredProducts,
  hasCashierAccess,
  addToCart
}) => {
  return (
    <div className={`${hasCashierAccess ? 'w-2/3 border-r' : 'w-full'} flex flex-col bg-white dark:bg-slate-950 border-slate-100 dark:border-slate-800 overflow-hidden`}>
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            id="searchProduct"
            name="searchProduct"
            placeholder="Cari barang (nama/kode)..." 
            className="w-full pl-10 pr-12 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white dark:bg-slate-900"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Cari Produk"
          />
          {hasCashierAccess && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center pointer-events-none select-none">
              <kbd className="px-1.5 py-0.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded shadow-sm">F2</kbd>
            </div>
          )}
        </div>
        
        {/* Category Filtering Pills */}
        {categories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800 whitespace-nowrap">
            <button
              type="button"
              onClick={() => setSelectedCategory(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all duration-200 ${
                !selectedCategory
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                  : 'bg-slate-100 text-slate-650 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              Semua Produk
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.name)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all duration-200 ${
                  selectedCategory?.toLowerCase() === cat.name.toLowerCase()
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                    : 'bg-slate-100 text-slate-650 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex justify-center items-center h-full text-slate-500">Loading products...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex justify-center items-center h-full text-slate-400 text-center">
            <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-20" />
            <p>Tidak ada produk ditemukan.</p>
          </div>
        ) : (
          <div className={`grid grid-cols-2 gap-4 ${hasCashierAccess ? 'md:grid-cols-3' : 'md:grid-cols-4 lg:grid-cols-5'}`}>
            {filteredProducts?.map(product => (
              <div 
                key={product.id} 
                onClick={hasCashierAccess && product.stock > 0 ? () => addToCart(product) : undefined}
                className={`p-4 border rounded-lg transition-all flex flex-col justify-between ${hasCashierAccess && product.stock > 0 ? 'cursor-pointer hover:shadow-md hover:border-blue-300' : ''} ${product.stock <= 0 ? 'opacity-50 bg-gray-100' : 'bg-white'}`}
              >
                <div>
                  <h3 className="font-semibold text-gray-800 line-clamp-2">{product.name}</h3>
                  <p className="text-sm text-gray-500">{product.code}</p>
                </div>
                <div className="mt-2 flex justify-between items-end">
                  <span className="font-bold text-blue-600">Rp {Number(product.price).toLocaleString('id-ID')}</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${product.stock > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    Stok: {product.stock}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
