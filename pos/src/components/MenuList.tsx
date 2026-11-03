import { useEffect, useMemo } from 'react';
import { MenuItem, usePOSStore } from '../store/pos-store';
import MenuCard from './MenuCard';
import { Spinner, StateMessage } from '@ury/ui';
import { cn } from '@ury/ui';
import { t } from '../i18n';

interface MenuListProps {
  onAddItem: (item: MenuItem) => void;
  onOpenItemOptions: (item: MenuItem) => void;
}

const MenuList: React.FC<MenuListProps> = ({ onAddItem, onOpenItemOptions }) => {
  const {
    menuItems,
    menuLoading,
    error,
    selectedCategory,
    searchQuery,
    quickFilter,
    fetchMenuItems,
    isMenuInteractionDisabled,
    isOrderInteractionDisabled,
    getItemQuantityFromCart
  } = usePOSStore();

  useEffect(() => {
    fetchMenuItems();
  }, [fetchMenuItems]);

  const filteredItems = useMemo(() => {
    return menuItems.filter(item => {
      const searchTerm = searchQuery.toLowerCase();
      const matchesCategory = !selectedCategory || item.course === selectedCategory;
      const matchesSearch = !searchQuery || 
        item.name.toLowerCase().includes(searchTerm) ||
        item.item.toLowerCase().includes(searchTerm);
      const matchesFilter = quickFilter === 'all' || 
        (quickFilter === 'special' && item.special_dish === 1);
      
      return matchesCategory && matchesSearch && matchesFilter;
    });
  }, [menuItems, selectedCategory, searchQuery, quickFilter]);

  const isInteractionDisabled = isMenuInteractionDisabled() || isOrderInteractionDisabled();

  return (
    <div className="flex-1 overflow-auto bg-gray-50">
      <div className="max-w-screen-xl mx-auto p-4 pb-40">
        {menuLoading ? (
          <div className="h-96">
            <Spinner message={t('common.loading_menu_items')} />
          </div>
        ) : error ? (
          <StateMessage
            variant="error"
            title={t('common.error_loading_menu_items')}
            description={error}
            actionLabel={t('common.retry')}
            onAction={() => fetchMenuItems()}
            className="h-96"
          />
        ) : filteredItems.length === 0 ? (
          <StateMessage
            variant="empty"
            title={t('common.no_items_found')}
            description={t('common.try_adjusting_filters')}
            className="h-96"
          />
        ) : (
          <div className={cn(
            "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3",
            isInteractionDisabled && "opacity-50 pointer-events-none"
          )}>
            {filteredItems.map((item) => (
              <MenuCard
                key={item.id}
                id={item.id}
                name={item.name}
                price={item.price}
                item_image={item.image}
                course={item.course_label || item.course}
                item={item.item}
                quantityInCart={getItemQuantityFromCart(item)}
                onAdd={() => onAddItem(item)}
                onOpenOptions={() => onOpenItemOptions(item)}
                disabled={isInteractionDisabled}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MenuList; 