import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import { PlusIcon, ArrowRightOnRectangleIcon, ClockIcon, CalendarIcon, TrashIcon } from '@heroicons/react/24/solid';
import Head from 'next/head';
import { saveAs } from 'file-saver';
import Navbar from '@/components/Navbar';
import { GetServerSideProps } from 'next';
import { getSession } from 'next-auth/react';

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
  source?: 'imported' | 'added';
}

interface DashboardStats {
  totalLinks: number;
  availableLinks: number;
  totalCoupons: number;
  activeCoupons: number;
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

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getSession(context);

  if (!session) {
    return {
      redirect: {
        destination: '/admin/login',
        permanent: false,
      },
    };
  }

  return {
    props: {
      session,
    },
  };
};

export default function AdminDashboard() {
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
  const [bulkLoading, setBulkLoading] = useState(false);
  const [newLink, setNewLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [dateRange, setDateRange] = useState<'today' | 'yesterday' | 'last7days' | 'last30days' | 'custom'>('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [stats, setStats] = useState<DashboardStats>({ totalLinks: 0, availableLinks: 0, totalCoupons: 0, activeCoupons: 0 });
  const [showCouponPopup, setShowCouponPopup] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');

  useEffect(() => {
    console.log('Session status:', status);
    console.log('Session data:', session);

    if (status === 'unauthenticated') {
      console.log('User is not authenticated, redirecting to login...');
      router.push('/admin/login');
    } else if (status === 'authenticated') {
      console.log('User is authenticated, fetching coupons...');
      fetchCoupons();
      fetchStats();
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

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/links/stats');
      if (!response.ok) throw new Error('Failed to fetch stats');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleAddCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Split the input by newlines and filter out empty lines
      const links = claimLink.split('\n').map(l => l.trim()).filter(Boolean);
      
      if (links.length === 0) {
        throw new Error('Please enter at least one link');
      }

      // If only one link, use the single coupon endpoint
      if (links.length === 1) {
        const response = await fetch('/api/coupons', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ 
            claimLink: links[0], 
            name, 
            daysUntilExpiry: parseInt(daysUntilExpiry),
            source: 'added'
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to add coupon');
        }

        const newCoupon = await response.json();
        // Generate claimLink in the format http://localhost:3000/redeem/{code}
        newCoupon.claimLink = `http://localhost:3000/redeem/${newCoupon.code}`;
        setCoupons([newCoupon, ...coupons]);
        setSuccess('Coupon added successfully!');
        setGeneratedCode(newCoupon.code);
        setShowCouponPopup(true);
      } else {
        // If multiple links, use the bulk endpoint
        const response = await fetch('/api/coupons/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ 
            links, 
            name, 
            daysUntilExpiry: parseInt(daysUntilExpiry),
            source: 'imported'
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to add bulk coupons');
        }

        const newCoupons = await response.json();
        // Generate claimLink for each coupon
        newCoupons.forEach((coupon: Coupon) => {
          coupon.claimLink = `http://localhost:3000/redeem/${coupon.code}`;
        });
        setCoupons([...newCoupons, ...coupons]);
        setSuccess(`${links.length} coupons added successfully!`);

        // Automatically download codes as text file
        const codes = newCoupons.map((coupon: Coupon) => coupon.code).join('\n');
        const blob = new Blob([codes], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `linkedin-premium-codes-${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      setClaimLink('');
      setName('');
      setDaysUntilExpiry('2');
      setTimeout(() => setSuccess(''), 3000);
      fetchStats();
    } catch (error) {
      console.error('Error adding coupon(s):', error);
      setError(error instanceof Error ? error.message : 'Failed to add coupon(s)');
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

  // Add date filtering function
  const getFilteredCouponsByDate = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const last7Days = new Date(today);
    last7Days.setDate(last7Days.getDate() - 7);
    const last30Days = new Date(today);
    last30Days.setDate(last30Days.getDate() - 30);

    return filteredCoupons.filter(coupon => {
      const couponDate = new Date(coupon.createdAt);
      
      if (dateRange === 'today') {
        return couponDate >= today;
      }
      if (dateRange === 'yesterday') {
        return couponDate >= yesterday && couponDate < today;
      }
      if (dateRange === 'last7days') {
        return couponDate >= last7Days;
      }
      if (dateRange === 'last30days') {
        return couponDate >= last30Days;
      }
      if (dateRange === 'custom') {
        const start = new Date(customStartDate);
        const end = new Date(customEndDate);
        end.setHours(23, 59, 59, 999);
        return couponDate >= start && couponDate <= end;
      }
      return true;
    });
  };

  // Update copy function to use date filter
  const copyFilteredCodes = async () => {
    const dateFilteredCoupons = getFilteredCouponsByDate();
    const codes = dateFilteredCoupons.map(coupon => coupon.code).join('\n');
    await navigator.clipboard.writeText(codes);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // CSV Export function
  const exportToCSV = () => {
    const headers = [
      'Code', 'Recipient', 'Status', 'Expiration Status', 'Time Remaining', 'Created At', 'Expires At', 'Claimed At', 'Claimed By IP', 'Claimed By UserAgent', 'Source'
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
      coupon.claimedBy?.userAgent || '',
      coupon.source === 'imported' ? (
        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">Imported</span>
      ) : (
        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">Added</span>
      )
    ]);
    const csvContent = [headers, ...rows].map(e => e.map(x => `"${String(x).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'coupons.csv');
  };

  // Delete coupon handler
  const handleDeleteCoupon = async (couponId: string) => {
    if (!window.confirm('Are you sure you want to delete this coupon?')) return;
    try {
      const response = await fetch('/api/coupons/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ couponId }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete coupon');
      }
      setCoupons(coupons.filter(c => c._id !== couponId));
      setSuccess('Coupon deleted successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete coupon');
    }
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
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      </Head>
      <div className="min-h-screen bg-gray-100">
        <Navbar />

        {/* Summary Cards */}
        <div className="bg-gray-200 py-3 sm:py-6 border-b border-gray-300">
          <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-4 px-2">
            {[
              { label: 'DASHBOARD', filter: 'all', count: null },
              { label: 'Claimed', filter: 'claimed', count: claimedCount },
              { label: 'Unclaimed', filter: 'unclaimed', count: unclaimedCount },
              { label: 'Expired', filter: 'expired', count: expiredCount },
              { label: 'Extended', filter: 'extended', count: extendedCount },
            ].map(card => (
              <button
                key={card.label}
                className={`w-full bg-white rounded-lg sm:rounded-xl shadow flex flex-col items-center justify-center py-3 sm:py-6 px-2 focus:outline-none transition border-2 ${filter === card.filter ? 'border-gray-900 shadow-lg scale-105' : 'border-gray-200'} hover:shadow-lg hover:scale-105`}
                onClick={() => setFilter(card.filter as any)}
              >
                <span className="text-sm sm:text-base font-semibold text-gray-800 mb-1">{card.label}</span>
                {card.count !== null && <span className="text-lg sm:text-xl font-bold text-gray-900">{card.count}</span>}
              </button>
            ))}
          </div>
        </div>

        <main className="max-w-7xl mx-auto py-4 sm:py-6 px-3 sm:px-6 lg:px-8">
          {/* Add Coupon Form */}
          <div className="bg-white shadow rounded-lg p-6 mb-6 border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Add New Coupon</h2>
            <form onSubmit={handleAddCoupon} className="space-y-5">
              <div>
                <label htmlFor="claimLink" className="block text-sm font-semibold text-gray-700 mb-1">
                  LinkedIn Premium Claim Link(s)
                </label>
                <textarea
                  id="claimLink"
                  value={claimLink}
                  onChange={(e) => setClaimLink(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/30 p-3 text-sm shadow-sm transition placeholder-gray-400"
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-1">
                    Seller Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/30 p-3 text-sm shadow-sm transition"
                  />
                </div>
                <div>
                  <label htmlFor="daysUntilExpiry" className="block text-sm font-semibold text-gray-700 mb-1">
                    Days Until Expiry
                  </label>
                  <input
                    type="number"
                    id="daysUntilExpiry"
                    value={daysUntilExpiry}
                    onChange={(e) => setDaysUntilExpiry(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/30 p-3 text-sm shadow-sm transition"
                    min="1"
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-white font-semibold shadow hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-primary/40 transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <PlusIcon className="h-5 w-5" />
                  {loading ? 'Adding...' : 'Add Coupon(s)'}
                </button>
              </div>
            </form>
            {error && (
              <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            {success && (
              <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-green-50 border border-green-200 rounded-md">
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
          <div className="bg-white shadow-lg rounded-xl overflow-hidden">
            <div className="px-3 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Coupon List</h2>
                <div className="w-full sm:w-auto flex gap-2">
                  <button
                    onClick={copyFilteredCodes}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center px-3 sm:px-4 py-2 border border-gray-400 text-sm font-medium rounded-md text-gray-900 bg-white hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 shadow"
                  >
                    {copied ? 'Copied!' : 'Copy Codes'}
                  </button>
                  <button
                    onClick={exportToCSV}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center px-3 sm:px-4 py-2 border border-gray-400 text-sm font-medium rounded-md text-gray-900 bg-white hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 shadow"
                  >
                    Export CSV
                  </button>
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <div className="inline-block min-w-full align-middle">
                <table className="min-w-full divide-y divide-gray-200 rounded-xl overflow-hidden text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-left font-semibold text-gray-700 uppercase tracking-wider">S. No.</th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-left font-semibold text-gray-700 uppercase tracking-wider">Code</th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-left font-semibold text-gray-700 uppercase tracking-wider">Seller</th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-left font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-left font-semibold text-gray-700 uppercase tracking-wider">Exp. Status</th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-left font-semibold text-gray-700 uppercase tracking-wider">Time Left</th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-left font-semibold text-gray-700 uppercase tracking-wider">Created</th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-left font-semibold text-gray-700 uppercase tracking-wider">Expires</th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-left font-semibold text-gray-700 uppercase tracking-wider">Claimed</th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-left font-semibold text-gray-700 uppercase tracking-wider">Claimed By</th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {getFilteredCouponsByDate().map((coupon, idx) => (
                      <tr key={coupon._id} className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-gray-700 font-semibold">{idx + 1}</td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 whitespace-nowrap font-mono font-medium text-gray-900">{coupon.code}</td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 whitespace-nowrap">{coupon.name}</td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 whitespace-nowrap">{getStatusBadge(coupon)}</td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 whitespace-nowrap">{getExpirationStatus(coupon, handleExtendClick)}</td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-gray-600">{getTimeRemaining(coupon.expiresAt)}</td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-gray-500">{formatDate(coupon.createdAt)}</td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-gray-500">{formatDate(coupon.expiresAt)}</td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-gray-500">{formatDate(coupon.claimedAt)}</td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-gray-500">
                          {coupon.claimedBy ? (
                            <div>
                              <div className="font-medium">IP: {coupon.claimedBy.ip}</div>
                              <div className="text-xs text-gray-400 truncate max-w-xs">{coupon.claimedBy.userAgent}</div>
                            </div>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                          {coupon.source === 'imported' ? (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">Imported</span>
                          ) : (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">Added</span>
                          )}
                        </td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-center">
                          <button
                            onClick={() => handleDeleteCoupon(coupon._id)}
                            className="text-red-600 hover:text-red-900 p-1 rounded"
                            title="Delete Coupon"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Coupon Code Popup */}
      {showCouponPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
            <button className="absolute top-2 right-2 text-gray-500 hover:text-gray-700" onClick={() => setShowCouponPopup(false)}>&times;</button>
            <h2 className="text-lg font-bold mb-4">Generated Coupon Code</h2>
            <div className="break-words text-gray-800">
              {generatedCode}
            </div>
          </div>
        </div>
      )}
    </>
  );
} 