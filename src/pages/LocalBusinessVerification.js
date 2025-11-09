import React, { useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck,
  Building2,
  CheckCircle2,
  MapPin,
  ShieldCheck,
  Users,
  XCircle
} from 'lucide-react';
import { auth } from '../firebase';
import { onAuthStateChanged as firebaseAuthStateChanged } from 'firebase/auth';
import {
  submitLocalBusinessApplication,
  subscribeToLocalBusinesses,
  updateLocalBusinessStatus,
  updateLocalBusiness,
  updateBusinessTreasury,
  requestTagtoknLiquidity
} from '../services/localBusinessService';
import { uploadBusinessDocument } from '../services/storageService';
import {
  createTokenTransaction,
  subscribeToTransactionsByBusiness
} from '../services/tokenTransactionService';
import {
  subscribeToMarketMakerConfig,
  upsertMarketMakerConfig
} from '../services/marketMakerService';
import { subscribeToTagtoknToken } from '../services/tagtoknTokenService';

const emptyFormState = {
  businessName: '',
  category: '',
  description: '',
  primaryContactName: '',
  contactEmail: '',
  contactPhone: '',
  website: '',
  instagramHandle: '',
  street: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'United States',
  proofOfLocality: '',
  inStoreRewards: '',
  allowsInStoreTokenEarn: true,
  acceptsTagToknPayments: false,
  inPersonOnly: true,
  keyProducts: '',
  hoursOfOperation: '',
  documentsUrl: ''
};

const statusStyles = {
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  verified: 'bg-green-100 text-green-700 border-green-200',
  rejected: 'bg-red-100 text-red-700 border-red-200'
};

const formatTimestamp = (timestamp) => {
  if (!timestamp?.toDate) return '—';
  return timestamp.toDate().toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
};

const DEFAULT_BAND_TOLERANCE = 10; // percent

const calculateBandBounds = (assetValue, tolerancePercent) => {
  const baseValue = parseFloat(assetValue);
  const tolerance = parseFloat(tolerancePercent);

  if (Number.isNaN(baseValue) || Number.isNaN(tolerance)) {
    return null;
  }

  const fraction = tolerance / 100;
  const lower = Number((baseValue * (1 - fraction)).toFixed(2));
  const upper = Number((baseValue * (1 + fraction)).toFixed(2));
  return { lower, upper };
};

const createEmptyTransactionForm = () => ({
  channel: 'nfc',
  tokenAmount: '',
  productType: 'product',
  itemName: '',
  description: '',
  eventDate: '',
  socialPostUrl: ''
});

const MAX_DOCUMENT_SIZE_BYTES = 15 * 1024 * 1024; // 15MB

