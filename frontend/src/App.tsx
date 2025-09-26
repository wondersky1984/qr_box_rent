import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { router } from './router';
import { ErrorBoundary } from './components/ErrorBoundary';

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    document.title = 'LockBox';
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <RouterProvider router={router} />
      </ErrorBoundary>
    </QueryClientProvider>
  );
};

export default App;
