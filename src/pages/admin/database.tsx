import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Navbar from '@/components/Navbar';
import { saveAs } from 'file-saver';

interface DatabaseStats {
  totalLinks: number;
  availableLinks: number;
}

export default function Database() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<DatabaseStats>({ totalLinks: 0, availableLinks: 0 });
  const [links, setLinks] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [count, setCount] = useState('100');
  const [daysUntilExpiry, setDaysUntilExpiry] = useState('2');
  const [sellerName, setSellerName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCouponPopup, setShowCouponPopup] = useState(false);
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/admin/login');
    } else if (status === 'authenticated') {
      fetchStats();
    }
  }, [status]);

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

  const handleImportLinks = async () => {
    if (!links.trim()) {
      setError('Please enter at least one link');
      return;
    }
    setIsImporting(true);
    setError('');
    setSuccess('');
    try {
      const linkArray = links
        .split('\n')
        .map(link => link.trim())
        .filter(link => link.length > 0);
      const response = await fetch('/api/links/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ links: linkArray }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to import links');
      }
      const data = await response.json();
      setLinks('');
      setSuccess(`Successfully imported ${data.count} links`);
      fetchStats();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to import links');
    } finally {
      setIsImporting(false);
    }
  };

  const handleGenerateCoupons = async () => {
    if (!count || !daysUntilExpiry) {
      setError('Please fill in all required fields');
      return;
    }
    setIsGenerating(true);
    setError('');
    setSuccess('');
    try {
      const response = await fetch('/api/links/generate-coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          count: parseInt(count),
          daysUntilExpiry: parseInt(daysUntilExpiry),
          sellerName: sellerName || 'general'
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate coupons');
      }
      const data = await response.json();
      setSuccess(`Successfully generated ${data.count} coupons`);
      setGeneratedCodes(data.coupons.map((c: any) => c.code));
      setShowCouponPopup(true);
      fetchStats();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to generate coupons');
    } finally {
      setIsGenerating(false);
    }
  };

  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  return (
    <>
      <Head>
        <title>Database - LinkedIn Premium</title>
      </Head>
      <div className="min-h-screen bg-gray-100">
        <Navbar />
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {/* Stats Section */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Database Statistics</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-500">Total Links in Backup</div>
                <div className="text-2xl font-bold">{stats.totalLinks}</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-500">Available Links for Coupons</div>
                <div className="text-2xl font-bold">{stats.availableLinks}</div>
              </div>
            </div>
          </div>

          {/* Import Links Section */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Import Links</h2>
            <div className="space-y-4">
              <textarea
                value={links}
                onChange={(e) => setLinks(e.target.value)}
                placeholder="Paste your links here (one per line)"
                rows={8}
                className="w-full border rounded-lg p-2"
              />
              <button
                onClick={handleImportLinks}
                disabled={isImporting}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isImporting ? 'Importing...' : 'Import Links'}
              </button>
            </div>
          </div>

          {/* Generate Coupons Section */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Generate Coupons</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Number of Coupons</label>
                <input
                  type="number"
                  value={count}
                  onChange={(e) => setCount(e.target.value)}
                  className="mt-1 block w-full border rounded-lg p-2"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Days Until Expiry</label>
                <input
                  type="number"
                  value={daysUntilExpiry}
                  onChange={(e) => setDaysUntilExpiry(e.target.value)}
                  className="mt-1 block w-full border rounded-lg p-2"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Seller Name</label>
                <input
                  type="text"
                  value={sellerName}
                  onChange={(e) => setSellerName(e.target.value)}
                  className="mt-1 block w-full border rounded-lg p-2"
                  placeholder="Enter seller name"
                />
              </div>
              <button
                onClick={handleGenerateCoupons}
                disabled={isGenerating}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {isGenerating ? 'Generating...' : 'Generate Coupons'}
              </button>
            </div>
          </div>

          {/* Messages */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg">
              {error}
            </div>
          )}
          {success && (
            <div className="mt-4 p-4 bg-green-50 text-green-700 rounded-lg">
              {success}
            </div>
          )}

          {/* Coupon Codes Popup */}
          {showCouponPopup && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
              <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
                <button className="absolute top-2 right-2 text-gray-500 hover:text-gray-700" onClick={() => setShowCouponPopup(false)}>&times;</button>
                <h2 className="text-lg font-bold mb-4">Generated Coupon Code{generatedCodes.length > 1 ? 's' : ''}</h2>
                <div className="break-words text-gray-800">
                  {generatedCodes.join(', ')}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
} 