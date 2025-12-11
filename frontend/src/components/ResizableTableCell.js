import React, { useState, useRef, useEffect } from 'react';
import { TableCell } from '@mui/material';

const ResizableTableCell = ({ 
  children, 
  minWidth = 100, 
  initialWidth = 150,
  align = 'center',
  isHeader = false,
  ...props 
}) => {
  const [width, setWidth] = useState(initialWidth);
  const [isResizing, setIsResizing] = useState(false);
  const [isHandleHovering, setIsHandleHovering] = useState(false);
  const cellRef = useRef(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      
      const diff = e.clientX - startXRef.current;
      const newWidth = Math.max(minWidth, startWidthRef.current + diff);
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, minWidth]);

  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = width;
  };

  return (
    <TableCell
      ref={cellRef}
      align={align}
      {...props}
      sx={{
        ...props.sx,
        width: `${width}px`,
        minWidth: `${minWidth}px`,
        maxWidth: `${width}px`,
        position: 'relative',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        padding: '6px 16px',
        userSelect: isResizing ? 'none' : 'auto',
        boxSizing: 'border-box',
        ...(isHeader && {
          backgroundColor: 'action.hover',
          fontWeight: 600,
          borderBottom: '2px solid',
          borderBottomColor: 'primary.main',
          overflow: 'visible', // Allow resize handle to extend outside
        }),
      }}
    >
      {children}
      {isHeader && (
        <div
          onMouseDown={handleMouseDown}
          onMouseEnter={() => setIsHandleHovering(true)}
          onMouseLeave={() => setIsHandleHovering(false)}
          style={{
            position: 'absolute',
            right: -4,
            top: 0,
            bottom: 0,
            width: '12px',
            cursor: 'col-resize',
            userSelect: 'none',
            backgroundColor: isResizing ? 'rgba(25, 118, 210, 0.2)' : 'transparent',
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: '3px',
              height: '60%',
              backgroundColor: (isHandleHovering || isResizing) ? '#1976d2' : 'rgba(0,0,0,0.15)',
              borderRadius: '2px',
              transition: 'background-color 0.15s ease',
            }}
          />
        </div>
      )}
    </TableCell>
  );
};

export default ResizableTableCell;
