import "../styles/paymentModal.css";
import type { PaymentStatus } from "../types/payment";

type Props = {
  open: boolean;
  status: PaymentStatus;
  onClose: () => void;
  onRetry: () => void;
};

const PaymentModal = ({ open, status, onClose, onRetry }: Props) => {
  if (!open || status === "idle") return null;

  return (
    <div className="payment-overlay">
      <div className="payment-modal">
        {status === "loading" && (
          <>
            <div className="spinner" />
            <h3>Redirecting to payment...</h3>
            <p>Please don’t refresh or close this page</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="success-icon">✓</div>
            <h3>Payment Successful</h3>
            <button className="primary-btn" onClick={onClose}>
              Continue
            </button>
          </>
        )}

        {status === "cancelled" && (
          <>
            <h3>Payment Cancelled</h3>
            <p>You closed the payment window.</p>
            <button className="primary-btn" onClick={onRetry}>
              Try Again
            </button>
          </>
        )}

        {status === "failed" && (
          <>
            <h3>Payment Failed</h3>
            <p>No money was deducted.</p>
            <button className="primary-btn" onClick={onRetry}>
              Retry Payment
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentModal;
