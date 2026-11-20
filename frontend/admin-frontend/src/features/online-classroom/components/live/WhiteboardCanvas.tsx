'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import CreateIcon from '@mui/icons-material/Create';
import HighlightIcon from '@mui/icons-material/Highlight';
import AutoFixNormalIcon from '@mui/icons-material/AutoFixNormal';
import TimelineIcon from '@mui/icons-material/Timeline';
import CropSquareIcon from '@mui/icons-material/CropSquare';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import TitleIcon from '@mui/icons-material/Title';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import DownloadIcon from '@mui/icons-material/Download';
import LockIcon from '@mui/icons-material/Lock';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import NoteAddIcon from '@mui/icons-material/NoteAdd';

export type WhiteboardTool = 'pen' | 'highlighter' | 'eraser' | 'line' | 'rectangle' | 'circle' | 'text';

export interface DrawStroke {
  tool: WhiteboardTool;
  color: string;
  size: number;
  points: { x: number; y: number }[];
  text?: string;
}

interface WhiteboardCanvasProps {
  isReadOnly?: boolean;
  onStrokeComplete?: (stroke: DrawStroke) => void;
  onClearBoard?: () => void;
  externalStrokes?: DrawStroke[];
  pageIndex?: number;
  totalPages?: number;
  onPageChange?: (newPage: number) => void;
  onAddPage?: () => void;
}

const PRESET_COLORS = [
  '#000000',
  '#1a73e8', // Blue
  '#ea4335', // Red
  '#34a853', // Green
  '#fbbc04', // Yellow
  '#a142f4', // Purple
  '#ff6d01', // Orange
  '#ffffff', // White
];

const PRESET_SIZES = [2, 5, 10, 18];

