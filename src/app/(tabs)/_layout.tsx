import { NativeTabs } from "expo-router/native-tabs";
import { colors } from "@/constants/theme";

export default function TabLayout() {
  return (
    <NativeTabs
      backgroundColor={colors.white}
      indicatorColor={colors.muted}
      labelStyle={{ selected: { color: colors.navy } }}
      iconColor={colors.steel}
      tintColor={colors.navy}
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "house", selected: "house.fill" }} md="home" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="categories">
        <NativeTabs.Trigger.Label>Categories</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="square.grid.2x2" md="grid_view" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="products">
        <NativeTabs.Trigger.Label>Products</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="shippingbox" md="inventory_2" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="catalogues">
        <NativeTabs.Trigger.Label>Catalogues</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="book" md="menu_book" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="account">
        <NativeTabs.Trigger.Label>Account</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "person", selected: "person.fill" }} md="person" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
