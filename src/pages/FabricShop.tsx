import { useEffect, useMemo, useState } from 'react';

import { Search, AlertCircle, X, Eye, ShoppingCart, Package, Tag, Ruler, RefreshCw } from 'lucide-react';

import { fetchCatalogFabrics } from '../lib/fabrics';

import type { CatalogFabric } from '../lib/fabrics';

import { addToCart } from '../lib/cart';

import { supabase } from '../lib/supabase';



// Maps commonly used fabric color names to approximate CSS colors for the swatch dot.

function colorToCss(name: string): string {

  const map: Record<string, string> = {

    white: '#F8F8F8', ivory: '#FFFFF0', cream: '#FFF8E7', 'off-white': '#FAF5EB',

    black: '#1a1a1a', grey: '#9CA3AF', gray: '#9CA3AF', charcoal: '#4B5563',

    red: '#DC2626', crimson: '#B91C1C', maroon: '#7F1D1D',

    blue: '#2563EB', navy: '#1E3A5F', royal: '#1E40AF', teal: '#0D9488',

    green: '#16A34A', olive: '#65A30D', mint: '#6EE7B7',

    yellow: '#EAB308', golden: '#D97706', gold: '#B45309',

    orange: '#EA580C', peach: '#FCA5A5', coral: '#F87171',

    purple: '#9333EA', violet: '#7C3AED', lavender: '#C4B5FD',

    pink: '#EC4899', rose: '#FB7185', magenta: '#D946EF',

    brown: '#92400E', tan: '#D4B483', beige: '#D4B896',

    khaki: '#C3B091', camel: '#C19A6B', natural: '#D4B896',

    indigo: '#4338CA', cyan: '#0891B2', turquoise: '#0D9488',

    silver: '#C0C0C0', bronze: '#CD7F32',

  };

  const key = (name ?? '').toLowerCase().trim();

  return map[key] ?? '#94A3B8';

}



