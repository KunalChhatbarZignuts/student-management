'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import TablePagination from '@mui/material/TablePagination';
import { SxProps, Theme } from '@mui/material/styles';

export interface DataTablePaginationProps {
  count: number;
  page: number;
  rowsPerPage: number;
  onPageChange: (newPage: number) => void;
  onRowsPerPageChange: (newRowsPerPage: number) => void;
  rowsPerPageOptions?: number[];
  sx?: SxProps<Theme>;
}

export default function DataTablePagination({
  count,
  page,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
  rowsPerPageOptions = [10, 25, 50, 100],
  sx,
}: DataTablePaginationProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        borderTop: '1px solid',
        borderColor: 'divider',
        px: 2,
        py: 0.5,
        ...sx,
      }}
    >
      <TablePagination
        component="div"
        count={count}
        page={page}
        onPageChange={(_, newPage) => onPageChange(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => onRowsPerPageChange(parseInt(e.target.value, 10))}
        rowsPerPageOptions={rowsPerPageOptions}
        sx={{
          '.MuiTablePagination-toolbar': {
            px: 0,
          },
        }}
      />
    </Box>
  );
}

