import { useState, useRef, useEffect } from 'react';

export default function RedeemForm({ initialCode = '' }: { initialCode?: string }) {
  const [couponCode, setCouponCode] = useState(initialCode);
  const [message, setMessage] = useState('');
  const [claimLink, setClaimLink] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Ensure couponCode updates if initialCode changes (e.g., after router is ready)
  useEffect(() => {
    setCouponCode(initialCode);
  }, [initialCode]);

  useEffect(() => {
    if (initialCode) {
      // If code is pre-filled, autofocus the button
      buttonRef.current?.focus();
    } else {
      // Otherwise, autofocus the input
      inputRef.current?.focus();
    }
  }, [initialCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    setClaimLink('');

    try {
      const response = await fetch('/api/coupons/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to redeem code');
      } else {
        setMessage(data.message || 'Coupon redeemed successfully!');
        setClaimLink(data.claimLink || data.token || '');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (claimLink) {
      await navigator.clipboard.writeText(claimLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (claimLink) {
      const blob = new Blob([claimLink], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'linkedin-premium-token.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-md">
      <h1 className="text-3xl font-extrabold text-center mb-2">LinkedIn Premium</h1>
      <p className="text-center text-gray-500 mb-6">Enter your coupon code to get your premium access</p>
      <label className="block text-gray-700 mb-2" htmlFor="couponCode">Coupon Code</label>
      <input
        id="couponCode"
        ref={inputRef}
        className="w-full px-4 py-3 rounded-md border border-gray-300 mb-6 text-lg text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={couponCode}
        onChange={e => setCouponCode(e.target.value)}
        placeholder="Enter your code"
      />
      <button
        ref={buttonRef}
        className="w-full bg-gray-900 text-white py-3 rounded-md text-lg font-semibold hover:bg-gray-800 transition"
        disabled={loading}
      >
        {loading ? 'Processing...' : 'Redeem Code'}
      </button>
      {message && (
        <div className="mt-4 text-center text-green-600">
          {message}
          {claimLink && (
            <div className="flex justify-center gap-4 mt-4">
              <button
                type="button"
                onClick={handleCopy}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-900"
              >
                Download
              </button>
            </div>
          )}
        </div>
      )}
      {error && <div className="mt-4 text-center text-red-600">{error}</div>}
    </form>
  );
} 