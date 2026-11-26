import { FileText } from 'lucide-react';
import { cn, Button } from '@ury/ui';
import { getOrderStatusTypes, OrderStatusType } from '../data/order-types';
import { usePOSStore } from '../store/pos-store';
import { t } from '../i18n';

interface OrderStatusSidebarProps {
  disabled?: boolean;
  selectedStatus: OrderStatusType;
  setSelectedStatus: (status: OrderStatusType) => void;
  getStatusCount?: (status: OrderStatusType) => number;
}

const OrderStatusSidebar = ({
  disabled,
  selectedStatus,
  setSelectedStatus,
}: OrderStatusSidebarProps) => {
  const { posProfile } = usePOSStore();
  const statusTypes = getOrderStatusTypes(posProfile?.view_all_status, posProfile?.paid_limit);

  return (
    <aside
      className={cn(
        'hidden md:flex md:w-56 lg:w-64 shrink-0 bg-white border-e border-gray-200 h-full flex-col',
        disabled && 'opacity-50 pointer-events-none'
      )}
    >
      <nav className="flex-1 p-3 lg:p-4 overflow-y-auto" aria-label={t('orders.status_title')}>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-2.5">
          <h2 className="text-xs font-semibold text-gray-600 mb-2 px-2">
            {t('orders.status_title')}
          </h2>

          <div className="space-y-1">
            {statusTypes.map((status) => {
              const isActive = selectedStatus === status.value;
              return (
                <Button
                  key={status.value}
                  type="button"
                  onClick={() => setSelectedStatus(status.value as OrderStatusType)}
                  variant="ghost"
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'w-full flex items-center justify-start px-2.5 py-2.5 text-sm font-medium transition-colors duration-150 group relative text-start',
                    isActive
                      ? 'bg-white text-gray-950 shadow-sm font-semibold'
                      : 'text-gray-700 hover:bg-white/70 hover:text-gray-900'
                  )}
                  disabled={disabled}
                >
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute start-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-blue-600 rounded-e-full"
                    />
                  )}
                  <span className="flex items-center gap-2.5 ms-1 min-w-0 truncate">
                    <FileText
                      className={cn(
                        'w-4 h-4 shrink-0',
                        isActive ? 'text-blue-600' : 'text-gray-500'
                      )}
                      aria-hidden="true"
                    />
                    <span className="truncate">
                      {t(`order_status_types.${status.value.toLowerCase().replace(/ /g, '_')}`)}
                    </span>
                  </span>
                </Button>
              );
            })}
          </div>
        </div>
      </nav>
    </aside>
  );
};

export default OrderStatusSidebar;
