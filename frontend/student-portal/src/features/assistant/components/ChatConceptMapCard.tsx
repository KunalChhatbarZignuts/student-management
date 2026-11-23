'use client';

import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import CloseIcon from '@mui/icons-material/Close';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { ConceptMapNode, ConceptMapResponse } from '../types';

interface ChatConceptMapCardProps {
  data: ConceptMapResponse;
}

export const ChatConceptMapCard: React.FC<ChatConceptMapCardProps> = ({ data }) => {
  const [selectedNode, setSelectedNode] = useState<ConceptMapNode | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(1);

  const nodeMap = new Map<string, ConceptMapNode>();
  data.nodes.forEach((n) => nodeMap.set(n.id, n));

  const getNodeColor = (cat: string) => {
    switch (cat) {
      case 'root':
        return '#1976d2'; // Primary Blue
      case 'primary':
        return '#0288d1'; // Cyan Blue
      case 'secondary':
        return '#2e7d32'; // Forest Green
      default:
        return '#ed6c02'; // Amber
    }
  };

  const renderSvgMap = (scale: number) => {
    return (
      <svg
        viewBox="0 0 600 350"
        width="100%"
        height="100%"
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          transition: 'transform 0.2s ease',
        }}
      >
        {/* Render Edges */}
        {data.edges.map((edge, idx) => {
          const s = nodeMap.get(edge.source);
          const t = nodeMap.get(edge.target);
          if (!s || !t) return null;

          const midX = (s.x + t.x) / 2;
          const midY = (s.y + t.y) / 2;

          return (
            <g key={`edge-${idx}`}>
              <line
                x1={s.x}
                y1={s.y}
                x2={t.x}
                y2={t.y}
                stroke="#b0bec5"
                strokeWidth={2}
                strokeDasharray={s.category === 'root' ? 'none' : '4 2'}
              />
              {/* Relationship label */}
              <rect
                x={midX - 35}
                y={midY - 8}
                width={70}
                height={16}
                rx={4}
                fill="#ffffff"
                stroke="#cfd8dc"
                strokeWidth={1}
              />
              <text
                x={midX}
                y={midY + 4}
                textAnchor="middle"
                fontSize={9}
                fill="#546e7a"
                fontWeight={600}
              >
                {edge.relationship}
              </text>
            </g>
          );
        })}

        {/* Render Nodes */}
        {data.nodes.map((node) => {
          const isSelected = selectedNode?.id === node.id;
          const color = getNodeColor(node.category);
          const radius = node.category === 'root' ? 32 : node.category === 'primary' ? 26 : 22;

          return (
            <g
              key={node.id}
              data-testid={`node-${node.id}`}
              onClick={() => setSelectedNode(node)}
              style={{ cursor: 'pointer' }}
            >
              <circle
                cx={node.x}
                cy={node.y}
                r={radius}
                fill={color}
                stroke={isSelected ? '#ffffff' : color}
                strokeWidth={isSelected ? 4 : 2}
                filter="drop-shadow(0px 2px 4px rgba(0,0,0,0.15))"
              />
              <text
                x={node.x}
                y={node.y + 4}
                textAnchor="middle"
                fontSize={node.category === 'root' ? 10 : 8}
                fill="#ffffff"
                fontWeight={700}
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                {node.label.length > 14 ? node.label.slice(0, 12) + '…' : node.label}
              </text>
            </g>
          );
        })}
      </svg>
    );
  };

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 3,
        border: '1.5px solid',
        borderColor: 'info.light',
        bgcolor: 'background.paper',
        maxWidth: 640,
        my: 1.5,
      }}
    >
      <CardContent sx={{ p: 2 }}>
        {/* Header */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <AccountTreeIcon color="info" fontSize="small" />
            <Typography variant="subtitle2" fontWeight={800} color="text.primary">
              Concept Map: {data.root_topic}
            </Typography>
          </Stack>

          <Stack direction="row" spacing={0.5} alignItems="center">
            <Chip
              label={data.subject}
              size="small"
              color="info"
              variant="outlined"
              sx={{ fontWeight: 700, fontSize: 11 }}
            />
            <Tooltip title="Expand Fullscreen">
              <IconButton size="small" onClick={() => setIsFullscreen(true)}>
                <FullscreenIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>

        <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
          {data.key_takeaway}
        </Typography>

        {/* Embedded SVG Viewport */}
        <Paper
          variant="outlined"
          sx={{
            height: 260,
            borderRadius: 2,
            bgcolor: 'grey.50',
            overflow: 'hidden',
            position: 'relative',
            p: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {renderSvgMap(1)}
        </Paper>

        {/* Selected Node Definition Callout */}
        {selectedNode ? (
          <Paper
            variant="outlined"
            sx={{
              p: 1.2,
              borderRadius: 2,
              borderColor: 'info.main',
              bgcolor: 'info.50',
              mt: 1.5,
            }}
          >
            <Typography variant="caption" fontWeight={700} color="info.dark" display="block">
              {selectedNode.label} ({selectedNode.category.toUpperCase()})
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {selectedNode.definition}
            </Typography>
          </Paper>
        ) : (
          <Typography variant="caption" color="text.secondary" display="block" mt={1} fontStyle="italic">
            💡 Click on any circle node to inspect its curriculum definition and scientific role.
          </Typography>
        )}

        {/* Fullscreen Modal Dialog */}
        <Dialog
          open={isFullscreen}
          onClose={() => setIsFullscreen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <AccountTreeIcon color="info" />
              <Typography variant="subtitle1" fontWeight={800}>
                Concept Map: {data.root_topic} ({data.subject})
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <IconButton size="small" onClick={() => setZoom((z) => Math.min(z + 0.2, 1.8))}>
                <ZoomInIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={() => setZoom((z) => Math.max(z - 0.2, 0.6))}>
                <ZoomOutIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={() => setZoom(1)}>
                <RestartAltIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={() => setIsFullscreen(false)}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Stack>
          </DialogTitle>
          <DialogContent dividers sx={{ height: 480, bgcolor: 'grey.50', overflow: 'hidden', p: 2 }}>
            {renderSvgMap(zoom)}
          </DialogContent>
          <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
            {selectedNode ? (
              <Typography variant="body2" color="text.primary">
                <strong>{selectedNode.label}:</strong> {selectedNode.definition}
              </Typography>
            ) : (
              <Typography variant="caption" color="text.secondary">
                Click any node in the map above to inspect its definition.
              </Typography>
            )}
            <Button onClick={() => setIsFullscreen(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
};
