let drawerOpenSuppressedUntil = 0;

export const suppressDrawerOpen = (durationMs = 700) => {
  drawerOpenSuppressedUntil = Date.now() + durationMs;
};

export const isDrawerOpenSuppressed = () => Date.now() < drawerOpenSuppressedUntil;
