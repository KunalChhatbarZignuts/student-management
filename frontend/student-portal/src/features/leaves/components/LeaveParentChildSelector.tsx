'use client';

import * as React from 'react';
import Paper from '@mui/material/Paper';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import { LinkedChildDetail } from '@/features/parents/types';

interface LeaveParentChildSelectorProps {
  childrenList?: LinkedChildDetail[];
  selectedChildId: string;
  onSelectChild: (id: string) => void;
}

export const LeaveParentChildSelector: React.FC<LeaveParentChildSelectorProps> = ({
  childrenList,
  selectedChildId,
  onSelectChild,
}) => {
  if (!childrenList || childrenList.length <= 1) return null;

  return (
    <Paper sx={{ mb: 3, borderRadius: 2 }}>
      <Tabs
        value={selectedChildId}
        onChange={(_, val) => onSelectChild(val)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ px: 2, pt: 1 }}
      >
        {childrenList.map((child) => (
          <Tab
            key={child.id}
            value={child.id}
            label={`${child.first_name} ${child.last_name}`}
          />
        ))}
      </Tabs>
    </Paper>
  );
};

