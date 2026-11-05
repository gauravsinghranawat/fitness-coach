// On Android and iOS, persist the Supabase session with expo-sqlite's localStorage,
// as recommended in Expo's Supabase guide.
import 'expo-sqlite/localStorage/install';

export const authStorage = globalThis.localStorage;
