export interface AdminSummary {
  period: {
    from: string;
    to: string;
  };
  lockers: {
    total: number;
    byStatus: Record<string, number>;
  };
  rentals: {
    total: number;
    byStatus: Record<string, number>;
  };
  payments: {
    totalRevenue: number;
    totalPayments: number;
    revenueInRange: number;
    paymentsInRange: number;
  };
  charts: {
    revenueByDay: { date: string; revenue: number; payments: number }[];
    rentalsByDay: { date: string; rentals: number }[];
  };
}
