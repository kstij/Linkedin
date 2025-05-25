import { useState } from 'react';
import Head from 'next/head';

export default function Redeem() {
  const [code, setCode] = useState('');
  const [redeemLink, setRedeemLink] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setRedeemLink('');

    try {
      const response = await fetch('/api/coupons/redeem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to redeem code');
      }

      setRedeemLink(data.redeemLink);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Redeem LinkedIn Premium</title>
        <meta name="description" content="Redeem your LinkedIn Premium coupon code" />
      </Head>

      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Redeem LinkedIn Premium
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your coupon code below to get your LinkedIn Premium redeem link
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="code" className="block text-sm font-medium text-gray-700">
                  Coupon Code
                </label>
                <div className="mt-1">
                  <input
                    id="code"
                    name="code"
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                    placeholder="Enter your code"
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-md bg-red-50 p-4">
                  <div className="flex">
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">{error}</h3>
                    </div>
                  </div>
                </div>
              )}

              {redeemLink && (
                <div className="rounded-md bg-green-50 p-4">
                  <div className="flex">
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-green-800">
                        Your LinkedIn Premium redeem link:
                      </h3>
                      <div className="mt-2 text-sm text-green-700">
                        <a
                          href={redeemLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium underline hover:text-green-600"
                        >
                          {redeemLink}
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  {loading ? 'Redeeming...' : 'Redeem Code'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
} 