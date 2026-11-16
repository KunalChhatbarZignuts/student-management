import * as React from 'react';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';

export interface StudentFeeSummaryCardsProps {
  schedule: {
    net_payable_fee?: number | string | null;
    final_payable_amount?: number | string | null;
    total_annual_fee?: number | string | null;
    base_amount?: number | string | null;
    total_discount_concession?: number | string | null;
    total_discount?: number | string | null;
    total_paid?: number | string | null;
    total_paid_amount?: number | string | null;
    total_outstanding?: number | string | null;
    total_outstanding_amount?: number | string | null;
  };
}

export const StudentFeeSummaryCards: React.FC<StudentFeeSummaryCardsProps> = ({ schedule }) => {
  const totalPayable =
    Number(schedule.net_payable_fee ?? schedule.final_payable_amount) || 0;
  const baseAmount =
    Number(schedule.total_annual_fee ?? schedule.base_amount) || 0;
  const discountAmount =
    Number(schedule.total_discount_concession ?? schedule.total_discount) || 0;
  const totalPaid =
    Number(schedule.total_paid ?? schedule.total_paid_amount) || 0;
  const totalOutstanding =
    Number(schedule.total_outstanding ?? schedule.total_outstanding_amount) || 0;

  return (
    <Grid container spacing={2.5} sx={{ mb: 4 }}>
      <Grid item xs={12} sm={4}>
        <Card sx={{ height: '100%', borderLeft: 4, borderColor: 'primary.main' }}>
          <CardContent>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              TOTAL PAYABLE FEE
            </Typography>
            <Typography variant="h4" fontWeight={700} color="primary.main">
              ₹{totalPayable.toLocaleString()}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Base: ₹{baseAmount.toLocaleString()}
              {discountAmount > 0 && ` • Concessions: -₹${discountAmount.toLocaleString()}`}
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={4}>
        <Card sx={{ height: '100%', borderLeft: 4, borderColor: 'success.main' }}>
          <CardContent>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              SETTLED & PAID
            </Typography>
            <Typography variant="h4" fontWeight={700} color="success.main">
              ₹{totalPaid.toLocaleString()}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Confirmed with official receipts
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={4}>
        <Card
          sx={{
            height: '100%',
            borderLeft: 4,
            borderColor: totalOutstanding > 0 ? 'warning.main' : 'success.main',
          }}
        >
          <CardContent>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              OUTSTANDING BALANCE
            </Typography>
            <Typography
              variant="h4"
              fontWeight={700}
              color={totalOutstanding > 0 ? 'warning.main' : 'success.main'}
            >
              ₹{totalOutstanding.toLocaleString()}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {totalOutstanding > 0
                ? 'Due across scheduled installments'
                : totalPayable === 0 && totalPaid === 0
                ? 'No fee structure assigned for this session'
                : 'All installments fully paid!'}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

