import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Tooltip, Typography } from '@mui/material';

/**
 * TruncatedText Component
 * 
 * Displays text that automatically shows a tooltip when the text is truncated.
 * The tooltip only appears if the text is actually overflowing its container.
 * 
 * @param {string} text - The text to display
 * @param {object} sx - Additional MUI sx styles
 * @param {string} variant - Typography variant (default: 'body2')
 * @param {string} color - Text color
 * @param {object} tooltipProps - Additional props for the Tooltip component
 * @param {number} maxLines - Maximum number of lines before truncation (default: 1)
 * @param {object} rest - Any additional props passed to Typography
 */
const TruncatedText = ({ 
  text, 
  sx = {}, 
  variant = 'body2', 
  color,
  tooltipProps = {},
  maxLines = 1,
  fontWeight,
  ...rest 
}) => {
  const textRef = useRef(null);
  const [isTruncated, setIsTruncated] = useState(false);

  const checkTruncation = useCallback(() => {
    const element = textRef.current;
    if (element) {
      // Check if text is truncated (scrollWidth > clientWidth for single line)
      // or scrollHeight > clientHeight for multi-line
      const isOverflowing = maxLines === 1 
        ? element.scrollWidth > element.clientWidth
        : element.scrollHeight > element.clientHeight;
      setIsTruncated(isOverflowing);
    }
  }, [maxLines]);

  useEffect(() => {
    checkTruncation();
    
    // Recheck on window resize
    window.addEventListener('resize', checkTruncation);
    return () => window.removeEventListener('resize', checkTruncation);
  }, [text, checkTruncation]);

  // Use ResizeObserver to detect when the element size changes
  useEffect(() => {
    const element = textRef.current;
    if (!element) return;

    const resizeObserver = new ResizeObserver(() => {
      checkTruncation();
    });

    resizeObserver.observe(element);
    return () => resizeObserver.disconnect();
  }, [checkTruncation]);

  const baseStyles = maxLines === 1 
    ? {
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }
    : {
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        display: '-webkit-box',
        WebkitLineClamp: maxLines,
        WebkitBoxOrient: 'vertical',
      };

  const content = (
    <Typography
      ref={textRef}
      variant={variant}
      color={color}
      fontWeight={fontWeight}
      sx={{
        ...baseStyles,
        ...sx,
      }}
      {...rest}
    >
      {text}
    </Typography>
  );

  if (isTruncated) {
    return (
      <Tooltip 
        title={text} 
        arrow 
        placement="top-start"
        enterDelay={300}
        {...tooltipProps}
      >
        {content}
      </Tooltip>
    );
  }

  return content;
};

export default TruncatedText;
