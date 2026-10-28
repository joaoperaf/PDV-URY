import React from 'react';
import { useConfigure } from '../../../context/ConfigureContext';
import { Input } from '@ury/ui';
import { Switch } from '../../ui/switch';

export function BranchSection() {
  const { branch, updateBranch } = useConfigure();

  return (
    <div className="space-y-5 w-full">
      {/* Row 1: Branch Name + Tax ID */}
      <div className="grid grid-cols-1 w-full gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            Nome da Filial <span className="text-red-500">*</span>
          </label>
          <Input
            type="text"
            value={branch.branchName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              updateBranch({ branchName: e.target.value })
            }
            placeholder="Filial Principal"
            className="w-full focus-visible:ring-primary"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">CNPJ / CPF</label>
          <Input
            type="text"
            value={branch.taxId}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              updateBranch({ taxId: e.target.value })
            }
            placeholder="Opcional"
            className="w-full focus-visible:ring-primary"
          />
          <p className="text-xs text-muted-foreground">
            Opcional, você pode preencher agora ou depois.
          </p>
        </div>
      </div>

      {/* Row 2: Invoice Prefix + Delivery apps Switch */}
      <div className="grid grid-cols-1 w-full gap-4 items-start">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            Prefixo de Fatura <span className="text-red-500">*</span>
          </label>
          <Input
            type="text"
            value={branch.invoicePrefix}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              updateBranch({ invoicePrefix: e.target.value })
            }
            placeholder="FAT-"
            className="w-full focus-visible:ring-primary"
          />
          <p className="text-xs text-muted-foreground">
            Exibido no início de cada número de conta, como FAT-0001.
          </p>
        </div>

        <div className="space-y-2 pt-1">
          <div className="flex items-center gap-3">
            <Switch
              id="takes-aggregator"
              checked={branch.takesAggregatorOrders}
              onCheckedChange={(checked: boolean) =>
                updateBranch({ takesAggregatorOrders: checked })
              }
            />
            <label
              htmlFor="takes-aggregator"
              className="text-sm font-medium text-foreground cursor-pointer leading-snug"
            >
              Recebe pedidos por aplicativos de delivery (iFood, etc.)
            </label>
          </div>
        </div>
      </div>

      {/* Row 3: Aggregator Prefix (conditional, only when switch is ON) */}
      {branch.takesAggregatorOrders && (
        <div className="space-y-1.5 w-full">
          <label className="text-sm font-medium text-foreground">
            Prefixo de Aplicativos de Delivery
          </label>
          <Input
            type="text"
            value={branch.aggregatorPrefix}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              updateBranch({ aggregatorPrefix: e.target.value })
            }
            placeholder="APP-"
            className="w-full focus-visible:ring-primary"
          />
          <p className="text-xs text-muted-foreground">
            Uma série de numeração separada para pedidos vindos de apps de delivery.
          </p>
        </div>
      )}
    </div>
  );
}
