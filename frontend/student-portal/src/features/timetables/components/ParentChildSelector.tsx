'use client';

import * as React from 'react';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Avatar from '@mui/material/Avatar';
import CircularProgress from '@mui/material/CircularProgress';
import { LinkedChildDetail } from '@/features/parents/types';

interface ParentChildSelectorProps {
  childrenList?: LinkedChildDetail[];
  selectedChildId: string;
  onSelectChild: (id: string) => void;
  isLoading: boolean;
}

export const ParentChildSelector: React.FC<ParentChildSelectorProps> = ({
  childrenList,
  selectedChildId,
  onSelectChild,
  isLoading,
}) => {
  return (
    <Paper sx={{ mb: 3, p: 1.5, borderRadius: 2 }}>
      <Typography variant="caption" color="text.secondary" sx={{ px: 1, fontWeight: 600 }}>
        SELECT STUDENT / CHILD:
      </Typography>
      {isLoading ? (
        <CircularProgress size={24} sx={{ m: 1 }} />
      ) : (
        <Tabs
          value={selectedChildId || (childrenList && childrenList.length > 0 ? childrenList[0].id : false)}
          onChange={(_, val) => onSelectChild(val)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ mt: 0.5 }}
        >
          {childrenList?.map((child) => (
            <Tab
              key={child.id}
              value={child.id}
              icon={
                <Avatar
                  sx={{
                    width: 28,
                    height: 28,
                    fontSize: '0.8rem',
                    bgcolor: selectedChildId === child.id ? 'primary.main' : 'grey.400',
                  }}
                >
                  {child.first_name[0]}
                </Avatar>
              }
              iconPosition="start"
              label={`${child.first_name} ${child.last_name} (${child.class_name || 'Class'})`}
              sx={{ fontWeight: 600, textTransform: 'none' }}
            />
          ))}
        </Tabs>
      )}
    </Paper>
  );
};

