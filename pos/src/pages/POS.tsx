import { useState } from 'react';
import { t } from '../i18n';
import { Star, TrendingUp } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import OrderPanel from '../components/OrderPanel';
import ProductDialog from '../components/ProductDialog';
import MenuList from '../components/MenuList';
import { MenuItem, usePOSStore } from '../store/pos-store';
import { cn } from '@ury/ui';
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
  } = usePOSStore();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleAddItem = (item: MenuItem) => {
    if (isMenuInteractionDisabled()) return;
    addToOrder({ ...item, quantity: 1 });
  };

  const handleOpenItemOptions = (item: MenuItem) => {
    if (isMenuInteractionDisabled()) return;
    setSelectedItem(item);
    setIsDialogOpen(true);
  };

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
      <div className="flex-1 flex flex-col h-full overflow-hidden pe-96">
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
      <OrderPanel />
      {isDialogOpen && <ProductDialog onClose={() => setIsDialogOpen(false)} />}
    </div>
  );
}
