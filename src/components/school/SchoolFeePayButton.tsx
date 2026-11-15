'use client';

import { useState } from 'react';

type CheckoutResponse = {
  keyId: string;
  orderId: string;
  amount: number;
  currency: string;
  name: string;
  prefill?: { name?: string; email?: string; contact?: string };
};

type RazorpayCheckout = {
  open: () => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayCheckout;
  }
}

function loadCheckoutScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-razorpay-checkout="true"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.dataset.razorpayCheckout = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Razorpay checkout failed to load'));
    document.body.appendChild(script);
  });
}

export default function SchoolFeePayButton({ invoiceId, label }: { invoiceId: number; label: string }) {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function pay() {
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/school/fee-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId, provider: 'RAZORPAY' }),
      });
      const payload = (await response.json()) as CheckoutResponse & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || 'Checkout could not start');
      }
      await loadCheckoutScript();
      if (!window.Razorpay) throw new Error('Razorpay checkout is unavailable');
      const checkout = new window.Razorpay({
        key: payload.keyId,
        amount: payload.amount,
        currency: payload.currency,
        name: payload.name,
        order_id: payload.orderId,
        prefill: payload.prefill,
        handler: () => {
          setMessage('Payment submitted. The invoice is marked paid after Razorpay confirms it.');
        },
      });
      checkout.open();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Payment failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => void pay()}
        disabled={busy}
        className="h-14 rounded-xl bg-green-100 hover:bg-green-200 px-6 font-semibold text-green-700 disabled:opacity-50"
      >
        {busy ? 'Starting checkout…' : label}
      </button>
      {message && <p className="mt-2 text-sm text-gray-700">{message}</p>}
    </div>
  );
}