export function FabricShop({ onNavigate }: { onNavigate: (page: string) => void }) {

  const [fabrics, setFabrics] = useState<CatalogFabric[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState('');

  const [search, setSearch] = useState('');

  const [typeFilter, setTypeFilter] = useState('All');

  const [selectedFabric, setSelectedFabric] = useState<CatalogFabric | null>(null);

  const [cartFabric, setCartFabric] = useState<CatalogFabric | null>(null);

  const [requestedLength, setRequestedLength] = useState('');

  const [cartNotice, setCartNotice] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null);



  const loadFabrics = async () => {

    try {

      setError('');

      const rows = await fetchCatalogFabrics();

      setFabrics(rows);

    } catch (e) {

      setError(e instanceof Error ? e.message : 'Failed to load products');

    }

  };



  useEffect(() => {

    const run = async () => {

      setLoading(true);

      await loadFabrics();

      setLoading(false);

    };

    run();



    // Realtime — refresh catalog whenever any fabric row changes

    const channel = supabase

      .channel('fabrics-live-updates')

      .on('postgres_changes', { event: '*', schema: 'public', table: 'fabrics' }, () => {

        loadFabrics();

      })

      .subscribe();



    return () => { supabase.removeChannel(channel); };

  }, []);



  // All unique fabric types for the filter bar

  const allTypes = useMemo(() => {

    const types = Array.from(new Set(fabrics.map((f) => f.type).filter(Boolean)));

    return ['All', ...types.sort()];

  }, [fabrics]);



  const visibleFabrics = useMemo(() => {

    let list = fabrics;

    if (typeFilter !== 'All') list = list.filter((f) => f.type === typeFilter);

    const q = search.trim().toLowerCase();

    if (q) {

      list = list.filter((f) =>

        f.name.toLowerCase().includes(q) ||

        f.type.toLowerCase().includes(q) ||

        (f.color ?? '').toLowerCase().includes(q) ||

        (f.millName ?? '').toLowerCase().includes(q)

      );

    }

    return list;

  }, [fabrics, search, typeFilter]);



  const handleAddToCart = () => {

    if (!cartFabric) return;

    const value = Number(requestedLength);

    if (!Number.isFinite(value) || value <= 0) {

      setCartNotice({ kind: 'err', msg: 'Enter a valid length greater than 0.' });

      return;

    }

    if (value > cartFabric.length) {

      setCartNotice({ kind: 'err', msg: `Maximum available: ${cartFabric.length} m` });

      return;

    }

    addToCart(cartFabric, value);

    setCartNotice({ kind: 'ok', msg: `${cartFabric.name} added to cart!` });

    setTimeout(() => { setCartFabric(null); setRequestedLength(''); setCartNotice(null); }, 900);

  };



  // ── Loading skeletons ───────────────────────────────────────────────────────

  if (loading) {

    return (

      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

          <div className="h-9 w-52 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse mb-2" />

          <div className="h-4 w-80 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-10" />

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">

            {Array.from({ length: 8 }).map((_, i) => (

              <div key={i} className="rounded-2xl overflow-hidden bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700">

                <div className="aspect-[4/3] bg-slate-200 dark:bg-slate-700 animate-pulse" />

                <div className="p-5 space-y-3">

                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse w-3/4" />

                  <div className="h-3 bg-slate-100 dark:bg-slate-600 rounded-full animate-pulse w-1/2" />

                  <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse mt-4" />

                </div>

              </div>

            ))}

          </div>

        </div>

      </div>

    );

  }



  // ── Main render ─────────────────────────────────────────────────────────────

  return (

    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-900">



      {/* Hero header */}

      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">

            <div>

              <p className="text-xs font-bold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-1">RK Textiles</p>

              <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">

                Fabric Catalog

              </h1>

              <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">

                {fabrics.length} premium fabric{fabrics.length !== 1 ? 's' : ''} — live from our warehouse

              </p>

            </div>



            {/* Search */}

            <div className="relative w-full sm:w-80">

              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />

              <input

                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 transition"

                placeholder="Search fabric, type, color…"

                value={search}

                onChange={(e) => setSearch(e.target.value)}

              />

            </div>

          </div>



          {/* Type filter pills */}

          <div className="flex flex-wrap gap-2 mt-5 pb-1">

            {allTypes.map((t) => (

              <button

                key={t}

                onClick={() => setTypeFilter(t)}

                className={`px-3.5 py-1 rounded-full text-xs font-semibold transition-all ${

                  typeFilter === t

                    ? 'bg-cyan-600 text-white shadow-sm'

                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'

                }`}

              >

                {t}

              </button>

            ))}

          </div>

        </div>

      </div>



      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">



        {/* Error banner */}

        {error && (

          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl flex items-start gap-3">

            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />

            <div className="flex-1">

              <p className="text-sm font-semibold text-red-800 dark:text-red-300">Failed to load products</p>

              <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{error}</p>

            </div>

            <button onClick={loadFabrics} className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 font-medium">

              <RefreshCw className="w-3.5 h-3.5" /> Retry

            </button>

          </div>

        )}



        {/* Results count */}

        {!error && (

          <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">

            Showing <span className="font-semibold text-slate-700 dark:text-slate-300">{visibleFabrics.length}</span> of {fabrics.length} products

            {typeFilter !== 'All' && <span> — filtered by <span className="font-semibold">{typeFilter}</span></span>}

          </p>

        )}



        {/* Empty state */}

        {visibleFabrics.length === 0 && !error && (

          <div className="text-center py-20">

            <Package className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />

            <p className="text-lg font-semibold text-slate-600 dark:text-slate-300">No fabrics found</p>

            <p className="text-sm text-slate-400 mt-1">Try adjusting your search or filter.</p>

            <button onClick={() => { setSearch(''); setTypeFilter('All'); }} className="mt-4 text-sm text-cyan-600 hover:text-cyan-700 font-medium">

              Clear filters

            </button>

          </div>

        )}



        {/* Product grid */}

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">

          {visibleFabrics.map((fabric) => (

            <article

              key={fabric.id}

              className="group relative rounded-2xl overflow-hidden bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"

            >

              {/* Image section */}

              <div className="relative overflow-hidden aspect-[4/3] bg-slate-100 dark:bg-slate-700">

                {fabric.imageUrl ? (

                  <img

                    src={fabric.imageUrl}

                    alt={fabric.name}

                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"

                    loading="lazy"

                  />

                ) : (

                  <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600">

                    <Package className="w-10 h-10 text-slate-300 dark:text-slate-500" />

                    <span className="text-xs text-slate-400">No image</span>

                  </div>

                )}



                {/* Stock status badge — absolute overlay */}

                <span className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-[11px] font-bold shadow-sm backdrop-blur-sm ${

                  fabric.availability

                    ? 'bg-emerald-500/90 text-white'

                    : 'bg-red-500/90 text-white'

                }`}>

                  {fabric.availability ? '● In Stock' : '○ Out of Stock'}

                </span>



                {/* Gradient overlay for text legibility */}

                <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-black/20 to-transparent" />

              </div>



              {/* Card content */}

              <div className="p-5">

                {/* Type tag */}

                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-700 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/30 px-2.5 py-0.5 rounded-full mb-2">

                  <Tag className="w-2.5 h-2.5" /> {fabric.type}

                </span>



                {/* Name */}

                <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-snug line-clamp-2 min-h-[2.5rem]">

                  {fabric.name}

                </h2>



                {/* Color row */}

                {fabric.color && (

                  <div className="flex items-center gap-1.5 mt-2">

                    <span

                      className="w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm flex-shrink-0"

                      style={{ backgroundColor: colorToCss(fabric.color) }}

                    />

                    <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{fabric.color}</span>

                  </div>

                )}



                {/* Mill */}

                {fabric.millName && (

                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5 truncate">

                    Mill: {fabric.millName}

                  </p>

                )}



                {/* Divider */}

                <div className="border-t border-slate-100 dark:border-slate-700 my-3" />



                {/* Price + Length row */}

                <div className="flex items-end justify-between">

                  <div>

                    <p className="text-xl font-extrabold text-slate-900 dark:text-white leading-none">

                      ₹{fabric.price}

                    </p>

                    <p className="text-[11px] text-slate-400 mt-0.5">per meter</p>

                  </div>

                  <div className="text-right">

                    <div className="flex items-center gap-1 justify-end">

                      <Ruler className="w-3 h-3 text-slate-400" />

                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{fabric.length} m</p>

                    </div>

                    <p className="text-[11px] text-slate-400">in stock</p>

                  </div>

                </div>



                {/* Action buttons */}

                <div className="grid grid-cols-2 gap-2 mt-4">

                  <button

                    onClick={() => { setCartFabric(fabric); setRequestedLength(''); setCartNotice(null); }}

                    disabled={!fabric.availability}

                    className="flex items-center justify-center gap-1.5 bg-cyan-600 hover:bg-cyan-700 active:scale-95 disabled:bg-slate-100 dark:disabled:bg-slate-700 disabled:text-slate-400 dark:disabled:text-slate-500 disabled:cursor-not-allowed text-white text-xs font-semibold py-2.5 rounded-xl transition-all duration-200"

                  >

                    <ShoppingCart className="w-3.5 h-3.5" />

                    Add to Cart

                  </button>

                  <button

                    onClick={() => setSelectedFabric(fabric)}

                    className="flex items-center justify-center gap-1.5 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 text-xs font-semibold py-2.5 rounded-xl transition-all duration-200"

                  >

                    <Eye className="w-3.5 h-3.5" />

                    Details

                  </button>

                </div>

              </div>

            </article>

          ))}

        </div>

      </div>



      {/* ── Detail modal ─────────────────────────────────────────────────────── */}

      {selectedFabric && (

        <div

          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"

          onClick={(e) => { if (e.target === e.currentTarget) setSelectedFabric(null); }}

        >

          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">

            {/* Image */}

            <div className="relative aspect-video overflow-hidden bg-slate-100 dark:bg-slate-700">

              {selectedFabric.imageUrl ? (

                <img src={selectedFabric.imageUrl} alt={selectedFabric.name} className="w-full h-full object-cover" />

              ) : (

                <div className="w-full h-full flex items-center justify-center">

                  <Package className="w-16 h-16 text-slate-300" />

                </div>

              )}

              <button

                onClick={() => setSelectedFabric(null)}

                className="absolute top-3 right-3 p-2 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm hover:bg-white shadow-sm transition"

              >

                <X className="w-4 h-4 text-slate-600 dark:text-slate-300" />

              </button>

              <span className={`absolute bottom-3 left-3 px-2.5 py-1 rounded-full text-xs font-bold shadow-sm ${

                selectedFabric.availability ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'

              }`}>

                {selectedFabric.availability ? '● In Stock' : '○ Out of Stock'}

              </span>

            </div>



            {/* Body */}

            <div className="p-6">

              <span className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-700 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/30 px-2.5 py-0.5 rounded-full mb-2">

                <Tag className="w-3 h-3" /> {selectedFabric.type}

              </span>

              <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-1">{selectedFabric.name}</h3>



              {/* Color + Mill */}

              <div className="flex flex-wrap gap-4 mt-3 text-sm text-slate-500 dark:text-slate-400">

                {selectedFabric.color && (

                  <div className="flex items-center gap-1.5">

                    <span className="w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: colorToCss(selectedFabric.color) }} />

                    {selectedFabric.color}

                  </div>

                )}

                {selectedFabric.millName && <span>Mill: {selectedFabric.millName}</span>}

              </div>



              {/* Description */}

              {selectedFabric.description && (

                <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{selectedFabric.description}</p>

              )}



              {/* Price + Length grid */}

              <div className="grid grid-cols-2 gap-3 mt-4">

                <div className="bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-100 dark:border-cyan-800 rounded-xl p-3.5">

                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Price per meter</p>

                  <p className="text-2xl font-extrabold text-cyan-700 dark:text-cyan-400">₹{selectedFabric.price}</p>

                </div>

                <div className="bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-xl p-3.5">

                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Available length</p>

                  <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{selectedFabric.length} m</p>

                </div>

              </div>



              {/* CTA buttons */}

              <div className="flex gap-3 mt-5">

                <button

                  onClick={() => { setSelectedFabric(null); setCartFabric(selectedFabric); setRequestedLength(''); setCartNotice(null); }}

                  disabled={!selectedFabric.availability}

                  className="flex-1 flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-100 dark:disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all"

                >

                  <ShoppingCart className="w-4 h-4" /> Add to Cart

                </button>

                <button

                  onClick={() => setSelectedFabric(null)}

                  className="px-5 py-3 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl font-medium transition-all text-sm"

                >

                  Close

                </button>

              </div>

            </div>

          </div>

        </div>

      )}



      {/* ── Add-to-Cart modal ─────────────────────────────────────────────────── */}

      {cartFabric && (

        <div

          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"

          onClick={(e) => { if (e.target === e.currentTarget) { setCartFabric(null); } }}

        >

          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden">

            {/* Mini image header */}

            {cartFabric.imageUrl && (

              <div className="h-28 overflow-hidden">

                <img src={cartFabric.imageUrl} alt={cartFabric.name} className="w-full h-full object-cover" />

              </div>

            )}

            <div className="p-6">

              <div className="flex items-start justify-between mb-4">

                <div>

                  <h3 className="font-bold text-slate-900 dark:text-white">{cartFabric.name}</h3>

                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{cartFabric.type}{cartFabric.color ? ` · ${cartFabric.color}` : ''}</p>

                </div>

                <button onClick={() => setCartFabric(null)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition">

                  <X className="w-4 h-4 text-slate-500" />

                </button>

              </div>



              <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-3 flex justify-between text-sm mb-5">

                <span className="text-slate-500 dark:text-slate-400">Price per meter</span>

                <span className="font-bold text-cyan-700 dark:text-cyan-400">₹{cartFabric.price}</span>

              </div>



              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wide">

                Required Length (meters)

              </label>

              <input

                type="number"

                step="0.5"

                min="0.5"

                max={cartFabric.length}

                value={requestedLength}

                onChange={(e) => { setRequestedLength(e.target.value); setCartNotice(null); }}

                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 transition"

                placeholder={`Enter length (max ${cartFabric.length} m)`}

              />



              {requestedLength && Number(requestedLength) > 0 && (

                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">

                  Estimated total: <span className="font-bold text-slate-900 dark:text-white">₹{(Number(requestedLength) * cartFabric.price).toFixed(2)}</span>

                </p>

              )}



              {cartNotice && (

                <p className={`text-sm mt-2 font-medium ${cartNotice.kind === 'ok' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>

                  {cartNotice.msg}

                </p>

              )}



              <div className="flex gap-3 mt-5">

                <button className="flex-1 py-3 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl font-medium text-sm transition" onClick={() => setCartFabric(null)}>

                  Cancel

                </button>

                <button className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl font-semibold text-sm transition flex items-center justify-center gap-2" onClick={handleAddToCart}>

                  <ShoppingCart className="w-4 h-4" /> Add to Cart

                </button>

              </div>



              <button onClick={() => onNavigate('cart')} className="w-full mt-3 text-xs text-center text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 font-medium">

                View Cart →

              </button>

            </div>

          </div>

        </div>

      )}

    </div>

  );

}

