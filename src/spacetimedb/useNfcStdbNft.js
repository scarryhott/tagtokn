import { useSpacetimeDB, useReducer } from 'spacetimedb/react';
import {
  registerPublicGraphNftReducer,
  setPublicGraphNftListingReducer,
} from './nfcModule';

/**
 * Hooks for syncing graph NFT mint/list state to SpacetimeDB (only under NfcStdbRootProvider).
 */
export function useNfcStdbNft() {
  const ctx = useSpacetimeDB();
  const register = useReducer(registerPublicGraphNftReducer);
  const setListing = useReducer(setPublicGraphNftListingReducer);
  return {
    isActive: ctx.isActive,
    connectionError: ctx.connectionError,
    registerPublicGraphNft: (p) => register(p),
    setPublicGraphNftListing: (p) => setListing(p),
  };
}
