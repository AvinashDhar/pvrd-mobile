import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fonts, radius } from "@/constants/theme";
import type { ProductVariant } from "@/lib/api";
import { formatINR } from "@/lib/money";

type GroupBy = "finish" | "size" | "none";

type Row = ProductVariant & {
  key: string;
  rowLabel: string;
  detail: string;
};

type Group = { label: string; items: Row[] };

function clean(value: string | null | undefined) {
  const text = value?.trim();
  return text ? text : null;
}

function unique(values: (string | null)[]) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (!value || seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }
  return result;
}

function rowLabel(variant: ProductVariant, groupBy: GroupBy) {
  if (groupBy === "finish") return clean(variant.size) ?? variant.name;
  if (groupBy === "size") return clean(variant.finish) ?? variant.name;
  return clean(variant.size) ?? clean(variant.finish) ?? variant.name;
}

function rowDetail(variant: ProductVariant, groupBy: GroupBy) {
  const parts: string[] = [];
  if (groupBy === "none") {
    const size = clean(variant.size);
    const finish = clean(variant.finish);
    if (size && finish) parts.push(finish);
  }
  const packing = clean(variant.packing);
  if (packing) parts.push(packing);
  const points = Number(variant.points);
  if (Number.isFinite(points) && points > 0) parts.push(`${points} pts`);
  return parts.join(" · ");
}

function variantKey(variant: ProductVariant) {
  return `${variant.name}|${variant.size ?? ""}|${variant.finish ?? ""}`;
}

function buildModel(variants: ProductVariant[]) {
  const finishes = unique(variants.map((variant) => clean(variant.finish)));
  const sizes = unique(variants.map((variant) => clean(variant.size)));
  const groupBy: GroupBy =
    finishes.length > 1 && finishes.length <= Math.max(sizes.length, 1) ? "finish" : sizes.length > 1 && finishes.length > 1 ? "size" : "none";

  const source = groupBy === "none" ? [{ label: "Options", items: variants }] : (groupBy === "finish" ? finishes : sizes).map((label) => ({
    label,
    items: variants.filter((variant) => clean(variant[groupBy]) === label),
  }));

  const groups: Group[] = source.map((group) => ({
    label: group.label,
    items: group.items.map((variant) => ({
      ...variant,
      key: variantKey(variant),
      rowLabel: rowLabel(variant, groupBy),
      detail: rowDetail(variant, groupBy),
    })),
  }));

  return {
    groupBy,
    groups,
    signature: variants.map((variant) => `${variantKey(variant)}|${variant.mrp}`).join("~"),
    initialKey: groups[0]?.items[0]?.key ?? "",
  };
}

export function numericAmount(value: string | number | null | undefined) {
  if (value == null || value === "") return null;
  const amount = typeof value === "number" ? value : Number(value);
  return Number.isFinite(amount) ? amount : null;
}

export function useVariantSelection(variants: ProductVariant[]) {
  const model = useMemo(() => buildModel(variants), [variants]);
  const [groupLabel, setGroupLabel] = useState(model.groups[0]?.label ?? "");
  const [selectedKey, setSelectedKey] = useState(model.initialKey);
  const [seen, setSeen] = useState(model.signature);

  if (seen !== model.signature) {
    setSeen(model.signature);
    setGroupLabel(model.groups[0]?.label ?? "");
    setSelectedKey(model.initialKey);
  }

  const active = model.groups.find((group) => group.label === groupLabel) ?? model.groups[0] ?? null;
  const selected = active?.items.find((item) => item.key === selectedKey) ?? active?.items[0] ?? null;

  function chooseGroup(label: string) {
    const group = model.groups.find((item) => item.label === label);
    if (!group) return;
    const kept = group.items.find((item) => item.rowLabel === selected?.rowLabel);
    setGroupLabel(group.label);
    setSelectedKey((kept ?? group.items[0]).key);
  }

  return {
    model,
    active,
    selected,
    chooseGroup,
    chooseItem: setSelectedKey,
  };
}

function priceOf(variant: ProductVariant) {
  const mrp = numericAmount(variant.mrp);
  const trade = numericAmount(variant.price);
  const different = trade != null && mrp != null && trade !== mrp;
  const unit = clean(variant.unit);
  if (different && mrp != null) {
    return { amount: trade, caption: "Trade", aside: `MRP ${formatINR(mrp)}` };
  }
  const kind = trade != null ? "Trade" : "MRP";
  return { amount: mrp ?? trade, caption: unit ? `${kind} / ${unit}` : kind, aside: null as string | null };
}