const LocalBusinessVerification = () => {
  const [formData, setFormData] = useState(emptyFormState);
  const [currentUser, setCurrentUser] = useState(() => auth.currentUser);
  const [businesses, setBusinesses] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [notesByBusinessId, setNotesByBusinessId] = useState({});
  const [statusAction, setStatusAction] = useState({ id: null, nextStatus: null });
  const [documentsFile, setDocumentsFile] = useState(null);
  const [documentUploadProgress, setDocumentUploadProgress] = useState(0);
  const [fileInputKey, setFileInputKey] = useState(() => Date.now());
  const [marketBandInputs, setMarketBandInputs] = useState({});
  const [bandInputDirty, setBandInputDirty] = useState({});
  const [bandStatus, setBandStatus] = useState({});
  const [bandSensitivityInputs, setBandSensitivityInputs] = useState({});
  const [bandSensitivityDirty, setBandSensitivityDirty] = useState({});
  const [marketMakerConfigs, setMarketMakerConfigs] = useState({});
  const [treasuryInputs, setTreasuryInputs] = useState({});
  const [treasuryStatus, setTreasuryStatus] = useState({});
  const [liquidityRequestForms, setLiquidityRequestForms] = useState({});
  const [liquidityStatus, setLiquidityStatus] = useState({});
  const [transactionForms, setTransactionForms] = useState({});
  const [transactionStatus, setTransactionStatus] = useState({});
  const [transactionHistory, setTransactionHistory] = useState({});
  const [earnBuyRatio, setEarnBuyRatio] = useState(0);
  const [businessStatusFilter, setBusinessStatusFilter] = useState('all');

  useEffect(() => {
    const unsubscribe = firebaseAuthStateChanged(auth, (user) => setCurrentUser(user));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToTagtoknToken((tokenDoc) => {
      if (!tokenDoc) {
        setEarnBuyRatio(0);
        return;
      }
      if (!tokenDoc.totalBought && tokenDoc.totalEarned) {
        setEarnBuyRatio(Number.POSITIVE_INFINITY);
      } else if (!tokenDoc.totalBought) {
        setEarnBuyRatio(0);
      } else {
        setEarnBuyRatio(tokenDoc.totalEarned / tokenDoc.totalBought);
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToLocalBusinesses((records) => {
      setBusinesses(records);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    setNotesByBusinessId((prev) => {
      const updated = { ...prev };
      let changed = false;
      businesses.forEach((biz) => {
        const serverNotes = biz.verificationNotes || '';
        if (updated[biz.id] !== serverNotes) {
          updated[biz.id] = serverNotes;
          changed = true;
        }
      });
      return changed ? updated : prev;
    });
  }, [businesses]);

  useEffect(() => {
    setMarketBandInputs((prev) => {
      const next = {};
      businesses.forEach((biz) => {
        if (bandInputDirty[biz.id]) {
          next[biz.id] = prev[biz.id] ?? {
            assetValue: biz.assetValue ?? '',
            tolerance: biz.bandTolerance ?? DEFAULT_BAND_TOLERANCE
          };
        } else {
          next[biz.id] = {
            assetValue: biz.assetValue ?? '',
            tolerance: biz.bandTolerance ?? DEFAULT_BAND_TOLERANCE
          };
        }
      });
      return next;
    });
  }, [businesses, bandInputDirty]);

  useEffect(() => {
    setTreasuryInputs((prev) => {
      const next = {};
      businesses.forEach((biz) => {
        next[biz.id] = {
          selfBalance: biz.treasury?.selfBalance ?? 0,
          communityBalance: biz.treasury?.communityBalance ?? 0,
          tagtoknCredit: biz.treasury?.tagtoknCredit ?? 0,
          autoMarketMake: biz.treasury?.autoMarketMake ?? false
        };
      });
      return next;
    });
  }, [businesses]);

  useEffect(() => {
    setTransactionForms((prev) => {
      const next = {};
      businesses.forEach((biz) => {
        next[biz.id] = prev[biz.id] ?? createEmptyTransactionForm();
      });
      return next;
    });
  }, [businesses]);

  useEffect(() => {
    setLiquidityRequestForms((prev) => {
      const next = {};
      businesses.forEach((biz) => {
        next[biz.id] = prev[biz.id] ?? {
          amount: '',
          broadcastToCommunity: false
        };
      });
      return next;
    });
  }, [businesses]);

  useEffect(() => {
    const unsubscribers = businesses
      .filter((biz) => biz.id)
      .map((biz) =>
        subscribeToTransactionsByBusiness(biz.id, (transactions) => {
          setTransactionHistory((prev) => ({
            ...prev,
            [biz.id]: transactions
          }));
        })
      );

    return () => {
      unsubscribers.forEach((unsubscribe) => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      });
    };
  }, [businesses]);

  useEffect(() => {
    const unsubscribers = businesses
      .filter((biz) => biz.id)
      .map((biz) =>
        subscribeToMarketMakerConfig(biz.id, (config) => {
          setMarketMakerConfigs((prev) => ({
            ...prev,
            [biz.id]: config
          }));

          if (!bandSensitivityDirty[biz.id] && config?.bandSensitivity !== undefined) {
            setBandSensitivityInputs((prev) => ({
              ...prev,
              [biz.id]: config.bandSensitivity
            }));
          }
        })
      );

    return () => {
      unsubscribers.forEach((unsubscribe) => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      });
    };
  }, [businesses, bandSensitivityDirty]);

  const summary = useMemo(() => {
    return businesses.reduce(
      (acc, biz) => {
        acc.total += 1;
        if (acc[biz.status]) acc[biz.status] += 1;
        return acc;
      },
      { total: 0, pending: 0, verified: 0, rejected: 0 }
    );
  }, [businesses]);

  const filteredBusinesses = useMemo(() => {
    if (businessStatusFilter === 'all') {
      return businesses;
    }
    return businesses.filter(
      (biz) => (biz.status ?? 'pending') === businessStatusFilter
    );
  }, [businesses, businessStatusFilter]);

  const handleFormChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleNoteChange = (businessId, value) => {
    setNotesByBusinessId((prev) => ({
      ...prev,
      [businessId]: value
    }));
  };

  const handleDocumentFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      setDocumentsFile(null);
      setDocumentUploadProgress(0);
      return;
    }

    if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
      setFeedback({
        type: 'error',
        message: 'File is too large. Please upload a document smaller than 15MB.'
      });
      event.target.value = '';
      return;
    }

    setFeedback(null);
    setDocumentsFile(file);
    setDocumentUploadProgress(0);
  };

  const handleSensitivityChange = (businessId, value) => {
    const numericValue = Math.max(0, Math.min(1, parseFloat(value) || 0));
    setBandSensitivityInputs((prev) => ({
      ...prev,
      [businessId]: numericValue
    }));
    setBandSensitivityDirty((prev) => ({
      ...prev,
      [businessId]: true
    }));
  };

  const handleFundingSourceChange = (businessId, source) => {
    setMarketMakerConfigs((prev) => ({
      ...prev,
      [businessId]: {
        ...(prev[businessId] || {}),
        fundingSource: source
      }
    }));
  };

  const handlePayoutModeChange = (businessId, mode) => {
    setMarketMakerConfigs((prev) => ({
      ...prev,
      [businessId]: {
        ...(prev[businessId] || {}),
        payoutMode: mode
      }
    }));
  };

  const handleSocialMultipleChange = (businessId, value) => {
    const parsed = Math.max(1, parseFloat(value) || 1);
    setMarketMakerConfigs((prev) => ({
      ...prev,
      [businessId]: {
        ...(prev[businessId] || {}),
        socialMultiple: parsed
      }
    }));
  };

  const handleToggleAutoMarketMake = async (business) => {
    const currentTreasury = treasuryInputs[business.id] || {
      selfBalance: 0,
      communityBalance: 0,
      tagtoknCredit: 0,
      autoMarketMake: false
    };
    const nextValue = !currentTreasury.autoMarketMake;
    try {
      await updateBusinessTreasury(business.id, {
        ...currentTreasury,
        autoMarketMake: nextValue
      });
      setTreasuryInputs((prev) => ({
        ...prev,
        [business.id]: {
          ...prev[business.id],
          autoMarketMake: nextValue
        }
      }));
      setTreasuryStatus((prev) => ({
        ...prev,
        [business.id]: {
          type: 'success',
          message: `Auto market making ${nextValue ? 'enabled' : 'disabled'}.`
        }
      }));
      setMarketMakerConfigs((prev) => ({
        ...prev,
        [business.id]: {
          ...prev[business.id],
          autoEnabled: nextValue
        }
      }));
    } catch (error) {
      console.error('Error toggling auto market making', error);
      setTreasuryStatus((prev) => ({
        ...prev,
        [business.id]: { type: 'error', message: 'Unable to update auto setting.' }
      }));
    }
  };

  const handleTreasuryInputChange = (businessId, field, value) => {
    setTreasuryInputs((prev) => ({
      ...prev,
      [businessId]: {
        ...prev[businessId],
        [field]: value
      }
    }));
    setTreasuryStatus((prev) => ({
      ...prev,
      [businessId]: null
    }));
  };

  const handleSaveTreasury = async (business) => {
    const inputs = treasuryInputs[business.id];
    if (!inputs) return;
    const sanitized = {
      selfBalance: parseFloat(inputs.selfBalance) || 0,
      communityBalance: parseFloat(inputs.communityBalance) || 0,
      tagtoknCredit: parseFloat(inputs.tagtoknCredit) || 0,
      autoMarketMake: !!inputs.autoMarketMake
    };
    try {
      await updateBusinessTreasury(business.id, sanitized);
      setTreasuryStatus((prev) => ({
        ...prev,
        [business.id]: { type: 'success', message: 'Treasury updated.' }
      }));
    } catch (error) {
      console.error('Error saving treasury', error);
      setTreasuryStatus((prev) => ({
        ...prev,
        [business.id]: { type: 'error', message: 'Failed to save treasury.' }
      }));
    }
  };

  const handleLiquidityFormChange = (businessId, field, value) => {
    const normalizedValue = field === 'broadcastToCommunity' ? !!value : value;
    setLiquidityRequestForms((prev) => ({
      ...prev,
      [businessId]: {
        ...prev[businessId],
        [field]: normalizedValue
      }
    }));
    setLiquidityStatus((prev) => ({
      ...prev,
      [businessId]: null
    }));
  };

  const handleRequestLiquidity = async (business) => {
    const form = liquidityRequestForms[business.id];
    if (!form) return;
    const amount = parseFloat(form.amount);
    if (Number.isNaN(amount) || amount <= 0) {
      setLiquidityStatus((prev) => ({
        ...prev,
        [business.id]: { type: 'error', message: 'Enter a positive amount.' }
      }));
      return;
    }
    try {
      await requestTagtoknLiquidity({
        businessId: business.id,
        amount,
        broadcastToCommunity: !!form.broadcastToCommunity
      });
      setLiquidityStatus((prev) => ({
        ...prev,
        [business.id]: { type: 'success', message: 'Liquidity request sent.' }
      }));
      setLiquidityRequestForms((prev) => ({
        ...prev,
        [business.id]: { amount: '', broadcastToCommunity: form.broadcastToCommunity }
      }));
    } catch (error) {
      console.error('Error requesting liquidity', error);
      setLiquidityStatus((prev) => ({
        ...prev,
        [business.id]: { type: 'error', message: 'Request failed.' }
      }));
    }
  };

  const handleBandInputChange = (businessId, field, value) => {
    setMarketBandInputs((prev) => ({
      ...prev,
      [businessId]: {
        ...prev[businessId],
        [field]: value
      }
    }));
    setBandInputDirty((prev) => ({
      ...prev,
      [businessId]: true
    }));
    setBandStatus((prev) => ({
      ...prev,
      [businessId]: null
    }));
  };

  const handleSaveBandStrategy = async (business) => {
    const inputs = marketBandInputs[business.id] || {};
    const assetValue = parseFloat(inputs.assetValue);
    const tolerance = parseFloat(inputs.tolerance);

    if (Number.isNaN(assetValue) || assetValue <= 0) {
      setBandStatus((prev) => ({
        ...prev,
        [business.id]: { type: 'error', message: 'Enter a positive asset value.' }
      }));
      return;
    }

    if (Number.isNaN(tolerance) || tolerance <= 0) {
      setBandStatus((prev) => ({
        ...prev,
        [business.id]: { type: 'error', message: 'Tolerance must be above zero.' }
      }));
      return;
    }

    const bandRange = calculateBandBounds(assetValue, tolerance);
    if (!bandRange) {
      setBandStatus((prev) => ({
        ...prev,
        [business.id]: { type: 'error', message: 'Unable to calculate band range.' }
      }));
      return;
    }

    const sensitivityInput =
      bandSensitivityInputs[business.id] ??
      marketMakerConfigs[business.id]?.bandSensitivity ??
      0;
    const normalizedRatio = Number.isFinite(earnBuyRatio) ? earnBuyRatio : 1;
    const effectiveTolerance = tolerance * (1 + sensitivityInput * normalizedRatio);
    const effectiveBandRange = calculateBandBounds(assetValue, effectiveTolerance);
    const payoutMode = marketMakerConfigs[business.id]?.payoutMode ?? 'cash';
    const socialMultiple =
      payoutMode === 'social'
        ? Math.max(1, marketMakerConfigs[business.id]?.socialMultiple ?? 1)
        : 1;
    const socialBandRange =
      payoutMode === 'social' && effectiveBandRange
        ? {
            lower: Number((effectiveBandRange.lower * socialMultiple).toFixed(2)),
            upper: Number((effectiveBandRange.upper * socialMultiple).toFixed(2))
          }
        : null;

    try {
      await updateLocalBusiness(business.id, {
        assetValue,
        bandTolerance: tolerance,
        bandLower: bandRange.lower,
        bandUpper: bandRange.upper
      });

      await upsertMarketMakerConfig(business.id, {
        bandLower: bandRange.lower,
        bandUpper: bandRange.upper,
        baseTolerance: tolerance,
        bandSensitivity: sensitivityInput,
        effectiveTolerance,
        effectiveBandLower: effectiveBandRange?.lower ?? bandRange.lower,
        effectiveBandUpper: effectiveBandRange?.upper ?? bandRange.upper,
        autoEnabled: marketMakerConfigs[business.id]?.autoEnabled ?? false,
        fundingSource: marketMakerConfigs[business.id]?.fundingSource ?? 'self',
        payoutMode,
        socialMultiple,
        socialBandLower: socialBandRange?.lower ?? null,
        socialBandUpper: socialBandRange?.upper ?? null,
        assetValue
      });

      setBandStatus((prev) => ({
        ...prev,
        [business.id]: { type: 'success', message: 'Market band saved.' }
      }));
      setBandInputDirty((prev) => ({
        ...prev,
        [business.id]: false
      }));
      setBandSensitivityDirty((prev) => ({
        ...prev,
        [business.id]: false
      }));
    } catch (error) {
      console.error('Error saving market band', error);
      setBandStatus((prev) => ({
        ...prev,
        [business.id]: { type: 'error', message: 'Failed to save bands. Try again.' }
      }));
    }
  };

  const handleTransactionFieldChange = (businessId, field, value) => {
    setTransactionForms((prev) => ({
      ...prev,
      [businessId]: {
        ...prev[businessId],
        [field]: value
      }
    }));
    setTransactionStatus((prev) => ({
      ...prev,
      [businessId]: null
    }));
  };

  const handleTransactionSubmit = async (business) => {
    const form = transactionForms[business.id];
    const amount = parseFloat(form.tokenAmount);

    if (Number.isNaN(amount) || amount <= 0) {
      setTransactionStatus((prev) => ({
        ...prev,
        [business.id]: { type: 'error', message: 'Enter a positive token amount.' }
      }));
      return;
    }

    if (!form.itemName.trim()) {
      setTransactionStatus((prev) => ({
        ...prev,
        [business.id]: { type: 'error', message: 'Provide a product, service, or event name.' }
      }));
      return;
    }

    if (form.productType === 'event' && !form.eventDate) {
      setTransactionStatus((prev) => ({
        ...prev,
        [business.id]: { type: 'error', message: 'Event transactions require a date.' }
      }));
      return;
    }

    try {
      await createTokenTransaction({
        businessId: business.id,
        businessName: business.businessName,
        channel: form.channel,
        tokenAmount: amount,
        productType: form.productType,
        itemName: form.itemName.trim(),
        description: form.description.trim(),
        eventDate: form.eventDate || null,
        socialPostUrl: form.socialPostUrl.trim()
      });

      setTransactionStatus((prev) => ({
        ...prev,
        [business.id]: { type: 'success', message: 'Transaction recorded and NFTs minted.' }
      }));

      setTransactionForms((prev) => ({
        ...prev,
        [business.id]: createEmptyTransactionForm()
      }));
    } catch (error) {
      console.error('Error recording transaction', error);
      setTransactionStatus((prev) => ({
        ...prev,
        [business.id]: { type: 'error', message: 'Failed to record transaction.' }
      }));
    }
  };

  const validateForm = () => {
    const requiredFields = [
      { key: 'businessName', label: 'Business name' },
      { key: 'contactEmail', label: 'Contact email' },
      { key: 'city', label: 'City' },
      { key: 'state', label: 'State' }
    ];

    for (const field of requiredFields) {
      if (!formData[field.key]?.trim()) {
        return `${field.label} is required.`;
      }
    }

    if (!currentUser) {
      return 'Please sign in before submitting a business.';
    }

    return null;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFeedback(null);

    const validationError = validateForm();
    if (validationError) {
      setFeedback({ type: 'error', message: validationError });
      return;
    }

    setSubmitting(true);
    let createdBusinessId = null;
    const payload = {
      businessName: formData.businessName.trim(),
      category: formData.category.trim(),
      description: formData.description.trim(),
      primaryContact: {
        name: formData.primaryContactName.trim(),
        email: formData.contactEmail.trim(),
        phone: formData.contactPhone.trim()
      },
      website: formData.website.trim() || null,
      instagramHandle: formData.instagramHandle.replace('@', '').trim(),
      location: {
        street: formData.street.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        postalCode: formData.postalCode.trim(),
        country: formData.country.trim()
      },
      proofOfLocality: formData.proofOfLocality.trim(),
      inStoreRewards: formData.inStoreRewards.trim(),
      allowsInStoreTokenEarn: formData.allowsInStoreTokenEarn,
      acceptsTagToknPayments: formData.acceptsTagToknPayments,
      inPersonOnly: formData.inPersonOnly,
      keyProducts: formData.keyProducts
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
      hoursOfOperation: formData.hoursOfOperation.trim(),
      documentsUrl: formData.documentsUrl.trim() || null
    };

    try {
      createdBusinessId = await submitLocalBusinessApplication(payload, currentUser);

      if (documentsFile && createdBusinessId) {
        const { downloadURL, path } = await uploadBusinessDocument(
          createdBusinessId,
          documentsFile,
          setDocumentUploadProgress
        );
        await updateLocalBusiness(createdBusinessId, {
          documentsUrl: downloadURL,
          documentPath: path
        });
      }

      setFeedback({
        type: 'success',
        message: 'Business submitted for verification. We will review it shortly.'
      });
      setFormData(emptyFormState);
      setDocumentsFile(null);
      setDocumentUploadProgress(0);
      setFileInputKey(Date.now());
    } catch (error) {
      console.error('Error submitting business', error);
      setFeedback({
        type: 'error',
        message: 'Unable to submit at the moment. Please try again.'
      });
    } finally {
      setSubmitting(false);
      setDocumentUploadProgress(0);
    }
  };

  const handleStatusUpdate = async (businessId, nextStatus) => {
    if (!currentUser) {
      setFeedback({
        type: 'error',
        message: 'You need to be signed in to verify businesses.'
      });
      return;
    }

    setStatusAction({ id: businessId, nextStatus });

    try {
      await updateLocalBusinessStatus(businessId, nextStatus, {
        notes: notesByBusinessId[businessId] || '',
        verifierUid: currentUser.uid,
        verifierName: currentUser.displayName,
        verifierEmail: currentUser.email
      });
    } catch (error) {
      console.error('Error updating verification status', error);
      setFeedback({
        type: 'error',
        message: 'Could not update the status. Please try again.'
      });
    } finally {
      setStatusAction({ id: null, nextStatus: null });
    }
  };

  const isActionLoading = (businessId, nextStatus) =>
    statusAction.id === businessId && statusAction.nextStatus === nextStatus;

  return (
    <div className="space-y-8">
      <header className="rounded-3xl bg-gradient-to-r from-blue-600 to-blue-500 px-8 py-10 text-white shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div>
            <p className="text-sm uppercase tracking-wide text-blue-100">Verification Desk</p>
            <h1 className="mt-2 text-3xl font-semibold">Local Business Intake & Approval</h1>
            <p className="mt-3 max-w-2xl text-blue-50">
              Collect applications from local businesses, verify their footprint, and store
              everything inside Firebase for TagTokn activation.
            </p>
          </div>
          <ShieldCheck className="h-16 w-16 text-blue-200" />
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl bg-white/10 px-4 py-3 backdrop-blur-sm">
            <p className="text-xs uppercase tracking-wide text-blue-100">Total</p>
            <p className="mt-1 text-2xl font-semibold">{summary.total}</p>
          </div>
          <div className="rounded-2xl bg-white/10 px-4 py-3 backdrop-blur-sm">
            <p className="text-xs uppercase tracking-wide text-blue-100">Pending</p>
            <p className="mt-1 text-2xl font-semibold">{summary.pending}</p>
          </div>
          <div className="rounded-2xl bg-white/10 px-4 py-3 backdrop-blur-sm">
            <p className="text-xs uppercase tracking-wide text-blue-100">Verified</p>
            <p className="mt-1 text-2xl font-semibold">{summary.verified}</p>
          </div>
          <div className="rounded-2xl bg-white/10 px-4 py-3 backdrop-blur-sm">
            <p className="text-xs uppercase tracking-wide text-blue-100">Rejected</p>
            <p className="mt-1 text-2xl font-semibold">{summary.rejected}</p>
          </div>
        </div>
      </header>

      <section className="grid gap-8 lg:grid-cols-2">
        <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-blue-50 p-3">
              <Building2 className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Submit a Local Business</h2>
              <p className="text-sm text-gray-500">
                Provide enough context so we can cross-check that the business is truly local.
              </p>
            </div>
          </div>

          {feedback && (
            <div
              className={`mt-6 rounded-2xl border px-4 py-3 text-sm ${
                feedback.type === 'error'
                  ? 'border-red-200 bg-red-50 text-red-800'
                  : 'border-green-200 bg-green-50 text-green-800'
              }`}
            >
              {feedback.message}
            </div>
          )}

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-gray-600">Business name *</label>
                <input
                  name="businessName"
                  value={formData.businessName}
                  onChange={handleFormChange}
                  className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 focus:border-blue-500 focus:outline-none"
                  placeholder="Bryant Park Content Co."
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Category</label>
                <input
                  name="category"
                  value={formData.category}
                  onChange={handleFormChange}
                  className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 focus:border-blue-500 focus:outline-none"
                  placeholder="Coffee, retail, etc."
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600">Describe the experience</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleFormChange}
                rows={3}
                className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 focus:border-blue-500 focus:outline-none"
                placeholder="What makes this business special for locals?"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-gray-600">Primary contact</label>
                <input
                  name="primaryContactName"
                  value={formData.primaryContactName}
                  onChange={handleFormChange}
                  className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 focus:border-blue-500 focus:outline-none"
                  placeholder="Owner or manager name"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Contact email *</label>
                <input
                  name="contactEmail"
                  type="email"
                  value={formData.contactEmail}
                  onChange={handleFormChange}
                  className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 focus:border-blue-500 focus:outline-none"
                  placeholder="hello@business.com"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-gray-600">Contact phone</label>
                <input
                  name="contactPhone"
                  value={formData.contactPhone}
                  onChange={handleFormChange}
                  className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 focus:border-blue-500 focus:outline-none"
                  placeholder="+1 (555) 123-1234"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Instagram handle</label>
                <input
                  name="instagramHandle"
                  value={formData.instagramHandle}
                  onChange={handleFormChange}
                  className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 focus:border-blue-500 focus:outline-none"
                  placeholder="@tagtokn"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-gray-600">Website</label>
                <input
                  name="website"
                  value={formData.website}
                  onChange={handleFormChange}
                  className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 focus:border-blue-500 focus:outline-none"
                  placeholder="https://"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Key products (comma separated)</label>
                <input
                  name="keyProducts"
                  value={formData.keyProducts}
                  onChange={handleFormChange}
                  className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 focus:border-blue-500 focus:outline-none"
                  placeholder="Coffee, pottery class, merch"
                />
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <p className="text-sm font-semibold text-gray-700">Location</p>
              <div className="mt-4 grid gap-4">
                <input
                  name="street"
                  value={formData.street}
                  onChange={handleFormChange}
                  className="rounded-2xl border border-gray-200 px-4 py-3 focus:border-blue-500 focus:outline-none"
                  placeholder="Street address"
                />
                <div className="grid gap-4 md:grid-cols-3">
                  <input
                    name="city"
                    value={formData.city}
                    onChange={handleFormChange}
                    className="rounded-2xl border border-gray-200 px-4 py-3 focus:border-blue-500 focus:outline-none"
                    placeholder="City"
                  />
                  <input
                    name="state"
                    value={formData.state}
                    onChange={handleFormChange}
                    className="rounded-2xl border border-gray-200 px-4 py-3 focus:border-blue-500 focus:outline-none"
                    placeholder="State"
                  />
                  <input
                    name="postalCode"
                    value={formData.postalCode}
                    onChange={handleFormChange}
                    className="rounded-2xl border border-gray-200 px-4 py-3 focus:border-blue-500 focus:outline-none"
                    placeholder="Zip"
                  />
                </div>
                <input
                  name="country"
                  value={formData.country}
                  onChange={handleFormChange}
                  className="rounded-2xl border border-gray-200 px-4 py-3 focus:border-blue-500 focus:outline-none"
                  placeholder="Country"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600">Proof that they are local</label>
              <textarea
                name="proofOfLocality"
                value={formData.proofOfLocality}
                onChange={handleFormChange}
                rows={3}
                className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 focus:border-blue-500 focus:outline-none"
                placeholder="Describe the local footprint, community involvement, city permits, etc."
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600">
                In-store quests or TagTokn perks
              </label>
              <textarea
                name="inStoreRewards"
                value={formData.inStoreRewards}
                onChange={handleFormChange}
                rows={2}
                className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 focus:border-blue-500 focus:outline-none"
                placeholder="Examples: earn 5 tokens for a tagged reel, in-store drops, etc."
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-gray-600">Hours of operation</label>
                <input
                  name="hoursOfOperation"
                  value={formData.hoursOfOperation}
                  onChange={handleFormChange}
                  className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 focus:border-blue-500 focus:outline-none"
                  placeholder="Mon-Fri 8a-6p"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Supporting docs URL</label>
                <input
                  name="documentsUrl"
                  value={formData.documentsUrl}
                  onChange={handleFormChange}
                  className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 focus:border-blue-500 focus:outline-none"
                  placeholder="Drive/Dropbox links"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600">Upload supporting proof</label>
              <input
                key={fileInputKey}
                type="file"
                accept="application/pdf,image/*"
                onChange={handleDocumentFileChange}
                className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none file:mr-4 file:rounded-xl file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
              />
              <p className="mt-2 text-xs text-gray-500">
                Attach permits, community photos, or any proof (PDF or image, up to 15MB).
              </p>
              {documentsFile && (
                <div className="mt-2 text-xs text-gray-600">
                  <p>Selected: {documentsFile.name}</p>
                  {documentUploadProgress > 0 && (
                    <p className="mt-1">
                      Upload progress: {documentUploadProgress}%
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <label className="flex items-center gap-3 rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-700">
                <input
                  type="checkbox"
                  name="allowsInStoreTokenEarn"
                  checked={formData.allowsInStoreTokenEarn}
                  onChange={handleFormChange}
                  className="h-4 w-4 accent-blue-600"
                />
                Allows customers to earn in-store tokens
              </label>
              <label className="flex items-center gap-3 rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-700">
                <input
                  type="checkbox"
                  name="acceptsTagToknPayments"
                  checked={formData.acceptsTagToknPayments}
                  onChange={handleFormChange}
                  className="h-4 w-4 accent-blue-600"
                />
                Accepts TagTokn payments
              </label>
              <label className="flex items-center gap-3 rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-700">
                <input
                  type="checkbox"
                  name="inPersonOnly"
                  checked={formData.inPersonOnly}
                  onChange={handleFormChange}
                  className="h-4 w-4 accent-blue-600"
                />
                Operates primarily in person
              </label>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-2xl bg-blue-600 py-3 font-semibold text-white shadow-lg transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-400"
            >
              {submitting ? 'Submitting...' : 'Submit for review'}
            </button>
          </form>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-emerald-50 p-3">
              <BadgeCheck className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Verification queue</h2>
              <p className="text-sm text-gray-500">
                Review the submissions, leave notes, and move them to verified once confident.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {[
              { value: 'all', label: 'All', count: summary.total },
              { value: 'pending', label: 'Pending', count: summary.pending },
              { value: 'verified', label: 'Verified', count: summary.verified },
              { value: 'rejected', label: 'Rejected', count: summary.rejected }
            ].map((filter) => (
              <button
                key={filter.value}
                onClick={() => setBusinessStatusFilter(filter.value)}
                className={`rounded-2xl border px-4 py-2 text-sm font-semibold ${
                  businessStatusFilter === filter.value
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-600'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                {filter.label} ({filter.count})
              </button>
            ))}
          </div>

          <div className="mt-6 space-y-4">
            {filteredBusinesses.length === 0 && (
              <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-12 text-center text-sm text-gray-500">
                {businessStatusFilter === 'all'
                  ? 'No submissions yet. Once businesses apply, they will appear here with their data.'
                  : 'No businesses in this status yet.'}
              </div>
            )}

            {filteredBusinesses.map((business) => {
              const bandInputs =
                marketBandInputs[business.id] || {
                  assetValue: '',
                  tolerance: DEFAULT_BAND_TOLERANCE
                };
              const bandRange = calculateBandBounds(bandInputs.assetValue, bandInputs.tolerance);
              const currentBandStatus = bandStatus[business.id];
              const txForm = transactionForms[business.id] || createEmptyTransactionForm();
              const txStatus = transactionStatus[business.id];
              const txHistory = transactionHistory[business.id] || [];
              const treasury = treasuryInputs[business.id] || {
                selfBalance: 0,
                communityBalance: 0,
                tagtoknCredit: 0,
                autoMarketMake: false
              };
              const treasuryMessage = treasuryStatus[business.id];
              const liquidityForm = liquidityRequestForms[business.id] || {
                amount: '',
                broadcastToCommunity: false
              };
              const liquidityMessage = liquidityStatus[business.id];
              const marketMaker = marketMakerConfigs[business.id] || {};
              const sensitivityValue =
                bandSensitivityInputs[business.id] ??
                marketMaker.bandSensitivity ??
                0;
              const normalizedRatio = Number.isFinite(earnBuyRatio) ? earnBuyRatio : 1;
              const toleranceValue = parseFloat(bandInputs.tolerance) || DEFAULT_BAND_TOLERANCE;
              const effectiveTolerance =
                toleranceValue * (1 + sensitivityValue * normalizedRatio);
              const effectiveBandRange = calculateBandBounds(
                bandInputs.assetValue,
                effectiveTolerance
              );
              const fundingSource = marketMaker.fundingSource ?? 'self';
              const autoEnabled = marketMaker.autoEnabled ?? treasury.autoMarketMake ?? false;
              const payoutMode = marketMaker.payoutMode ?? 'cash';
              const socialMultiple =
                payoutMode === 'social'
                  ? marketMaker.socialMultiple ?? 1
                  : 1;
              const socialBandRange =
                payoutMode === 'social' && effectiveBandRange
                  ? {
                      lower: Number((effectiveBandRange.lower * socialMultiple).toFixed(2)),
                      upper: Number((effectiveBandRange.upper * socialMultiple).toFixed(2))
                    }
                  : null;
              const isVerifiedBusiness = (business.status ?? 'pending') === 'verified';

              return (
                <div
                  key={business.id}
                  className="rounded-3xl border border-gray-100 bg-gray-50/60 p-5 shadow-sm"
                >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold">{business.businessName}</h3>
                      <span
                        className={`rounded-full border px-3 py-0.5 text-xs font-medium ${
                          statusStyles[business.status ?? 'pending']
                        }`}
                      >
                        {(business.status ?? 'pending').toUpperCase()}
                      </span>
                      {isVerifiedBusiness && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600/10 px-3 py-0.5 text-xs font-semibold text-emerald-700">
                          <BadgeCheck className="h-3.5 w-3.5" />
                          Verified Business
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      Added {formatTimestamp(business.createdAt)}
                    </p>
                  </div>
                  <div className="flex gap-2 text-sm text-gray-500">
                    {business.instagramHandle && (
                      <span>@{business.instagramHandle}</span>
                    )}
                    {business.website && (
                      <a
                        href={business.website}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        Website
                      </a>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl bg-white p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-600">
                      <MapPin className="h-4 w-4 text-blue-500" />
                      Location
                    </div>
                    <p className="mt-2 text-sm text-gray-700">
                      {[
                        business.location?.street,
                        business.location?.city,
                        business.location?.state,
                        business.location?.postalCode
                      ]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                    <p className="text-xs text-gray-500">{business.location?.country}</p>
                  </div>

                  <div className="rounded-2xl bg-white p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-600">
                      <Users className="h-4 w-4 text-emerald-500" />
                      Contact
                    </div>
                    <p className="mt-2 text-sm text-gray-700">
                      {business.primaryContact?.name || '—'}
                    </p>
                    <p className="text-sm text-gray-500">{business.primaryContact?.email}</p>
                    <p className="text-sm text-gray-500">{business.primaryContact?.phone}</p>
                  </div>
                </div>

                {business.keyProducts?.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {business.keyProducts.map((item) => (
                      <span
                        key={item}
                        className="rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-600"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                )}

                {business.proofOfLocality && (
                  <p className="mt-4 rounded-2xl bg-white p-3 text-sm text-gray-700">
                    {business.proofOfLocality}
                  </p>
                )}

                <div className="mt-4 space-y-3">
                  <label className="text-sm font-semibold text-gray-600">Verification notes</label>
                  <textarea
                    value={notesByBusinessId[business.id] || ''}
                    onChange={(event) => handleNoteChange(business.id, event.target.value)}
                    rows={2}
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="Document why you verified or rejected this submission."
                  />
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    onClick={() => handleStatusUpdate(business.id, 'verified')}
                    disabled={
                      business.status === 'verified' || isActionLoading(business.id, 'verified')
                    }
                    className="flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-emerald-300"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {isActionLoading(business.id, 'verified') ? 'Saving...' : 'Mark verified'}
                  </button>
                  <button
                    onClick={() => handleStatusUpdate(business.id, 'rejected')}
                    disabled={
                      business.status === 'rejected' || isActionLoading(business.id, 'rejected')
                    }
                    className="flex items-center gap-2 rounded-2xl bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:bg-red-300"
                  >
                    <XCircle className="h-4 w-4" />
                    {isActionLoading(business.id, 'rejected') ? 'Saving...' : 'Reject'}
                  </button>
                </div>

                <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-700">Treasury lanes</p>
                    {treasuryMessage && (
                      <span
                        className={`text-xs font-semibold ${
                          treasuryMessage.type === 'error' ? 'text-red-500' : 'text-emerald-600'
                        }`}
                      >
                        {treasuryMessage.message}
                      </span>
                    )}
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-3">
                    {[
                      { label: 'Self-funded', field: 'selfBalance' },
                      {
                        label: 'Community-funded',
                        field: 'communityBalance'
                      },
                      { label: 'TagTokn credit', field: 'tagtoknCredit' }
                    ].map(({ label, field }) => (
                      <div key={field}>
                        <label className="text-xs uppercase text-gray-500">{label}</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={treasury[field]}
                          onChange={(event) =>
                            handleTreasuryInputChange(business.id, field, event.target.value)
                          }
                          className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          placeholder="0"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleToggleAutoMarketMake(business)}
                      className={`rounded-2xl px-4 py-2 text-sm font-semibold ${
                        autoEnabled
                          ? 'bg-emerald-600 text-white'
                          : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      {autoEnabled ? 'Automatic market making ON' : 'Enable automatic'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveTreasury(business)}
                      className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                    >
                      Save treasury
                    </button>
                  </div>

                  <div className="mt-4 rounded-2xl border border-dashed border-gray-200 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs uppercase text-gray-500">Request TagTokn liquidity</p>
                      {liquidityMessage && (
                        <span
                          className={`text-xs font-semibold ${
                            liquidityMessage.type === 'error'
                              ? 'text-red-500'
                              : 'text-blue-600'
                          }`}
                        >
                          {liquidityMessage.message}
                        </span>
                      )}
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={liquidityForm.amount}
                        onChange={(event) =>
                          handleLiquidityFormChange(business.id, 'amount', event.target.value)
                        }
                        className="rounded-2xl border border-gray-200 px-4 py-2 focus:border-blue-500 focus:outline-none"
                        placeholder="Amount needed"
                      />
                      <label className="flex items-center gap-2 text-xs text-gray-600">
                        <input
                          type="checkbox"
                          checked={liquidityForm.broadcastToCommunity}
                          onChange={(event) =>
                            handleLiquidityFormChange(
                              business.id,
                              'broadcastToCommunity',
                              event.target.checked
                            )
                          }
                          className="h-4 w-4 accent-blue-600"
                        />
                        Broadcast to community backers
                      </label>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRequestLiquidity(business)}
                      className="mt-3 w-full rounded-2xl bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-500"
                    >
                      Ask TagTokn (2.5% fee)
                    </button>
                  </div>
                </div>

                <div className="mt-6 rounded-2xl border border-emerald-100 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-700">Market bands</p>
                    {currentBandStatus && (
                      <span
                        className={`text-xs font-semibold ${
                          currentBandStatus.type === 'error' ? 'text-red-500' : 'text-emerald-600'
                        }`}
                      >
                        {currentBandStatus.message}
                      </span>
                    )}
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-3">
                    <div>
                      <label className="text-xs uppercase text-gray-500">Asset value</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={bandInputs.assetValue}
                        onChange={(event) =>
                          handleBandInputChange(business.id, 'assetValue', event.target.value)
                        }
                        className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-2 focus:border-emerald-500 focus:outline-none"
                        placeholder="5000"
                      />
                    </div>
                    <div>
                      <label className="text-xs uppercase text-gray-500">Tolerance %</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        value={bandInputs.tolerance}
                        onChange={(event) =>
                          handleBandInputChange(business.id, 'tolerance', event.target.value)
                        }
                        className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-2 focus:border-emerald-500 focus:outline-none"
                        placeholder="10"
                      />
                    </div>
                    <div className="rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-700">
                      <p>Buy below: {bandRange ? `$${bandRange.lower.toLocaleString()}` : '—'}</p>
                      <p>Sell above: {bandRange ? `$${bandRange.upper.toLocaleString()}` : '—'}</p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-3">
                    <div className="md:col-span-2">
                      <label className="text-xs uppercase text-gray-500">
                        Band sensitivity ({Math.round((sensitivityValue || 0) * 100)}%)
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={sensitivityValue}
                        onChange={(event) =>
                          handleSensitivityChange(business.id, event.target.value)
                        }
                        className="mt-2 w-full accent-purple-600"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Links tolerance to Earn/Buy ratio ({Number.isFinite(earnBuyRatio) ? earnBuyRatio.toFixed(2) : '∞'}).
                      </p>
                    </div>
                    <div className="rounded-2xl bg-purple-50 p-3 text-sm text-purple-700">
                      <p>
                        Effective tolerance:{' '}
                        {Number.isFinite(effectiveTolerance)
                          ? `${effectiveTolerance.toFixed(2)}%`
                          : '—'}
                      </p>
                      <p>
                        Effective buy:{" "}
                        {effectiveBandRange ? `$${effectiveBandRange.lower.toLocaleString()}` : '—'}
                      </p>
                      <p>
                        Effective sell:{" "}
                        {effectiveBandRange ? `$${effectiveBandRange.upper.toLocaleString()}` : '—'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-xs uppercase text-gray-500">Funding source</label>
                      <select
                        value={fundingSource}
                        onChange={(event) =>
                          handleFundingSourceChange(business.id, event.target.value)
                        }
                        className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-2 focus:border-emerald-500 focus:outline-none"
                      >
                        <option value="self">Self treasury</option>
                        <option value="community">Community box</option>
                        <option value="tagtokn">TagTokn backstop</option>
                      </select>
                    </div>
                    <div className="flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => handleToggleAutoMarketMake(business)}
                        className={`rounded-2xl px-4 py-2 text-sm font-semibold ${
                          autoEnabled ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-700'
                        }`}
                      >
                        {autoEnabled ? 'Auto active' : 'Auto off'}
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-xs uppercase text-gray-500">Payout preference</label>
                      <div className="mt-2 grid gap-2">
                        {[
                          { value: 'cash', label: 'Pay in cash / products' },
                          { value: 'social', label: 'Social-only (mint value)' }
                        ].map((option) => (
                          <label
                            key={option.value}
                            className={`flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-semibold ${
                              payoutMode === option.value
                                ? 'border-purple-500 bg-purple-50 text-purple-700'
                                : 'border-gray-200 text-gray-600'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`payout-${business.id}`}
                              value={option.value}
                              checked={payoutMode === option.value}
                              onChange={(event) =>
                                handlePayoutModeChange(business.id, event.target.value)
                              }
                            />
                            {option.label}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs uppercase text-gray-500">
                        Social multiple
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="0.1"
                        disabled={payoutMode !== 'social'}
                        value={payoutMode === 'social' ? socialMultiple : 1}
                        onChange={(event) =>
                          handleSocialMultipleChange(business.id, event.target.value)
                        }
                        className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-2 focus:border-purple-500 focus:outline-none disabled:bg-gray-100"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        How much higher the coin trades vs underlying dollars when paying with social value.
                      </p>
                    </div>
                  </div>

                  {socialBandRange && (
                    <div className="mt-3 rounded-2xl bg-indigo-50 p-3 text-sm text-indigo-700">
                      <p>Social multiple applied: x{socialMultiple.toFixed(2)}</p>
                      <p>Suggested buy (social): ${socialBandRange.lower.toLocaleString()}</p>
                      <p>Suggested sell (social): ${socialBandRange.upper.toLocaleString()}</p>
                    </div>
                  )}

                  <button
                    onClick={() => handleSaveBandStrategy(business)}
                    className="mt-4 rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
                  >
                    Save bands
                  </button>
                </div>

                <div className="mt-6 rounded-2xl border border-blue-100 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-700">
                      Record NFC/online token transaction
                    </p>
                    {txStatus && (
                      <span
                        className={`text-xs font-semibold ${
                          txStatus.type === 'error' ? 'text-red-500' : 'text-blue-600'
                        }`}
                      >
                        {txStatus.message}
                      </span>
                    )}
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-gray-200 p-3">
                      <label className="text-xs uppercase text-gray-500">Channel</label>
                      <div className="mt-2 flex gap-3">
                        {['nfc', 'online'].map((option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => handleTransactionFieldChange(business.id, 'channel', option)}
                            className={`flex-1 rounded-2xl border px-3 py-2 text-sm font-semibold ${
                              txForm.channel === option
                                ? 'border-blue-500 bg-blue-50 text-blue-600'
                                : 'border-gray-200 text-gray-500'
                            }`}
                          >
                            {option.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs uppercase text-gray-500">Token amount</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={txForm.tokenAmount}
                        onChange={(event) =>
                          handleTransactionFieldChange(business.id, 'tokenAmount', event.target.value)
                        }
                        className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-2 focus:border-blue-500 focus:outline-none"
                        placeholder="25"
                      />
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="text-xs uppercase text-gray-500">Product type</label>
                      <select
                        value={txForm.productType}
                        onChange={(event) =>
                          handleTransactionFieldChange(business.id, 'productType', event.target.value)
                        }
                        className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-2 focus:border-blue-500 focus:outline-none"
                      >
                        <option value="product">Product</option>
                        <option value="service">Service</option>
                        <option value="event">Event</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs uppercase text-gray-500">Name</label>
                      <input
                        value={txForm.itemName}
                        onChange={(event) =>
                          handleTransactionFieldChange(business.id, 'itemName', event.target.value)
                        }
                        className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-2 focus:border-blue-500 focus:outline-none"
                        placeholder="Sunset dinner"
                      />
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="text-xs uppercase text-gray-500">Event date</label>
                      <input
                        type="date"
                        value={txForm.eventDate}
                        onChange={(event) =>
                          handleTransactionFieldChange(business.id, 'eventDate', event.target.value)
                        }
                        className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-2 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs uppercase text-gray-500">Tagged social post</label>
                      <input
                        value={txForm.socialPostUrl}
                        onChange={(event) =>
                          handleTransactionFieldChange(business.id, 'socialPostUrl', event.target.value)
                        }
                        className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-2 focus:border-blue-500 focus:outline-none"
                        placeholder="https://instagram.com/p/..."
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="text-xs uppercase text-gray-500">Notes / Description</label>
                    <textarea
                      value={txForm.description}
                      onChange={(event) =>
                        handleTransactionFieldChange(business.id, 'description', event.target.value)
                      }
                      rows={2}
                      className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-2 focus:border-blue-500 focus:outline-none"
                      placeholder="What was redeemed or delivered?"
                    />
                  </div>
                  <button
                    onClick={() => handleTransactionSubmit(business)}
                    className="mt-4 w-full rounded-2xl bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-500"
                  >
                    Record transaction & mint NFTs
                  </button>

                  {txHistory.length > 0 && (
                    <div className="mt-4 rounded-2xl bg-gray-50 p-3">
                      <p className="text-xs uppercase text-gray-500">Recent mints</p>
                      <div className="mt-2 space-y-2">
                        {txHistory.slice(0, 3).map((tx) => (
                          <div key={tx.id} className="rounded-2xl bg-white p-3 text-xs text-gray-600">
                            <p className="font-semibold text-gray-800">
                              {tx.itemName} · {tx.productType} · {tx.channel.toUpperCase()}
                            </p>
                            <p>Tokens: {tx.tokenAmount}</p>
                            {tx.socialPostUrl && (
                              <a
                                href={tx.socialPostUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-500"
                              >
                                Tagged post
                              </a>
                            )}
                            <p className="mt-1 text-gray-500">
                              Buyer NFT: {tx.buyerNft?.id || '—'} · Seller NFT: {tx.sellerNft?.id || '—'}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
            })}
          </div>
        </div>
      </section>
    </div>
  );
};

export default LocalBusinessVerification;
