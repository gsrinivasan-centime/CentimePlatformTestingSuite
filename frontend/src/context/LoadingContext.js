import React, { createContext, useContext, useState, useCallback } from 'react';
import { Box, LinearProgress } from '@mui/material';

const LoadingContext = createContext();

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within LoadingProvider');
  }
  return context;
};

export const LoadingProvider = ({ children }) => {
  const [loadingCount, setLoadingCount] = useState(0);

  const startLoading = useCallback(() => {
    setLoadingCount((prev) => prev + 1);
  }, []);

  const stopLoading = useCallback(() => {
    setLoadingCount((prev) => Math.max(0, prev - 1));
  }, []);

  const isLoading = loadingCount > 0;

  return (
    <LoadingContext.Provider value={{ isLoading, startLoading, stopLoading, loadingCount }}>
      {/* Top progress bar - non-intrusive loading indicator */}
      {isLoading && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 9999,
          }}
        >
          <LinearProgress 
            sx={{
              height: 3,
              '& .MuiLinearProgress-bar': {
                backgroundColor: '#1976d2',
              },
            }}
          />
        </Box>
      )}
      {children}
    </LoadingContext.Provider>
  );
};
