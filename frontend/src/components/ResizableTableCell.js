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
  const [isHovering, setIsHovering] = useState(false);
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
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
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
        ...(isHeader && {
          backgroundColor: 'action.hover',
          fontWeight: 600,
          borderBottom: '2px solid',
          borderBottomColor: 'primary.main',
          borderRight: (isHovering || isResizing) ? '2px solid rgba(25, 118, 210, 0.3)' : 'none',
        }),
      }}
    >
      {children}
      {isHeader && (
        <div
          onMouseDown={handleMouseDown}
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: '8px',
            cursor: 'col-resize',
            userSelect: 'none',
            borderRight: (isHovering || isResizing) ? '3px solid #1976d2' : 'none',
            backgroundColor: isResizing ? 'rgba(25, 118, 210, 0.1)' : 'transparent',
            transition: 'border-right 0.2s ease, background-color 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = 'rgba(25, 118, 210, 0.15)';
          }}
          onMouseLeave={(e) => {
            if (!isResizing) {
              e.target.style.backgroundColor = 'transparent';
            }
          }}
        />
      )}
    </TableCell>
  );
};

export default ResizableTableCell;
