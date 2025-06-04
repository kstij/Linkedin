import { useRouter } from 'next/router';
import RedeemForm from '@/components/RedeemForm';

export default function RedeemCodePage() {
  const { code } = useRouter().query;
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <RedeemForm initialCode={typeof code === 'string' ? code : ''} />
    </div>
  );
} 