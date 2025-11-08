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
import { auth, onAuthStateChanged } from '../firebase';
import {
  submitLocalBusinessApplication,
  subscribeToLocalBusinesses,
  updateLocalBusinessStatus
} from '../services/localBusinessService';

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

const LocalBusinessVerification = () => {
  const [formData, setFormData] = useState(emptyFormState);
  const [currentUser, setCurrentUser] = useState(() => auth.currentUser);
  const [businesses, setBusinesses] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [notesByBusinessId, setNotesByBusinessId] = useState({});
  const [statusAction, setStatusAction] = useState({ id: null, nextStatus: null });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => setCurrentUser(user));
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
      await submitLocalBusinessApplication(payload, currentUser);
      setFeedback({
        type: 'success',
        message: 'Business submitted for verification. We will review it shortly.'
      });
      setFormData(emptyFormState);
    } catch (error) {
      console.error('Error submitting business', error);
      setFeedback({
        type: 'error',
        message: 'Unable to submit at the moment. Please try again.'
      });
    } finally {
      setSubmitting(false);
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

          <div className="mt-6 space-y-4">
            {businesses.length === 0 && (
              <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-12 text-center text-sm text-gray-500">
                No submissions yet. Once businesses apply, they will appear here with their data.
              </div>
            )}

            {businesses.map((business) => (
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
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default LocalBusinessVerification;
