
import type { Timestamp } from 'firebase/firestore';

type Investment = {
  status: 'Active' | 'Matured' | 'Stopped';
  investedAmount: number;
};

type Loan = {
  status: 'Active' | 'Due' | 'Completed' | 'Payment Pending';
  penalty?: number;
};

type Referral = {
  id: string;
  totalInvestment?: number;
};

// This is a simplified calculation. It can be made more complex.
export function calculateTrustScore(
  investments: Investment[] | null,
  loans: Loan[] | null,
  referrals: Referral[] | null
): number {
  let score = 500; // Start with a base score

  // Investment-based scoring
  if (investments) {
    const totalInvested = investments.reduce((sum, inv) => sum + inv.investedAmount, 0);
    const completedInvestments = investments.filter(inv => inv.status === 'Matured').length;
    const stoppedInvestments = investments.filter(inv => inv.status === 'Stopped').length;

    // Points for total investment amount
    score += Math.floor(totalInvested / 1000);

    // Points for completed investments
    score += completedInvestments * 20;

    // Penalty for stopped investments
    score -= stoppedInvestments * 10;
  }

  // Loan-based scoring
  if (loans) {
    const completedLoans = loans.filter(l => l.status === 'Completed').length;
    const dueLoans = loans.filter(l => l.status === 'Due' || (l.penalty || 0) > 0).length;

    // Points for successfully completed loans
    score += completedLoans * 50;

    // Heavy penalty for due loans or loans with penalties
    score -= dueLoans * 100;
  }
  
  // Referral-based scoring
  if (referrals) {
    // Points for each referral who has invested at least once
    const activeReferrals = referrals.filter(r => (r.totalInvestment || 0) > 0).length;
    score += activeReferrals * 25;
  }
  
  // Cap the score between 300 and 900
  return Math.max(300, Math.min(score, 900));
}