export default function WhiteboardCanvas({
  isReadOnly = false,
  onStrokeComplete,
  onClearBoard,
  externalStrokes = [],
  pageIndex = 0,
  totalPages = 1,
  onPageChange,
  onAddPage,
}: WhiteboardCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [activeTool, setActiveTool] = useState<WhiteboardTool>('pen');
  const [activeColor, setActiveColor] = useState<string>('#1a73e8');
  const [activeSize, setActiveSize] = useState<number>(5);

  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<{ x: number; y: number }[]>([]);

  // Undo / Redo history
  const [history, setHistory] = useState<DrawStroke[]>([]);
  const [redoStack, setRedoStack] = useState<DrawStroke[]>([]);
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);

  // Resize canvas to fill container
  const resizeCanvas = useCallback(() => {
    if (!containerRef.current || !canvasRef.current || !previewCanvasRef.current) return;
    const { width, height } = containerRef.current.getBoundingClientRect();
    if (width === 0 || height === 0) return;

    // Save content before resize
    const mainCtx = canvasRef.current.getContext('2d');
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvasRef.current.width;
    tempCanvas.height = canvasRef.current.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (tempCtx && mainCtx && canvasRef.current.width > 0) {
      tempCtx.drawImage(canvasRef.current, 0, 0);
    }

    canvasRef.current.width = width;
    canvasRef.current.height = height;
    previewCanvasRef.current.width = width;
    previewCanvasRef.current.height = height;

    // Restore background & drawings
    if (mainCtx) {
      mainCtx.fillStyle = '#ffffff';
      mainCtx.fillRect(0, 0, width, height);
      if (tempCanvas.width > 0) {
        mainCtx.drawImage(tempCanvas, 0, 0);
      }
    }
  }, []);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [resizeCanvas]);

  // Render a single stroke onto a 2D context
  const drawStrokeToContext = useCallback((ctx: CanvasRenderingContext2D, stroke: DrawStroke) => {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (stroke.tool === 'highlighter') {
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.size * 3;
    } else if (stroke.tool === 'eraser') {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = stroke.size * 3;
    } else {
      ctx.globalAlpha = 1.0;
      ctx.strokeStyle = stroke.color;
      ctx.fillStyle = stroke.color;
      ctx.lineWidth = stroke.size;
    }

    if (stroke.tool === 'pen' || stroke.tool === 'highlighter' || stroke.tool === 'eraser') {
      if (stroke.points.length < 2) {
        ctx.restore();
        return;
      }
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    } else if (stroke.tool === 'line') {
      if (stroke.points.length >= 2) {
        const start = stroke.points[0];
        const end = stroke.points[stroke.points.length - 1];
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
      }
    } else if (stroke.tool === 'rectangle') {
      if (stroke.points.length >= 2) {
        const start = stroke.points[0];
        const end = stroke.points[stroke.points.length - 1];
        const w = end.x - start.x;
        const h = end.y - start.y;
        ctx.strokeRect(start.x, start.y, w, h);
      }
    } else if (stroke.tool === 'circle') {
      if (stroke.points.length >= 2) {
        const start = stroke.points[0];
        const end = stroke.points[stroke.points.length - 1];
        const radiusX = Math.abs(end.x - start.x) / 2;
        const radiusY = Math.abs(end.y - start.y) / 2;
        const centerX = Math.min(start.x, end.x) + radiusX;
        const centerY = Math.min(start.y, end.y) + radiusY;
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else if (stroke.tool === 'text' && stroke.text) {
      if (stroke.points.length > 0) {
        ctx.font = `${Math.max(16, stroke.size * 3)}px sans-serif`;
        ctx.fillText(stroke.text, stroke.points[0].x, stroke.points[0].y);
      }
    }

    ctx.restore();
  }, []);

  // Redraw complete history on main canvas
  const redrawAll = useCallback(
    (strokes: DrawStroke[]) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      strokes.forEach((stroke) => drawStrokeToContext(ctx, stroke));
    },
    [drawStrokeToContext]
  );

  // Sync external incoming strokes (from WebSocket)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    [...history, ...(externalStrokes || [])].forEach((stroke) => drawStrokeToContext(ctx, stroke));
  }, [externalStrokes, history, drawStrokeToContext]);

  // Pointer event handlers
  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isReadOnly) return;
    const pt = getCanvasCoords(e);
    setIsDrawing(true);
    setCurrentPoints([pt]);

    if (activeTool === 'text') {
      const text = prompt('Enter text for whiteboard:');
      if (text) {
        const stroke: DrawStroke = {
          tool: 'text',
          color: activeColor,
          size: activeSize,
          points: [pt],
          text,
        };
        const nextHistory = [...history, stroke];
        setHistory(nextHistory);
        setRedoStack([]);
        redrawAll(nextHistory);
        onStrokeComplete?.(stroke);
      }
      setIsDrawing(false);
      setCurrentPoints([]);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || isReadOnly || activeTool === 'text') return;
    const pt = getCanvasCoords(e);
    const updatedPoints = [...currentPoints, pt];
    setCurrentPoints(updatedPoints);

    const previewCanvas = previewCanvasRef.current;
    if (!previewCanvas) return;
    const pCtx = previewCanvas.getContext('2d');
    if (!pCtx) return;

    // Clear preview overlay
    pCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);

    // Draw active stroke preview
    drawStrokeToContext(pCtx, {
      tool: activeTool,
      color: activeColor,
      size: activeSize,
      points: updatedPoints,
    });
  };

  const handlePointerUp = () => {
    if (!isDrawing || isReadOnly || activeTool === 'text') return;
    setIsDrawing(false);

    // Clear preview canvas
    const previewCanvas = previewCanvasRef.current;
    if (previewCanvas) {
      const pCtx = previewCanvas.getContext('2d');
      pCtx?.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    }

    if (currentPoints.length === 0) return;

    const stroke: DrawStroke = {
      tool: activeTool,
      color: activeColor,
      size: activeSize,
      points: currentPoints,
    };

    const nextHistory = [...history, stroke];
    setHistory(nextHistory);
    setRedoStack([]);

    // Commit stroke to main canvas
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) drawStrokeToContext(ctx, stroke);
    }

    onStrokeComplete?.(stroke);
    setCurrentPoints([]);
  };

  const handleUndo = () => {
    if (history.length === 0 || isReadOnly) return;
    const last = history[history.length - 1];
    const nextHistory = history.slice(0, -1);
    setHistory(nextHistory);
    setRedoStack([last, ...redoStack]);
    redrawAll(nextHistory);
  };

  const handleRedo = () => {
    if (redoStack.length === 0 || isReadOnly) return;
    const next = redoStack[0];
    const nextRedo = redoStack.slice(1);
    const nextHistory = [...history, next];
    setHistory(nextHistory);
    setRedoStack(nextRedo);
    redrawAll(nextHistory);
  };

  const handleConfirmClear = () => {
    setHistory([]);
    setRedoStack([]);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
    setIsClearDialogOpen(false);
    onClearBoard?.();
  };

  const handleDownloadSnapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `whiteboard-${Date.now()}.png`;
    link.href = url;
    link.click();
  };

  return (
    <Box sx={{ width: '100%', height: '100%', position: 'relative', display: 'flex', flexDirection: 'column', bgcolor: '#fff', borderRadius: 2, overflow: 'hidden' }}>
      {/* Top Floating Whiteboard Toolbar */}
      <Box
        sx={{
          p: 1,
          px: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #e0e0e0',
          bgcolor: '#f8f9fa',
          flexWrap: 'wrap',
          gap: 1,
          zIndex: 10,
        }}
      >
        {/* Tool buttons */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Tooltip title="Pen">
            <IconButton
              size="small"
              aria-label="Pen"
              color={activeTool === 'pen' ? 'primary' : 'default'}
              disabled={isReadOnly}
              onClick={() => setActiveTool('pen')}
              sx={{ bgcolor: activeTool === 'pen' ? 'rgba(25,118,210,0.1)' : 'transparent' }}
            >
              <CreateIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Tooltip title="Highlighter">
            <IconButton
              size="small"
              aria-label="Highlighter"
              color={activeTool === 'highlighter' ? 'primary' : 'default'}
              disabled={isReadOnly}
              onClick={() => setActiveTool('highlighter')}
              sx={{ bgcolor: activeTool === 'highlighter' ? 'rgba(25,118,210,0.1)' : 'transparent' }}
            >
              <HighlightIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Tooltip title="Eraser">
            <IconButton
              size="small"
              aria-label="Eraser"
              color={activeTool === 'eraser' ? 'primary' : 'default'}
              disabled={isReadOnly}
              onClick={() => setActiveTool('eraser')}
              sx={{ bgcolor: activeTool === 'eraser' ? 'rgba(25,118,210,0.1)' : 'transparent' }}
            >
              <AutoFixNormalIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

          <Tooltip title="Straight Line">
            <IconButton
              size="small"
              aria-label="Straight Line"
              color={activeTool === 'line' ? 'primary' : 'default'}
              disabled={isReadOnly}
              onClick={() => setActiveTool('line')}
              sx={{ bgcolor: activeTool === 'line' ? 'rgba(25,118,210,0.1)' : 'transparent' }}
            >
              <TimelineIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Tooltip title="Rectangle">
            <IconButton
              size="small"
              aria-label="Rectangle"
              color={activeTool === 'rectangle' ? 'primary' : 'default'}
              disabled={isReadOnly}
              onClick={() => setActiveTool('rectangle')}
              sx={{ bgcolor: activeTool === 'rectangle' ? 'rgba(25,118,210,0.1)' : 'transparent' }}
            >
              <CropSquareIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Tooltip title="Circle">
            <IconButton
              size="small"
              aria-label="Circle"
              color={activeTool === 'circle' ? 'primary' : 'default'}
              disabled={isReadOnly}
              onClick={() => setActiveTool('circle')}
              sx={{ bgcolor: activeTool === 'circle' ? 'rgba(25,118,210,0.1)' : 'transparent' }}
            >
              <RadioButtonUncheckedIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Tooltip title="Text">
            <IconButton
              size="small"
              aria-label="Text"
              color={activeTool === 'text' ? 'primary' : 'default'}
              disabled={isReadOnly}
              onClick={() => setActiveTool('text')}
              sx={{ bgcolor: activeTool === 'text' ? 'rgba(25,118,210,0.1)' : 'transparent' }}
            >
              <TitleIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Colors & Brush Size */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {PRESET_COLORS.map((c) => (
              <Box
                key={c}
                onClick={() => !isReadOnly && setActiveColor(c)}
                sx={{
                  width: 18,
                  height: 18,
                  bgcolor: c,
                  borderRadius: '50%',
                  cursor: isReadOnly ? 'not-allowed' : 'pointer',
                  border: activeColor === c ? '2px solid #000' : '1px solid #ccc',
                  transform: activeColor === c ? 'scale(1.2)' : 'none',
                }}
              />
            ))}
          </Box>

          <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {PRESET_SIZES.map((s) => (
              <Box
                key={s}
                onClick={() => !isReadOnly && setActiveSize(s)}
                sx={{
                  px: 0.75,
                  py: 0.25,
                  fontSize: 11,
                  borderRadius: 1,
                  cursor: isReadOnly ? 'not-allowed' : 'pointer',
                  bgcolor: activeSize === s ? 'primary.main' : 'transparent',
                  color: activeSize === s ? '#fff' : 'text.primary',
                  fontWeight: 600,
                }}
              >
                {s}px
              </Box>
            ))}
          </Box>
        </Box>

        {/* Actions: Undo, Redo, Clear, Save */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Tooltip title="Undo">
            <span>
              <IconButton size="small" aria-label="Undo" onClick={handleUndo} disabled={history.length === 0 || isReadOnly}>
                <UndoIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Redo">
            <span>
              <IconButton size="small" aria-label="Redo" onClick={handleRedo} disabled={redoStack.length === 0 || isReadOnly}>
                <RedoIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Clear Board">
            <span>
              <IconButton size="small" aria-label="Clear Board" color="error" onClick={() => setIsClearDialogOpen(true)} disabled={isReadOnly}>
                <DeleteSweepIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Download Image">
            <IconButton size="small" aria-label="Download Image" onClick={handleDownloadSnapshot}>
              <DownloadIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          {/* Multi-Page Whiteboard Navigation */}
          <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Tooltip title="Previous Page">
              <span>
                <IconButton
                  size="small"
                  aria-label="Previous Page"
                  disabled={pageIndex <= 0}
                  onClick={() => onPageChange?.(pageIndex - 1)}
                >
                  <NavigateBeforeIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Typography variant="caption" sx={{ fontWeight: 600, minWidth: 65, textAlign: 'center' }}>
              Page {pageIndex + 1} of {totalPages}
            </Typography>
            <Tooltip title="Next Page">
              <span>
                <IconButton
                  size="small"
                  aria-label="Next Page"
                  disabled={pageIndex >= totalPages - 1}
                  onClick={() => onPageChange?.(pageIndex + 1)}
                >
                  <NavigateNextIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            {!isReadOnly && onAddPage && (
              <Tooltip title="Add New Page">
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<NoteAddIcon />}
                  onClick={onAddPage}
                  sx={{ fontSize: 11, py: 0.25, px: 1, minWidth: 'auto', textTransform: 'none' }}
                >
                  + Page
                </Button>
              </Tooltip>
            )}
          </Box>
          {isReadOnly && (
            <Tooltip title="Whiteboard is in View-Only mode (Teacher locked drawing)">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, bgcolor: 'action.hover', px: 1, py: 0.5, borderRadius: 1 }}>
                <LockIcon sx={{ fontSize: 14, color: 'warning.main' }} />
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                  View Only
                </Typography>
              </Box>
            </Tooltip>
          )}
        </Box>
      </Box>

      {/* Canvas Drawing Surface */}
      <Box ref={containerRef} sx={{ flex: 1, position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            touchAction: 'none',
          }}
        />
        <canvas
          ref={previewCanvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            cursor: isReadOnly ? 'default' : activeTool === 'text' ? 'text' : 'crosshair',
            touchAction: 'none',
          }}
        />
      </Box>

      {/* Clear Confirmation Dialog */}
      <Dialog open={isClearDialogOpen} onClose={() => setIsClearDialogOpen(false)} disableRestoreFocus>
        <DialogTitle sx={{ fontWeight: 600 }}>Clear Whiteboard?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Are you sure you want to clear the entire whiteboard? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setIsClearDialogOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleConfirmClear} color="error" variant="contained">
            Clear Everything
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
