import { useRef, useState } from 'react';
import { t } from '../i18n';
import { Star, TrendingUp, ShoppingCart } from 'lucide-react';
import { formatCurrency, flt } from '@ury/core';
import Sidebar from '../components/Sidebar';
import OrderPanel from '../components/OrderPanel';
import ProductDialog from '../components/ProductDialog';
import MenuList from '../components/MenuList';
import { MenuItem, usePOSStore } from '../store/pos-store';
import { cn, Button } from '@ury/ui';
import { Spinner, StateMessage } from '@ury/ui';
import InitialLoader from '../components/InitialLoader';

export default function POS() {
  const {
    quickFilter,
    setQuickFilter,
    setSelectedItem,
    addToOrder,
    loading,
    error,
    isMenuInteractionDisabled,
    isInitializing,
    activeOrders,
  } = usePOSStore();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const cartTriggerRef = useRef<HTMLButtonElement>(null);

  const closeCart = () => {
    setIsCartOpen(false);
    // Devolve o foco ao botão que abriu o painel
    requestAnimationFrame(() => cartTriggerRef.current?.focus());
  };

  const handleAddItem = (item: MenuItem) => {
    if (isMenuInteractionDisabled()) return;
    addToOrder({ ...item, quantity: 1 });
  };

  const handleOpenItemOptions = (item: MenuItem) => {
    if (isMenuInteractionDisabled()) return;
    setSelectedItem(item);
    setIsDialogOpen(true);
  };

  const cartCount = activeOrders.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = flt(
    activeOrders.reduce((sum, item) => {
      const base = item.selectedVariant?.price || item.price;
      const addons = item.selectedAddons?.reduce((a, ad) => a + ad.price, 0) || 0;
      return sum + (base + addons) * item.quantity;
    }, 0),
    2
  );

  const QuickFilterButton = ({ filter, icon: Icon, label }: { 
    filter: 'all' | 'special';
    icon: React.ElementType;
    label: string;
  }) => (
    <button
      onClick={() => setQuickFilter(filter)}
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
        quickFilter === filter
          ? 'bg-blue-100 text-blue-700'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
        isMenuInteractionDisabled() && 'opacity-50 cursor-not-allowed pointer-events-none'
      )}
      disabled={isMenuInteractionDisabled()}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );

  if (isInitializing) {
    return <InitialLoader />;
  }

  if (error) {
    return (
      <StateMessage
        variant="error"
        title={t('common.error_loading_pos')}
        description={error}
        actionLabel={t('common.retry')}
        onAction={() => window.location.reload()}
        className="h-screen"
      />
    );
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Spinner message={t('common.loading_menu_items')} />
      </div>
    );
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      <Sidebar disabled={isMenuInteractionDisabled()} />
      <div className="flex-1 flex flex-col h-full overflow-hidden pb-20 lg:pb-0 lg:pe-96">
        <div className="p-4 bg-white border-b border-gray-200">
          <div className="max-w-screen-xl mx-auto space-y-3">
            <div className="flex items-center gap-2 overflow-x-auto overflow-y-hidden">
              {/* <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                onVisibilityChange={setShowSearch}
                isVisible={showSearch}
                disabled={isMenuInteractionDisabled()}
              /> */}
              
              <QuickFilterButton filter="all" icon={Star} label={t('common.all')} />
              <QuickFilterButton filter="special" icon={TrendingUp} label={t('menu.special_items')} />
            </div>
          </div>
        </div>

        <MenuList onAddItem={handleAddItem} onOpenItemOptions={handleOpenItemOptions} />
      </div>
      {/* Barra de resumo (tablet/mobile): mantém total e acesso ao pedido sempre alcançáveis */}
      <div className="fixed inset-x-0 bottom-0 z-10 flex items-center justify-between gap-3 border-t border-gray-200 bg-white p-3 lg:hidden">
        <div className="min-w-0">
          <div className="text-xs text-gray-500">
            {cartCount} {t('cart.items')}
          </div>
          <div className="text-lg font-bold tabular-nums text-gray-950">{formatCurrency(cartTotal)}</div>
        </div>
        <Button
          ref={cartTriggerRef}
          type="button"
          size="lg"
          onClick={() => setIsCartOpen(true)}
          aria-expanded={isCartOpen}
          className="gap-2 font-semibold"
        >
          <ShoppingCart className="h-4 w-4" />
          {t('cart.order_summary')}
        </Button>
      </div>
      <OrderPanel isOpen={isCartOpen} onClose={closeCart} />
      {isDialogOpen && <ProductDialog onClose={() => setIsDialogOpen(false)} />}
    </div>
  );
}
