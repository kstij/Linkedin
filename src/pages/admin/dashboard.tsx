import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import { PlusIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/solid';
import Head from 'next/head';

interface Coupon {
  _id: string;
  code: string;
  claimLink: string;
  isClaimed: boolean;
  claimedAt: string | null;
  claimedBy: {
    ip: string;
    userAgent: string;
  } | null;
  createdAt: string;
  createdBy: string;
}

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [claimLink, setClaimLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      console.log('Adding new coupon with link:', claimLink);
      const response = await fetch('/api/coupons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ claimLink: claimLink }),
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
    } catch (error) {
      console.error('Error in handleAddCoupon:', error);
      setError(error instanceof Error ? error.message : 'Failed to add coupon');
    } finally {
      setLoading(false);
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
      </Head>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            <button
              onClick={handleSignOut}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <ArrowRightOnRectangleIcon className="h-5 w-5 mr-2" />
              Sign Out
            </button>
          </div>
        </header>

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
            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
          </div>

          {/* Coupons List */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Coupon List</h2>
            </div>
            {coupons.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                No coupons found. Add your first coupon above.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Code
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created At
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        CLAIMED AT
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        CLAIMED BY
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {coupons.map((coupon) => (
                      <tr key={coupon._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          <code className="px-2 py-1 bg-gray-100 rounded">{coupon.code}</code>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {coupon.isClaimed ? (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                              Claimed
                            </span>
                          ) : (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              Available
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(coupon.createdAt).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {coupon.claimedAt ? new Date(coupon.claimedAt).toLocaleString() : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {coupon.claimedBy ? (
                            <div>
                              <div className="font-medium">IP: {coupon.claimedBy.ip}</div>
                              <div className="text-xs text-gray-400 truncate max-w-xs">
                                {coupon.claimedBy.userAgent}
                              </div>
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