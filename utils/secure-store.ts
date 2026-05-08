type SecureStoreModule = {
  getItemAsync: (key: string) => Promise<string | null>;
  setItemAsync: (key: string, value: string) => Promise<void>;
  deleteItemAsync: (key: string) => Promise<void>;
};

const memoryStore = new Map<string, string>();

function createFallbackStore(): SecureStoreModule {
  return {
    async getItemAsync(key) {
      return memoryStore.get(key) ?? null;
    },
    async setItemAsync(key, value) {
      memoryStore.set(key, value);
    },
    async deleteItemAsync(key) {
      memoryStore.delete(key);
    },
  };
}

function resolveSecureStore(): SecureStoreModule {
  const runtimeRequire = globalThis.require as ((name: string) => unknown) | undefined;
  if (!runtimeRequire) {
    return createFallbackStore();
  }

  try {
    return runtimeRequire('expo-secure-store') as SecureStoreModule;
  } catch {
    return createFallbackStore();
  }
}

export const secureStore = resolveSecureStore();
