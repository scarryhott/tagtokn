/**
 * Client SpacetimeDB schema — keep in sync with `spacetimedb/src/index.ts`.
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

const publicGraphNft = table(
  { name: 'public_graph_nft', public: true },
  {
    tokenId: t.string().primaryKey(),
    owner: t.identity(),
    ownerUserId: t.string(),
    nodeId: t.string(),
    title: t.string(),
    body: t.string(),
    listed: t.bool(),
    priceCents: t.u64(),
    updatedAt: t.timestamp(),
  }
);

const tablesModel = schema({ nfcLivePing, publicGraphNft });

export const postLivePingReducer = reducerSchema('post_live_ping', { body: t.string() });
export const registerPublicGraphNftReducer = reducerSchema('register_public_graph_nft', {
  tokenId: t.string(),
  ownerUserId: t.string(),
  nodeId: t.string(),
  title: t.string(),
  body: t.string(),
});
export const setPublicGraphNftListingReducer = reducerSchema('set_public_graph_nft_listing', {
  tokenId: t.string(),
  listed: t.bool(),
  priceCents: t.u64(),
});

const reducerDefs = reducers(
  postLivePingReducer,
  registerPublicGraphNftReducer,
  setPublicGraphNftListingReducer
);

export const nfcRemoteModule = {
  ...tablesModel.schemaType,
  ...reducerDefs.reducersType,
  procedures: [],
  versionInfo: { cliVersion: '2.1.0' },
};

export const nfcTables = makeQueryBuilder(tablesModel.schemaType);

export function createNfcStdbConnectionBuilder(uri, databaseName, token) {
  return new DbConnectionBuilder(
    nfcRemoteModule,
    (cfg) => new DbConnectionImpl(cfg)
  )
    .withUri(uri)
    .withDatabaseName(databaseName)
    .withToken(token)
    .withLightMode(true)
    .onConnect((conn) => {
      conn
        .subscriptionBuilder()
        .subscribe([nfcTables.nfcLivePing.toSql(), nfcTables.publicGraphNft.toSql()]);
    })
    .onConnectError(() => {});
}
