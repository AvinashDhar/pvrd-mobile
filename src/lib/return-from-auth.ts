import { router, useNavigation } from "expo-router";

function isAuthRoute(name: string | undefined) {
  return name === "login" || name === "signup";
}

export function useReturnFromAuth() {
  const navigation = useNavigation();

  return function returnFromAuth() {
    const state = navigation.getState();
    const routes = state?.routes ?? [];
    let index = state?.index ?? routes.length - 1;
    let count = 0;
    while (index >= 0 && isAuthRoute(routes[index]?.name)) {
      count += 1;
      index -= 1;
    }

    if (count > 0 && router.canGoBack()) {
      router.dismiss(count);
      return;
    }

    router.replace("/(tabs)/account");
  };
}
