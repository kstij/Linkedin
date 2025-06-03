import { useRouter } from 'next/router';
import Head from 'next/head';

export default function RedeemCoupon() {
  const router = useRouter();
  const { code } = router.query;

  return (
    <>
      <Head>
        <title>Redeem Coupon - LinkedIn Premium</title>
      </Head>
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <h1 className="text-2xl font-bold text-center mb-4">Redeem Coupon</h1>
          {code ? (
            <p className="text-center text-gray-700">Coupon Code: {code}</p>
          ) : (
            <p className="text-center text-gray-700">No coupon code provided.</p>
          )}
        </div>
      </div>
    </>
  );
} 