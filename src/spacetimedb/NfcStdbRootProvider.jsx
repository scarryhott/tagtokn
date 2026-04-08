import React, { useMemo } from 'react';
import { SpacetimeDBProvider } from 'spacetimedb/react';
import { createNfcStdbConnectionBuilder } from './nfcModule';

const DEFAULT_DB = 'nfc-tap';

export default function NfcStdbRootProvider({ children }) {
  const uri = import.meta.env.VITE_SPACETIMEDB_URI || '';
  const database = import.meta.env.VITE_SPACETIMEDB_DATABASE || DEFAULT_DB;

  let token;
  try {
    token = localStorage.getItem('nfc_stdb_token') || undefined;
  } catch {
    token = undefined;
  }

  const builder = useMemo(() => {
    if (!uri) return null;
    return createNfcStdbConnectionBuilder(uri, database, token).onConnect((_conn, _id, tok) => {
      try {
        if (tok) localStorage.setItem('nfc_stdb_token', tok);
      } catch {
        /* ignore */
      }
    });
  }, [uri, database, token]);

  if (!builder) return children;
  return <SpacetimeDBProvider connectionBuilder={builder}>{children}</SpacetimeDBProvider>;
}
