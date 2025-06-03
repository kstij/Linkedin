import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { GetServerSideProps } from 'next';
import { getSession } from 'next-auth/react';
import Navbar from '@/components/Navbar';
import { PlusIcon, ArrowPathIcon } from '@heroicons/react/24/solid';

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

export default function ImportPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [links, setLinks] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [storedLinks, setStoredLinks] = useState<{ total: number; available: number }>({ total: 0, available: 0 });
  const [generateCount, setGenerateCount] = useState('10');
  const [sellerName, setSellerName] = useState('');
  const [daysUntilExpiry, setDaysUntilExpiry] = useState('30');
  const [generating, setGenerating] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/admin/login');
    }
  }, [status, router]);

  // Fetch stored links count
  const fetchStoredLinks = async () => {
    try {
      const response = await fetch('/api/links/stats', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setStoredLinks(data);
      }
    } catch (error) {
      console.error('Error fetching stored links:', error);
    }
  };

  // Fetch stats on component mount
  useEffect(() => {
    fetchStoredLinks();
  }, []);

  const handleImportLinks = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!links.trim()) {
      setError('Please paste some links');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const linksArray = links.split('\n').map(l => l.trim()).filter(Boolean);
      const response = await fetch('/api/links/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          links: linksArray,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to import links');
      }

      const data = await response.json();
      setSuccess(`${data.count} links imported successfully!`);
      setLinks('');
      fetchStoredLinks(); // Refresh stats
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error importing links:', error);
      setError(error instanceof Error ? error.message : 'Failed to import links');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCoupons = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!generateCount || parseInt(generateCount) <= 0) {
      setError('Please enter a valid number of coupons to generate');
      return;
    }

    setGenerating(true);
    setError('');

    try {
      const response = await fetch('/api/links/generate-coupons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          count: parseInt(generateCount),
          sellerName,
          daysUntilExpiry: parseInt(daysUntilExpiry),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate coupons');
      }

      const data = await response.json();
      setSuccess(`${data.count} coupons generated successfully!`);
      setGenerateCount('10');
      setSellerName('');
      setDaysUntilExpiry('30');
      fetchStoredLinks(); // Refresh stats
      setTimeout(() => setSuccess(''), 3000);

      // If more than 1 coupon is generated, fetch and download their codes
      if (data.count > 1) {
        const couponsRes = await fetch('/api/coupons', {
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });
        if (couponsRes.ok) {
          const coupons = await couponsRes.json();
          // Filter for the most recent imported coupons
          const imported = coupons.filter((c: any) => c.source === 'imported').slice(0, data.count);
          const codes = imported.map((c: any) => c.code).join('\n');
          const blob = new Blob([codes], { type: 'text/plain' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `linkedin-premium-codes-imported-${new Date().toISOString().split('T')[0]}.txt`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      }
    } catch (error) {
      console.error('Error generating coupons:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate coupons');
    } finally {
      setGenerating(false);
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
        <title>Import Links - LinkedIn Premium</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      </Head>
      <div className="min-h-screen bg-gray-100">
        <Navbar />

        <main className="max-w-7xl mx-auto py-4 sm:py-6 px-3 sm:px-6 lg:px-8">
          {/* Stats Card */}
          <div className="bg-white shadow rounded-lg p-4 sm:p-6 mb-4 sm:mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Stored Links</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Total: {storedLinks.total} | Available: {storedLinks.available}
                </p>
              </div>
              <button
                onClick={fetchStoredLinks}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                <ArrowPathIcon className="h-4 w-4 mr-2" />
                Refresh
              </button>
            </div>
          </div>

          {/* Import Links Form */}
          <div className="bg-white shadow rounded-lg p-6 mb-6 border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Import Links</h2>
            <form onSubmit={handleImportLinks} className="space-y-5">
              <div>
                <label htmlFor="links" className="block text-sm font-semibold text-gray-700 mb-1">
                  Paste Links
                </label>
                <textarea
                  id="links"
                  rows={5}
                  value={links}
                  onChange={(e) => setLinks(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/30 p-3 text-sm shadow-sm transition"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-white font-semibold shadow hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-primary/40 transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <PlusIcon className="h-5 w-5" />
                  {loading ? 'Importing...' : 'Import Links'}
                </button>
              </div>
            </form>
          </div>

          {/* Generate Coupons Form */}
          <div className="bg-white shadow rounded-lg p-6 border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Generate Coupons</h2>
            <form onSubmit={handleGenerateCoupons} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="generateCount" className="block text-sm font-semibold text-gray-700 mb-1">
                    Number of Coupons to Generate
                  </label>
                  <input
                    type="number"
                    id="generateCount"
                    value={generateCount}
                    onChange={(e) => setGenerateCount(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/30 p-3 text-sm shadow-sm transition"
                    min="1"
                    max={storedLinks.available}
                    required
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    Maximum {storedLinks.available} coupons can be generated from available links
                  </p>
                </div>
                <div>
                  <label htmlFor="sellerName" className="block text-sm font-semibold text-gray-700 mb-1">
                    Seller Name
                  </label>
                  <input
                    type="text"
                    id="sellerName"
                    value={sellerName}
                    onChange={(e) => setSellerName(e.target.value)}
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
                  disabled={generating || parseInt(generateCount) > storedLinks.available}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-white font-semibold shadow hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-primary/40 transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <PlusIcon className="h-5 w-5" />
                  {generating ? 'Generating...' : 'Generate Coupons'}
                </button>
              </div>
            </form>
          </div>

          {/* Messages */}
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
        </main>
      </div>
    </>
  );
} 