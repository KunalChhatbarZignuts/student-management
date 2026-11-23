'use client';

import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';

interface FormattedMessageContentProps {
  content: string;
  isUser?: boolean;
}

export default function FormattedMessageContent({ content, isUser }: FormattedMessageContentProps) {
  if (isUser) {
    return (
      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, color: '#ffffff' }}>
        {content}
      </Typography>
    );
  }

  // Parse lines into blocks (paragraphs, lists, tables, headers)
  const lines = content.split('\n');
  const blocks: React.ReactNode[] = [];
  let tableBuffer: string[] = [];

  const flushTable = (index: number) => {
    if (tableBuffer.length === 0) return;
    const rows = tableBuffer
      .filter((l) => l.trim().startsWith('|') && l.trim().endsWith('|'))
      .map((l) =>
        l
          .split('|')
          .slice(1, -1)
          .map((c) => c.trim())
      );

    if (rows.length >= 2) {
      const headers = rows[0];
      const dataRows = rows.slice(2); // Skip separator row (---|---|---)
      blocks.push(
        <TableContainer
          key={`table-${index}`}
          component={Paper}
          variant="outlined"
          sx={{ my: 1.5, borderRadius: 2, overflowX: 'auto', bgcolor: 'background.paper' }}
        >
          <Table size="small">
            <TableHead sx={{ bgcolor: 'action.hover' }}>
              <TableRow>
                {headers.map((h, hIdx) => (
                  <TableCell key={hIdx} sx={{ fontWeight: 700, fontSize: 13 }}>
                    {formatInline(h)}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {dataRows.map((row, rIdx) => (
                <TableRow key={rIdx} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                  {row.map((cell, cIdx) => (
                    <TableCell key={cIdx} sx={{ fontSize: 13 }}>
                      {formatInline(cell)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      );
    }
    tableBuffer = [];
  };

  lines.forEach((line, lineIdx) => {
    const trimmed = line.trim();

    // Table line
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      tableBuffer.push(trimmed);
      return;
    } else if (tableBuffer.length > 0) {
      flushTable(lineIdx);
    }

    // Headers
    if (trimmed.startsWith('### ')) {
      blocks.push(
        <Typography key={lineIdx} variant="subtitle2" fontWeight={800} color="primary.main" sx={{ mt: 1.5, mb: 0.5 }}>
          {formatInline(trimmed.replace('### ', ''))}
        </Typography>
      );
      return;
    }
    if (trimmed.startsWith('## ')) {
      blocks.push(
        <Typography key={lineIdx} variant="subtitle1" fontWeight={800} sx={{ mt: 2, mb: 0.5 }}>
          {formatInline(trimmed.replace('## ', ''))}
        </Typography>
      );
      return;
    }

    // Divider
    if (trimmed === '---') {
      blocks.push(<Box key={lineIdx} sx={{ borderBottom: 1, borderColor: 'divider', my: 1.5 }} />);
      return;
    }

    // Bullet lists
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      blocks.push(
        <Box key={lineIdx} sx={{ display: 'flex', gap: 1, my: 0.3, pl: 0.5 }}>
          <Typography component="span" sx={{ color: 'primary.main', fontWeight: 700 }}>
            •
          </Typography>
          <Typography variant="body2" component="span" sx={{ lineHeight: 1.6 }}>
            {formatInline(trimmed.substring(2))}
          </Typography>
        </Box>
      );
      return;
    }

    // Empty lines
    if (trimmed === '') {
      blocks.push(<Box key={lineIdx} sx={{ height: 6 }} />);
      return;
    }

    // Standard paragraph
    blocks.push(
      <Typography key={lineIdx} variant="body2" sx={{ lineHeight: 1.65, mb: 0.5 }}>
        {formatInline(line)}
      </Typography>
    );
  });

  if (tableBuffer.length > 0) {
    flushTable(lines.length);
  }

  return <Box sx={{ display: 'flex', flexDirection: 'column' }}>{blocks}</Box>;
}

function formatInline(text: string): React.ReactNode {
  // Regex replacements for **bold**, `code`, etc.
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let keyCounter = 0;

  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*(.*?)\*\*/);
    const codeMatch = remaining.match(/`(.*?)`/);

    let firstMatchIndex = Infinity;
    let matchType: 'bold' | 'code' | null = null;
    let fullMatch = '';
    let innerText = '';

    if (boldMatch && boldMatch.index !== undefined && boldMatch.index < firstMatchIndex) {
      firstMatchIndex = boldMatch.index;
      matchType = 'bold';
      fullMatch = boldMatch[0];
      innerText = boldMatch[1];
    }

    if (codeMatch && codeMatch.index !== undefined && codeMatch.index < firstMatchIndex) {
      firstMatchIndex = codeMatch.index;
      matchType = 'code';
      fullMatch = codeMatch[0];
      innerText = codeMatch[1];
    }

    if (matchType && firstMatchIndex !== Infinity) {
      if (firstMatchIndex > 0) {
        parts.push(remaining.substring(0, firstMatchIndex));
      }
      if (matchType === 'bold') {
        parts.push(
          <strong key={keyCounter++} style={{ fontWeight: 700 }}>
            {innerText}
          </strong>
        );
      } else if (matchType === 'code') {
        parts.push(
          <Box
            component="span"
            key={keyCounter++}
            sx={{
              px: 0.8,
              py: 0.2,
              borderRadius: 1,
              bgcolor: 'action.selected',
              fontFamily: 'monospace',
              fontSize: '0.85em',
            }}
          >
            {innerText}
          </Box>
        );
      }
      remaining = remaining.substring(firstMatchIndex + fullMatch.length);
    } else {
      parts.push(remaining);
      break;
    }
  }

  return parts;
}
