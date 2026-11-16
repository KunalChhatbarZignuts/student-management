'use client';

import * as React from 'react';
import Paper from '@mui/material/Paper';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import PersonIcon from '@mui/icons-material/Person';
import { LinkedChildDetail } from '../types';

interface ChildSelectorTabsProps {
  childrenList: LinkedChildDetail[];
  selectedIndex: number;
  onSelectChild: (index: number) => void;
}

export const ChildSelectorTabs: React.FC<ChildSelectorTabsProps> = ({
  childrenList,
  selectedIndex,
  onSelectChild,
}) => {
  if (childrenList.length <= 1) return null;

  return (
    <Paper sx={{ mb: 3, borderRadius: 2 }}>
      <Tabs
        value={selectedIndex}
        onChange={(_, val) => onSelectChild(val)}
        variant="scrollable"
        scrollButtons="auto"
      >
        {childrenList.map((child, idx) => (
          <Tab
            key={child.student_id || child.id || idx}
            label={`${child.first_name} ${child.last_name} (${child.student_code})`}
            icon={<PersonIcon />}
            iconPosition="start"
            sx={{ fontWeight: 600, py: 2 }}
          />
        ))}
      </Tabs>
    </Paper>
  );
};

