export interface MonthlyComparison {
  month: string;
  labelPreviousYear: string;
  labelCurrentYear: string;
  usagePrevious: number;
  usageCurrent: number;
  tempPrevious: number;
  tempCurrent: number;
  dailyCostPrevious: number;
  dailyCostCurrent: number;
}

export interface BillData {
  customerName: string;
  customerFirstName: string;
  serviceAddress: string;
  meterNumber: string;
  accountNumber: string;
  amountDue: number;
  dueDate: string;
  supplyCharges: number;
  deliveryCharges: number;
  energyTip: string;
  priceToCompare: number;
  billMonth: string;
  amountComparisonSentence: string;
  energyTipSentence: string;
  monthlyComparison: MonthlyComparison;
  // Energy Saver Rank Fields
  energySaverRank: 'G.O.A.T.' | 'All-Star' | 'Pro' | 'Amateur';
  percentToNextLevel: number; // Percentage reduction needed to reach next level (0 if already at G.O.A.T.)
  nextRank: string; // Name of the next rank level (empty string if already at G.O.A.T.)
  rankDescription: string; // Description in Little Wins tone
  rankVisualPrompt: string; // Prompt for generating 3D AI rank image
}

export interface ParsedResponse {
  data: BillData | null;
  rawText?: string;
}