export function ProductVariantPicker({ selection }: { selection: ReturnType<typeof useVariantSelection> }) {
  const { model, active, selected, chooseGroup, chooseItem } = selection;
  if (!active || model.groups.every((group) => group.items.length === 0)) return null;

  const chipTitle = model.groupBy === "finish" ? "Finish" : "Size";
  const listTitle = model.groupBy === "finish" ? "Size" : model.groupBy === "size" ? "Finish" : "Options";
  const optionCount = model.groups.reduce((sum, group) => sum + group.items.length, 0);

  return (
    <View style={styles.wrap}>
      <View style={styles.headingRow}>
        <Text style={styles.heading}>{model.groupBy === "none" ? listTitle : chipTitle}</Text>
        <Text style={styles.count}>{optionCount} options</Text>
      </View>

      {model.groupBy !== "none" ? (
        <View style={styles.chips} accessibilityRole="radiogroup">
          {model.groups.map((group) => {
            const pressed = group.label === active.label;
            return (
              <Pressable
                key={group.label}
                onPress={() => chooseGroup(group.label)}
                accessibilityRole="radio"
                accessibilityState={{ selected: pressed }}
                accessibilityLabel={`${chipTitle} ${group.label}`}
                style={[styles.chip, pressed ? styles.chipOn : styles.chipOff]}
              >
                <Text style={[styles.chipText, pressed && styles.chipTextOn]}>{group.label}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {model.groupBy !== "none" ? <Text style={styles.listHeading}>{listTitle}</Text> : null}

      <View style={styles.list}>
        {active.items.map((variant) => {
          const pressed = variant.key === selected?.key;
          const price = priceOf(variant);
          return (
            <Pressable
              key={variant.key}
              onPress={() => chooseItem(variant.key)}
              accessibilityRole="radio"
              accessibilityState={{ selected: pressed }}
              accessibilityLabel={`${variant.rowLabel}, ${price.amount == null ? "price unavailable" : formatINR(price.amount)}`}
              style={[styles.row, pressed ? styles.rowOn : styles.rowOff]}
            >
              <View style={[styles.radio, pressed && styles.radioOn]}>{pressed ? <View style={styles.radioDot} /> : null}</View>
              <View style={styles.rowCopy}>
                <Text style={styles.rowLabel}>{variant.rowLabel}</Text>
                {variant.detail ? <Text style={styles.rowDetail}>{variant.detail}</Text> : null}
              </View>
              <View style={styles.priceCol}>
                <Text style={styles.price}>{price.amount == null ? "—" : formatINR(price.amount)}</Text>
                <Text style={styles.priceCaption}>{price.caption}</Text>
                {price.aside ? <Text style={styles.priceAside}>{price.aside}</Text> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  headingRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  heading: { color: colors.navy, fontFamily: fonts.semibold, fontSize: 16 },
  count: { color: colors.steel, fontFamily: fonts.regular, fontSize: 13 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { minHeight: 40, borderRadius: 999, paddingHorizontal: 14, alignItems: "center", justifyContent: "center" },
  chipOn: { backgroundColor: colors.navy },
  chipOff: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  chipText: { color: colors.navy, fontFamily: fonts.medium, fontSize: 14 },
  chipTextOn: { color: colors.white },
  listHeading: { marginTop: 4, color: colors.navy, fontFamily: fonts.semibold, fontSize: 16 },
  list: { gap: 8 },
  row: {
    minHeight: 64,
    borderRadius: radius,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rowOn: { backgroundColor: "#E8F1F8", borderWidth: 1.5, borderColor: colors.navy },
  rowOff: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  radioOn: { borderColor: colors.navy, backgroundColor: colors.navy },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.white },
  rowCopy: { flex: 1, minWidth: 0 },
  rowLabel: { color: colors.navy, fontFamily: fonts.semibold, fontSize: 16 },
  rowDetail: { marginTop: 2, color: colors.steel, fontFamily: fonts.regular, fontSize: 13 },
  priceCol: { alignItems: "flex-end", flexShrink: 0 },
  price: { color: colors.navy, fontFamily: fonts.semibold, fontSize: 16 },
  priceCaption: { marginTop: 2, color: colors.steel, fontFamily: fonts.medium, fontSize: 11 },
  priceAside: { marginTop: 1, color: colors.steel, fontFamily: fonts.regular, fontSize: 11 },
});
