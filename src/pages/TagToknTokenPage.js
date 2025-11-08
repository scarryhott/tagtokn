import React, { useEffect, useMemo, useState } from 'react';
import { Coins, DollarSign, Flame, ShieldCheck, TrendingUp } from 'lucide-react';
import { auth } from '../firebase';
import {
  bootstrapTagtoknTokenDocument,
  recordTagtoknEarned,
  recordTagtoknPurchase,
  subscribeToTagtoknToken,
  updateTagtoknToken
} from '../services/tagtoknTokenService';

const StatCard = ({ label, value, helper, icon: Icon, tone = 'blue' }) => {
  const toneMap = {
    blue: 'text-blue-600 bg-blue-50',
    green: 'text-emerald-600 bg-emerald-50',
    purple: 'text-purple-600 bg-purple-50',
    amber: 'text-amber-600 bg-amber-50'
  };

  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-wide text-gray-400">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{value}</p>
          {helper && <p className="mt-1 text-sm text-gray-500">{helper}</p>}
        </div>
        {Icon && (
          <div className={`rounded-2xl p-3 ${toneMap[tone]}`}>
            <Icon className="h-6 w-6" />
          </div>
        )}
      </div>
    </div>
  );
};

const TagToknTokenPage = () => {
  const [tokenData, setTokenData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const [purchaseForm, setPurchaseForm] = useState({ usd: '', tokens: '' });
  const [earnForm, setEarnForm] = useState({ tokens: '' });
  const [priceInput, setPriceInput] = useState('');
  const [rewardPoolInput, setRewardPoolInput] = useState('');

  useEffect(() => {
    const unsubscribe = subscribeToTagtoknToken((payload) => {
      setTokenData(payload);
      if (payload?.priceUsd !== undefined) {
        setPriceInput(String(payload.priceUsd));
      }
      if (payload?.rewardPoolUsd !== undefined) {
        setRewardPoolInput(String(payload.rewardPoolUsd));
      } else {
        setRewardPoolInput('');
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const earnBuyRatioDisplay = useMemo(() => {
    if (!tokenData) return '0';
    if (!tokenData.totalBought && tokenData.totalEarned) {
      return '∞';
    }
    if (!tokenData.totalBought) {
      return '0';
    }
    return (tokenData.totalEarned / tokenData.totalBought).toFixed(2);
  }, [tokenData]);

  const handleStatus = (type, message) => {
    setStatus({ type, message });
    window.setTimeout(() => setStatus(null), 4000);
  };

  const handleBootstrap = async () => {
    setPendingAction('bootstrap');
    try {
      await bootstrapTagtoknTokenDocument();
      handleStatus('success', 'Initialized TagTokn token document.');
    } catch (error) {
      console.error(error);
      handleStatus('error', 'Unable to bootstrap document.');
    } finally {
      setPendingAction(null);
    }
  };

  const handlePurchaseSubmit = async (event) => {
    event.preventDefault();
    const usd = parseFloat(purchaseForm.usd);
    const tokens = parseFloat(purchaseForm.tokens);

    if (Number.isNaN(usd) || Number.isNaN(tokens) || usd < 0 || tokens <= 0) {
      handleStatus('error', 'Enter valid USD and token amounts.');
      return;
    }

    setPendingAction('purchase');
    try {
      await recordTagtoknPurchase({
        usd,
        tokens,
        actor: auth.currentUser
      });
      setPurchaseForm({ usd: '', tokens: '' });
      handleStatus('success', 'Recorded token purchase.');
    } catch (error) {
      console.error(error);
      handleStatus('error', 'Failed to record purchase.');
    } finally {
      setPendingAction(null);
    }
  };

  const handleEarnSubmit = async (event) => {
    event.preventDefault();
    const tokens = parseFloat(earnForm.tokens);
    if (Number.isNaN(tokens) || tokens <= 0) {
      handleStatus('error', 'Enter a positive number of earned tokens.');
      return;
    }

    setPendingAction('earn');
    try {
      await recordTagtoknEarned({
        tokens,
        actor: auth.currentUser
      });
      setEarnForm({ tokens: '' });
      handleStatus('success', 'Recorded earned distribution.');
    } catch (error) {
      console.error(error);
      handleStatus('error', 'Failed to record earned tokens.');
    } finally {
      setPendingAction(null);
    }
  };

  const handlePriceUpdate = async (event) => {
    event.preventDefault();
    const price = parseFloat(priceInput);
    if (Number.isNaN(price) || price <= 0) {
      handleStatus('error', 'Provide a positive price.');
      return;
    }

    let rewardPoolPayload = undefined;
    if (rewardPoolInput !== '') {
      const rewardPoolValue = parseFloat(rewardPoolInput);
      if (Number.isNaN(rewardPoolValue) || rewardPoolValue < 0) {
        handleStatus('error', 'Reward pool must be zero or greater.');
        return;
      }
      rewardPoolPayload = rewardPoolValue;
    }

    setPendingAction('price');
    try {
      await updateTagtoknToken({
        priceUsd: price,
        ...(rewardPoolPayload !== undefined ? { rewardPoolUsd: rewardPoolPayload } : {})
      });
      handleStatus('success', 'Updated token price.');
    } catch (error) {
      console.error(error);
      handleStatus('error', 'Unable to update price.');
    } finally {
      setPendingAction(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="rounded-3xl bg-gradient-to-r from-slate-900 via-blue-900 to-blue-700 px-8 py-10 text-white shadow-xl">
        <p className="text-sm uppercase tracking-[0.3em] text-blue-200">Platform Token</p>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl font-semibold">TagTokn (TAG)</h1>
            <p className="mt-3 max-w-2xl text-blue-100">
              Monitor the master token powering brand drops, in-store quests, and secondary fees.
              Every change is mirrored in Firebase so the rest of the product can react in real-time.
            </p>
          </div>
          <div className="rounded-3xl bg-white/10 px-6 py-4 text-right">
            <p className="text-sm text-blue-100">Current price</p>
            <p className="text-3xl font-semibold">${tokenData?.priceUsd?.toFixed(2) ?? '0.00'}</p>
          </div>
        </div>
        {status && (
          <div
            className={`mt-6 inline-flex items-center rounded-2xl px-4 py-2 text-sm ${
              status.type === 'error'
                ? 'bg-red-500/20 text-red-100 border border-red-400/40'
                : 'bg-emerald-500/20 text-emerald-100 border border-emerald-400/40'
            }`}
          >
            {status.message}
          </div>
        )}
      </header>

      {!tokenData && (
        <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <p className="text-lg font-semibold text-gray-800">Initialize the TagTokn token</p>
          <p className="mt-2 text-sm text-gray-500">
            We haven’t stored any data for the platform token yet. Bootstrap the Firestore document
            so supply and pricing data can start syncing.
          </p>
          <button
            onClick={handleBootstrap}
            disabled={pendingAction === 'bootstrap'}
            className="mt-6 rounded-2xl bg-blue-600 px-6 py-3 text-white font-semibold shadow hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-400"
          >
            {pendingAction === 'bootstrap' ? 'Initializing...' : 'Bootstrap Token'}
          </button>
        </div>
      )}

      {tokenData && (
        <>
          <section className="grid gap-5 md:grid-cols-2">
            <StatCard
              label="Circulating supply"
              value={tokenData.circulatingSupply?.toLocaleString() ?? '0'}
              helper="Sum of bought + earned tokens currently unlocked."
              icon={Coins}
              tone="purple"
            />
            <StatCard
              label="Treasury balance"
              value={`$${(tokenData.treasuryUsd ?? 0).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}`}
              helper="Fees / purchases flowing into TagTokn."
              icon={DollarSign}
              tone="green"
            />
            <StatCard
              label="Earn vs Buy ratio"
              value={earnBuyRatioDisplay}
              helper="Higher ratio = more community-earned supply."
              icon={Flame}
              tone="amber"
            />
            <StatCard
              label="Reward pool"
              value={`$${(tokenData.rewardPoolUsd ?? 0).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}`}
              helper="Portion reserved for in-store quests."
              icon={ShieldCheck}
              tone="blue"
            />
          </section>

          <section className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">Record purchase</h2>
              <p className="text-sm text-gray-500">
                Capture when someone buys TAG so fees & supply stay in sync.
              </p>
              <form className="mt-6 space-y-4" onSubmit={handlePurchaseSubmit}>
                <div>
                  <label className="text-sm text-gray-600">USD value</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={purchaseForm.usd}
                    onChange={(event) =>
                      setPurchaseForm((prev) => ({ ...prev, usd: event.target.value }))
                    }
                    className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-2 focus:border-blue-500 focus:outline-none"
                    placeholder="500"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Tokens minted</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={purchaseForm.tokens}
                    onChange={(event) =>
                      setPurchaseForm((prev) => ({ ...prev, tokens: event.target.value }))
                    }
                    className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-2 focus:border-blue-500 focus:outline-none"
                    placeholder="250"
                  />
                </div>
                <button
                  type="submit"
                  disabled={pendingAction === 'purchase'}
                  className="w-full rounded-2xl bg-blue-600 py-3 text-white font-semibold shadow hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-400"
                >
                  {pendingAction === 'purchase' ? 'Saving...' : 'Record purchase'}
                </button>
              </form>
            </div>

            <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">Record earned drop</h2>
              <p className="text-sm text-gray-500">
                When a local business or creator unlocks TAG, mint it here to keep totals accurate.
              </p>
              <form className="mt-6 space-y-4" onSubmit={handleEarnSubmit}>
                <div>
                  <label className="text-sm text-gray-600">Tokens earned</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={earnForm.tokens}
                    onChange={(event) => setEarnForm({ tokens: event.target.value })}
                    className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-2 focus:border-blue-500 focus:outline-none"
                    placeholder="50"
                  />
                </div>
                <button
                  type="submit"
                  disabled={pendingAction === 'earn'}
                  className="w-full rounded-2xl bg-emerald-600 py-3 text-white font-semibold shadow hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-emerald-300"
                >
                  {pendingAction === 'earn' ? 'Saving...' : 'Record earned tokens'}
                </button>
              </form>
            </div>

            <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">Adjust price & pools</h2>
              <p className="text-sm text-gray-500">
                Set the on-platform USD price or move funds into the quest reward pool.
              </p>
              <form className="mt-6 space-y-4" onSubmit={handlePriceUpdate}>
                <div>
                  <label className="text-sm text-gray-600">Displayed price (USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={priceInput}
                    onChange={(event) => setPriceInput(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-2 focus:border-blue-500 focus:outline-none"
                    placeholder="1.00"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Reward pool (USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={rewardPoolInput}
                    onChange={(event) => setRewardPoolInput(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-2 focus:border-blue-500 focus:outline-none"
                    placeholder="2500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    This is stored once you submit price updates.
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={pendingAction === 'price'}
                  className="w-full rounded-2xl bg-purple-600 py-3 text-white font-semibold shadow hover:bg-purple-500 disabled:cursor-not-allowed disabled:bg-purple-300"
                >
                  {pendingAction === 'price' ? 'Saving...' : 'Update price & pool'}
                </button>
              </form>
            </div>
          </section>

          {tokenData.lastLedgerEvent && (
            <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Most recent ledger event</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {tokenData.lastLedgerEvent.type === 'buy' ? 'Purchase' : 'Earned mint'} ·{' '}
                    {tokenData.lastLedgerEvent.tokens} TAG
                  </p>
                  <p className="text-sm text-gray-500">
                    {tokenData.lastLedgerEvent.actorDisplayName || 'System'} ·{' '}
                    {tokenData.lastLedgerEvent.actorEmail || tokenData.lastLedgerEvent.actorUid || '—'}
                  </p>
                </div>
                <div className="ml-auto text-sm text-gray-400">
                  {tokenData.lastLedgerEvent.occurredAt?.toDate
                    ? tokenData.lastLedgerEvent.occurredAt
                        .toDate()
                        .toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit'
                        })
                    : '—'}
                </div>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
};

export default TagToknTokenPage;
