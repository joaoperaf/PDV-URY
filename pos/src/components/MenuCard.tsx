import { FC } from 'react';
import { Button, cn } from '@ury/ui';
import { formatCurrency } from '@ury/core';
import { SlidersHorizontal } from 'lucide-react';
import { t } from '../i18n';

interface MenuCardProps {
  id: string;
  name: string;
  price: number;
  item_image: string | null;
  course?: string;
  item: string;
  quantityInCart?: number;
  onAdd?: () => void;
  onOpenOptions?: () => void;
  disabled?: boolean;
}

const MenuCard: FC<MenuCardProps> = ({ 
  name, 
  price, 
  item_image, 
  course, 
  quantityInCart = 0,
  onAdd,
  onOpenOptions,
  disabled 
}) => {
  return (
    <article
      className={cn(
        "relative bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow h-56 flex flex-col",
        disabled && "opacity-50"
      )}
    >
      <Button
        type="button"
        variant="ghost"
        onClick={disabled ? undefined : onAdd}
        disabled={disabled}
        className="flex min-h-0 flex-1 flex-col text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
        aria-label={`${t('menu.add_item')}: ${name}`}
      >
      {quantityInCart > 0 && (
        <span className="absolute start-2 top-2 z-10 inline-flex min-h-8 min-w-8 items-center justify-center rounded-full bg-primary px-2 text-sm font-bold text-primary-foreground shadow-sm">
          {quantityInCart}
          <span className="sr-only"> {t('menu.in_cart')}</span>
        </span>
      )}

      {/* Image section - fixed height */}
      <div className="h-24">
        {item_image ? (
          <img
            src={item_image}
            alt={name}
            className="w-full h-full object-cover filter saturate-75 brightness-95"
            style={{ filter: 'saturate(0.7) brightness(0.95)' }}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const parent = target.parentElement;
              if (parent) {
                const placeholder = document.createElement('div');
                placeholder.className = 'w-full h-full bg-gray-200 flex items-center justify-center text-2xl text-gray-400 font-medium';
                placeholder.textContent = name.slice(0, 2).toUpperCase();
                parent.insertBefore(placeholder, target);
              }
            }}
          />
        ) : (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center text-2xl text-gray-400 font-medium">
            {name.slice(0, 2).toUpperCase()}
          </div>
        )}
      </div>

      {/* Content section - flex grow with fixed padding */}
      <div className="flex-1 p-3 flex flex-col">
        {/* Name section - fixed height for 2 lines */}
        <div className="">
          <h3 className="font-medium text-gray-900 text-sm leading-5 line-clamp-2" title={name}>
            {name}
          </h3>
        </div>

        {/* Course section - fixed height for 1 line */}
        <div className="h-5 mt-1">
          <p className="text-xs text-gray-500 truncate" title={course}>
            {course || ' '}
          </p>
        </div>

        {/* Price section - pushed to bottom */}
        <div className="mt-auto pt-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-gray-900 tabular-nums">
              {formatCurrency(price)}
            </span>
            <span className="text-xs font-medium text-primary-600">
              {t('menu.add_item')}
            </span>
          </div>
        </div>
      </div>
      </Button>

      <Button
        type="button"
        variant="outline"
        onClick={disabled ? undefined : onOpenOptions}
        disabled={disabled}
        className="absolute end-2 top-2 inline-flex min-h-8 min-w-8 items-center justify-center gap-1 rounded-md bg-white/95 px-2 text-xs font-medium text-gray-700 shadow-sm ring-1 ring-gray-200 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        aria-label={`${t('menu.open_options')}: ${name}`}
        title={t('menu.open_options')}
      >
        <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="sr-only sm:not-sr-only">{t('menu.options')}</span>
      </Button>
    </article>
  );
};

export default MenuCard; 