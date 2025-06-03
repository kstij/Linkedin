import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Navbar from '@/components/Navbar';

interface AnalyticsStats {
  links: {
    total: number;
    available: number;
    used: number;
  };
  coupons: {
    total: number;
    claimed: number;
    active: number;
    expired: number;
  };
  recentActivity: {
    imports: number;
    generated: number;
    claims: number;
  };
}

export default function Analytics() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<AnalyticsStats>({
    links: { total: 0, available: 0, used: 0 },
    coupons: { total: 0, claimed: 0, active: 0, expired: 0 },
    recentActivity: { imports: 0, generated: 0, claims: 0 }
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/admin/login');
    } else if (status === 'authenticated') {
      fetchStats();
    }
  }, [status]);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/analytics/stats');
      if (!response.ok) throw new Error('Failed to fetch stats');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  return (
    <>
      <Head>
        <title>Analytics - LinkedIn Premium</title>
      </Head>
      <div className="min-h-screen bg-gray-100">
        <Navbar />
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {/* Links Statistics */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Links Statistics</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-500">Total Links</div>
                <div className="text-2xl font-bold">{stats.links.total}</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-500">Available Links</div>
                <div className="text-2xl font-bold">{stats.links.available}</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-500">Used Links</div>
                <div className="text-2xl font-bold">{stats.links.used}</div>
              </div>
            </div>
          </div>

          {/* Coupons Statistics */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Coupons Statistics</h2>
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-500">Total Coupons</div>
                <div className="text-2xl font-bold">{stats.coupons.total}</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-500">Claimed Coupons</div>
                <div className="text-2xl font-bold">{stats.coupons.claimed}</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-500">Active Coupons</div>
                <div className="text-2xl font-bold">{stats.coupons.active}</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-500">Expired Coupons</div>
                <div className="text-2xl font-bold">{stats.coupons.expired}</div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Recent Activity (Last 7 Days)</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-500">Links Imported</div>
                <div className="text-2xl font-bold">{stats.recentActivity.imports}</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-500">Coupons Generated</div>
                <div className="text-2xl font-bold">{stats.recentActivity.generated}</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-500">Coupons Claimed</div>
                <div className="text-2xl font-bold">{stats.recentActivity.claims}</div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
} 