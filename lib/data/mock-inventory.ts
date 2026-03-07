import type { InventorySnapshot } from "@/types";
import { format, subDays } from "date-fns";

const productIds = ["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8", "p9", "p10"];

const snapshots: InventorySnapshot[] = [];
let id = 1;
const today = format(new Date(), "yyyy-MM-dd");

// One snapshot per product for "today" (current stock)
const quantities: Record<string, number> = {
  p1: 420,
  p2: 180,
  p3: 95,
  p4: 220,
  p5: 0,
  p6: 310,
  p7: 85,
  p8: 450,
  p9: 0,
  p10: 72,
};

const assetValues: Record<string, number> = {
  p1: 4200,
  p2: 8450,
  p3: 1900,
  p4: 2640,
  p5: 0,
  p6: 1550,
  p7: 850,
  p8: 2250,
  p9: 0,
  p10: 2160,
};

productIds.forEach((productId) => {
  snapshots.push({
    id: `inv-snap-${id++}`,
    productId,
    snapshotDate: today,
    quantityOnHand: quantities[productId] ?? 0,
    assetValue: assetValues[productId] ?? 0,
  });
});

export const inventorySnapshots = snapshots;
