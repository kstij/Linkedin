import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import { PlusIcon, ArrowRightOnRectangleIcon, ClockIcon } from '@heroicons/react/24/solid';
import Head from 'next/head';
import { saveAs } from 'file-saver';

interface Coupon {
  _id: string;
  code: string;
  claimLink: string;
  name: string;
  isClaimed: boolean;
  claimedAt: string | null;
  claimedBy: {
    ip: string;
    userAgent: string;
  } | null;
  createdAt: string;
  expiresAt: string;
  createdBy: string;
}

const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleString();
  } catch (error) {
    console.error('Error formatting date:', error);
    return '-';
  }
};

const getTimeRemaining = (expiresAt: string) => {
  try {
    const expiryDate = new Date(expiresAt);
    const now = new Date();
    const diff = expiryDate.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expired';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days}d ${hours}h remaining`;
    if (hours > 0) return `${hours}h ${minutes}m remaining`;
    return `${minutes}m remaining`;
  } catch (error) {
    console.error('Error calculating time remaining:', error);
    return '-';
  }
};

const getExpirationStatus = (coupon: Coupon, onExtend: (coupon: Coupon) => void) => {
  const now = new Date();
  const expiryDate = new Date(coupon.expiresAt);
  
  if (expiryDate < now) {
    return (
      <div className="flex items-center space-x-2">
        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
          Expired
        </span>
        {!coupon.isClaimed && (
          <button
            onClick={() => onExtend(coupon)}
            className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <ClockIcon className="h-4 w-4 mr-1" />
            Extend
          </button>
        )}
      </div>
    );
  }
  
  const diff = expiryDate.getTime() - now.getTime();
  const daysRemaining = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (daysRemaining <= 1) {
    return (
      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
        Expiring Soon
      </span>
    );
  }
  
  return (
    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
      Active
    </span>
  );
};

