import { Badge } from "@/components/ui/badge";
import { toNumber } from "@/lib/utils";

export function StockBadge({ stock, lowStockThreshold = 100 }: { stock: number | string; lowStockThreshold?: number }) {
  const stockValue = toNumber(stock);
  if (stockValue <= lowStockThreshold) {
    return <Badge className="bg-red-100 text-red-700 ring-red-200">Low ({stockValue.toFixed(2)})</Badge>;
  }

  if (stockValue <= lowStockThreshold * 2) {
    return <Badge className="bg-amber-100 text-amber-700 ring-amber-200">Watch ({stockValue.toFixed(2)})</Badge>;
  }

  return <Badge className="bg-emerald-100 text-emerald-700 ring-emerald-200">Healthy ({stockValue.toFixed(2)})</Badge>;
}
