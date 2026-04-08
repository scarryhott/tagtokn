/**
 * Client-side SpacetimeDB schema — must stay in sync with `spacetimedb/src/index.ts`
 * (same tables, columns, reducer names). Publish the server module before connecting.
 */
import {
  schema,
  table,
  t,
  reducers,
  reducerSchema,
  makeQueryBuilder,
  DbConnectionBuilder,
  DbConnectionImpl,
} from 'spacetimedb';

const nfcLivePing = table(
  { name: 'nfc_live_ping', public: true },
  {
    id: t.u64().primaryKey().autoInc(),
    sender: t.identity(),
    body: t.string(),
    postedAt: t.timestamp(),
  }
);

const tablesModel = schema({ nfcLivePing });

export const postLivePingReducer = reducerSchema('post_live_ping', { body: t.string() });
const reducerDefs = reducers(postLivePingReducer);

export const nfcRemoteModule = {
  ...tablesModel.schemaType,
  ...reducerDefs.reducersType,
  procedures: [],
  versionInfo: { cliVersion: '2.1.0' },
};

export const nfcTables = makeQueryBuilder(tablesModel.schemaType);

export function createNfcStdbConnectionBuilder(uri, databaseName, token) {
  const b = new DbConnectionBuilder(
    nfcRemoteModule,
    (cfg) => new DbConnectionImpl(cfg)
  )
    .withUri(uri)
    .withDatabaseName(databaseName)
    .withToken(token)
    .withLightMode(true)
    .onConnect((conn) => {
      conn.subscriptionBuilder().subscribe(nfcTables.nfcLivePing.toSql());
    })
    .onConnectError(() => {});
  return b;
}
