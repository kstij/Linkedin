import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';

interface Coupon {
  _id: string;
  code: string;
  claimLink: string;
  name: string;
  isClaimed: boolean;
  claimedAt: string | null;
  expiresAt: string;
  createdAt: string;
}

export default function CouponManager() {
  const { data: session } = useSession();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    claimLink: '',
    name: '',
    daysUntilExpiry: '',
  });

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    try {
      const response = await fetch('/api/coupons');
      if (!response.ok) throw new Error('Failed to fetch coupons');
      const data = await response.json();
      setCoupons(data);
    } catch (error) {
      toast.error('Failed to load coupons');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to create coupon');
      
      await fetchCoupons();
      setShowForm(false);
      setFormData({
        claimLink: '',
        name: '',
        daysUntilExpiry: '',
      });
      toast.success('Coupon created successfully');
    } catch (error) {
      toast.error('Failed to create coupon');
    }
  };

  if (loading) {
    return <div className="text-center">Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Coupon Management</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          {showForm ? 'Cancel' : 'Create New Coupon'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-8 p-4 border rounded">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-2">Claim Link</label>
              <input
                type="text"
                value={formData.claimLink}
                onChange={(e) => setFormData({ ...formData, claimLink: e.target.value })}
                className="w-full p-2 border rounded"
                placeholder="Enter claim link"
                required
              />
            </div>
            <div>
              <label className="block mb-2">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full p-2 border rounded"
                placeholder="Enter name (optional)"
              />
            </div>
            <div>
              <label className="block mb-2">Days Until Expiry</label>
              <input
                type="number"
                value={formData.daysUntilExpiry}
                onChange={(e) => setFormData({ ...formData, daysUntilExpiry: e.target.value })}
                className="w-full p-2 border rounded"
                placeholder="Enter days until expiry"
                min="1"
                required
              />
            </div>
          </div>
          <button
            type="submit"
            className="mt-4 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            Create Coupon
          </button>
        </form>
      )}

      <div className="grid gap-4">
        {coupons.map((coupon) => (
          <div key={coupon._id} className="border rounded p-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold">{coupon.code}</h3>
                <p className="text-gray-600">{coupon.name}</p>
                <p className="text-sm text-gray-500">
                  Claim Link: {coupon.claimLink}
                </p>
                <p className="text-sm text-gray-500">
                  Expires: {new Date(coupon.expiresAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center">
                <span
                  className={`px-2 py-1 rounded text-sm ${
                    coupon.isClaimed ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                  }`}
                >
                  {coupon.isClaimed ? 'Claimed' : 'Available'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 