const getStatusBadge = (coupon: Coupon) => {
  if (coupon.isClaimed) {
    return (
      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
        Claimed
      </span>
    );
  }
  
  return (
    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
      Available
    </span>
  );
};

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [claimLink, setClaimLink] = useState('');
  const [name, setName] = useState('');
  const [daysUntilExpiry, setDaysUntilExpiry] = useState('2');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [extendModalOpen, setExtendModalOpen] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [daysToAdd, setDaysToAdd] = useState('2');
  const [extendLoading, setExtendLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'claimed' | 'unclaimed' | 'expired' | 'extended'>('all');
  const [bulkLinks, setBulkLinks] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);

  useEffect(() => {
    console.log('Session status:', status);
    console.log('Session data:', session);

    if (status === 'unauthenticated') {
      console.log('User is not authenticated, redirecting to login...');
      router.push('/admin/login');
    } else if (status === 'authenticated') {
      console.log('User is authenticated, fetching coupons...');
      fetchCoupons();
    }
  }, [status, session]);

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push('/admin/login');
  };

  const fetchCoupons = async () => {
    try {
      console.log('Fetching coupons...');
      const response = await fetch('/api/coupons', {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to fetch coupons:', response.status, errorData);
        throw new Error(errorData.error || 'Failed to fetch coupons');
      }

      const data = await response.json();
      console.log('Coupons fetched successfully:', data);
      setCoupons(data);
    } catch (error) {
      console.error('Error in fetchCoupons:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch coupons');
    }
  };

  const handleAddCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log('Adding new coupon with link:', claimLink, 'name:', name, 'days until expiry:', daysUntilExpiry);
      const response = await fetch('/api/coupons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ claimLink, name, daysUntilExpiry: parseInt(daysUntilExpiry) }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to add coupon:', response.status, errorData);
        throw new Error(errorData.error || 'Failed to add coupon');
      }

      const newCoupon = await response.json();
      console.log('Coupon added successfully:', newCoupon);
      setCoupons([newCoupon, ...coupons]);
      setClaimLink('');
      setName('');
      setDaysUntilExpiry('2'); // Reset to default
      setSuccess('Coupon added successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error in handleAddCoupon:', error);
      setError(error instanceof Error ? error.message : 'Failed to add coupon');
    } finally {
      setLoading(false);
    }
  };

  const handleExtendClick = (coupon: Coupon) => {
    setSelectedCoupon(coupon);
    setExtendModalOpen(true);
  };

  const handleExtendCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCoupon) return;

    setExtendLoading(true);
    setError('');

    try {
      const response = await fetch('/api/coupons/extend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          couponId: selectedCoupon._id,
          daysToAdd: parseInt(daysToAdd)
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to extend coupon');
      }

      const { coupon } = await response.json();
      setCoupons(coupons.map(c => c._id === coupon._id ? coupon : c));
      setExtendModalOpen(false);
      setSelectedCoupon(null);
      setDaysToAdd('2');
      setSuccess('Coupon expiration extended successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error extending coupon:', error);
      setError(error instanceof Error ? error.message : 'Failed to extend coupon');
    } finally {
      setExtendLoading(false);
    }
  };

  // Bulk add handler
  const handleBulkAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setBulkLoading(true);
    setError('');
    setSuccess('');
    const links = bulkLinks.split('\n').map(l => l.trim()).filter(Boolean);
    if (links.length === 0) {
      setError('Please enter at least one link.');
      setBulkLoading(false);
      return;
    }
    try {
      const response = await fetch('/api/coupons/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ links, name, daysUntilExpiry: parseInt(daysUntilExpiry) }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to add bulk coupons');
      }
      const newCoupons = await response.json();
      setCoupons([...newCoupons, ...coupons]);
      setBulkLinks('');
      setSuccess('Bulk coupons added successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to add bulk coupons');
    } finally {
      setBulkLoading(false);
    }
  };

  // Calculate summary stats
  const claimedCount = coupons.filter(c => c.isClaimed).length;
  const unclaimedCount = coupons.filter(c => !c.isClaimed && new Date(c.expiresAt) > new Date()).length;
  const expiredCount = coupons.filter(c => new Date(c.expiresAt) < new Date() && !c.isClaimed).length;
  const extendedCount = 0; // Placeholder

  // Filtered coupons for table
  const filteredCoupons = coupons.filter(coupon => {
    if (filter === 'all') return true;
    if (filter === 'claimed') return coupon.isClaimed;
    if (filter === 'unclaimed') return !coupon.isClaimed && new Date(coupon.expiresAt) > new Date();
    if (filter === 'expired') return new Date(coupon.expiresAt) < new Date() && !coupon.isClaimed;
    if (filter === 'extended') return false; // Placeholder
    return true;
  });

  // CSV Export function
  const exportToCSV = () => {
    const headers = [
      'Code', 'Recipient', 'Status', 'Expiration Status', 'Time Remaining', 'Created At', 'Expires At', 'Claimed At', 'Claimed By IP', 'Claimed By UserAgent'
    ];
    const rows = filteredCoupons.map(coupon => [
      coupon.code,
      coupon.name,
      coupon.isClaimed ? 'Claimed' : 'Available',
      (() => {
        const now = new Date();
        const expiryDate = new Date(coupon.expiresAt);
        if (expiryDate < now) return 'Expired';
        const diff = expiryDate.getTime() - now.getTime();
        const daysRemaining = Math.floor(diff / (1000 * 60 * 60 * 24));
        if (daysRemaining <= 1) return 'Expiring Soon';
        return 'Active';
      })(),
      getTimeRemaining(coupon.expiresAt),
      formatDate(coupon.createdAt),
      formatDate(coupon.expiresAt),
      formatDate(coupon.claimedAt),
      coupon.claimedBy?.ip || '',
      coupon.claimedBy?.userAgent || ''
    ]);
    const csvContent = [headers, ...rows].map(e => e.map(x => `"${String(x).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'coupons.csv');
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Admin Dashboard - LinkedIn Premium Coupon</title>
      </Head>
      <div className="min-h-screen bg-gray-100">
        {/* Header */}
        <header className="bg-white shadow sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Admin Dashboard</h1>
            <button
              onClick={handleSignOut}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-900 bg-white hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 shadow"
            >
              <ArrowRightOnRectangleIcon className="h-5 w-5 mr-2" />
              Sign Out
            </button>
          </div>
        </header>

        {/* Summary Cards */}
        <div className="bg-gray-200 py-6 border-b border-gray-300">
          <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 px-2">
            {[
              { label: 'DASHBOARD', filter: 'all', count: null },
              { label: 'Claimed', filter: 'claimed', count: claimedCount },
              { label: 'Unclaimed', filter: 'unclaimed', count: unclaimedCount },
              { label: 'Expired', filter: 'expired', count: expiredCount },
              { label: 'Extended', filter: 'extended', count: extendedCount },
            ].map(card => (
              <button
                key={card.label}
                className={`w-full bg-white rounded-xl shadow flex flex-col items-center justify-center py-6 px-2 focus:outline-none transition border-2 ${filter === card.filter ? 'border-gray-900 shadow-lg scale-105' : 'border-gray-200'} hover:shadow-lg hover:scale-105`}
                onClick={() => setFilter(card.filter as any)}
              >
                <span className="text-base font-semibold text-gray-800 mb-1">{card.label}</span>
                {card.count !== null && <span className="text-xl font-bold text-gray-900">{card.count}</span>}
              </button>
            ))}
          </div>
        </div>

        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {/* Add Coupon Form */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Add New Coupon</h2>
            <form onSubmit={handleAddCoupon} className="space-y-4">
              <div>
                <label htmlFor="claimLink" className="block text-sm font-medium text-gray-700">
                  LinkedIn Premium Claim Link
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    id="claimLink"
                    value={claimLink}
                    onChange={(e) => setClaimLink(e.target.value)}
                    className="shadow-sm focus:ring-primary focus:border-primary block w-full sm:text-sm border-gray-300 rounded-md"
                    placeholder="https://www.linkedin.com/premium/..."
                    required
                  />
                </div>
              </div>
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Seller Name
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="shadow-sm focus:ring-primary focus:border-primary block w-full sm:text-sm border-gray-300 rounded-md"
                    placeholder="Seller name (optional)"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="daysUntilExpiry" className="block text-sm font-medium text-gray-700">
                  Days Until Expiry
                </label>
                <div className="mt-1">
                  <input
                    type="number"
                    id="daysUntilExpiry"
                    value={daysUntilExpiry}
                    onChange={(e) => setDaysUntilExpiry(e.target.value)}
                    className="shadow-sm focus:ring-primary focus:border-primary block w-full sm:text-sm border-gray-300 rounded-md"
                    min="1"
                    required
                  />
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  The coupon will expire after this many days
                </p>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  {loading ? 'Adding...' : 'Add Coupon'}
                </button>
              </div>
            </form>
            <div className="my-8 border-t border-gray-200"></div>
            <form onSubmit={handleBulkAdd} className="space-y-4">
              <label htmlFor="bulkLinks" className="block text-sm font-medium text-gray-700">
                Bulk Add LinkedIn Premium Claim Links (one per line)
              </label>
              <textarea
                id="bulkLinks"
                value={bulkLinks}
                onChange={e => setBulkLinks(e.target.value)}
                rows={5}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-gray-900 focus:border-gray-900 font-mono text-sm"
                placeholder="Paste multiple LinkedIn claim links here, one per line..."
              />
              <button
                type="submit"
                disabled={bulkLoading}
                className="inline-flex items-center px-4 py-2 border border-gray-400 text-sm font-medium rounded-md text-gray-900 bg-white hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 shadow"
              >
                {bulkLoading ? 'Adding...' : 'Add Bulk Coupons'}
              </button>
            </form>
            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            {success && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-600">{success}</p>
              </div>
            )}
          </div>

          {/* Extend Coupon Modal */}
          {extendModalOpen && selectedCoupon && (
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
              <div className="bg-white rounded-lg p-6 max-w-md w-full">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Extend Coupon Expiration</h3>
                <form onSubmit={handleExtendCoupon} className="space-y-4">
                  <div>
                    <label htmlFor="daysToAdd" className="block text-sm font-medium text-gray-700">
                      Days to Add
                    </label>
                    <div className="mt-1">
                      <input
                        type="number"
                        id="daysToAdd"
                        value={daysToAdd}
                        onChange={(e) => setDaysToAdd(e.target.value)}
                        className="shadow-sm focus:ring-primary focus:border-primary block w-full sm:text-sm border-gray-300 rounded-md"
                        min="1"
                        required
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setExtendModalOpen(false);
                        setSelectedCoupon(null);
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={extendLoading}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
                    >
                      {extendLoading ? 'Extending...' : 'Extend Expiration'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Coupons List */}
          <div className="bg-white shadow-lg rounded-xl overflow-hidden mt-8">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Coupon List</h2>
              <button
                onClick={exportToCSV}
                className="inline-flex items-center px-4 py-2 border border-gray-400 text-sm font-medium rounded-md text-gray-900 bg-white hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 shadow"
              >
                Export CSV
              </button>
            </div>
            {filteredCoupons.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                No coupons found for this filter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 rounded-xl overflow-hidden text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 uppercase tracking-wider">S. No.</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 uppercase tracking-wider">Code</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 uppercase tracking-wider">Seller</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 uppercase tracking-wider">Expiration Status</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 uppercase tracking-wider">Time Remaining</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 uppercase tracking-wider">Created At</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 uppercase tracking-wider">Expires At</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 uppercase tracking-wider">Claimed At</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 uppercase tracking-wider">Claimed By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredCoupons.map((coupon, idx) => (
                      <tr key={coupon._id} className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-700 font-semibold">{idx + 1}</td>
                        <td className="px-4 py-3 whitespace-nowrap font-mono font-medium text-gray-900">{coupon.code}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{coupon.name}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{getStatusBadge(coupon)}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{getExpirationStatus(coupon, handleExtendClick)}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-600">{getTimeRemaining(coupon.expiresAt)}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-500">{formatDate(coupon.createdAt)}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-500">{formatDate(coupon.expiresAt)}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-500">{formatDate(coupon.claimedAt)}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                          {coupon.claimedBy ? (
                            <div>
                              <div className="font-medium">IP: {coupon.claimedBy.ip}</div>
                              <div className="text-xs text-gray-400 truncate max-w-xs">{coupon.claimedBy.userAgent}</div>
                            </div>
                          ) : (
                            '-'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
} 