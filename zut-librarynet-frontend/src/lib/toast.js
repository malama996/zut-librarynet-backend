import toast from 'react-hot-toast';

/**
 * Unified toast API for the app
 * Ensures consistent styling and icons
 */

export const toastSuccess = (message, options = {}) => {
  toast.success(message, {
    duration: 3000,
    position: 'top-right',
    style: {
      background: '#d1fae5',
      color: '#047857',
      border: '1px solid #6ee7b7',
      borderRadius: '0.375rem',
      fontWeight: 600,
    },
    ...options,
  });
};

export const toastError = (message, options = {}) => {
  toast.error(message, {
    duration: 4000,
    position: 'top-right',
    style: {
      background: '#fee2e2',
      color: '#dc2626',
      border: '1px solid #fca5a5',
      borderRadius: '0.375rem',
      fontWeight: 600,
    },
    ...options,
  });
};

export const toastLoading = (message, options = {}) => {
  return toast.loading(message, {
    position: 'top-right',
    style: {
      background: '#dbeafe',
      color: '#1d4ed8',
      border: '1px solid #93c5fd',
      borderRadius: '0.375rem',
      fontWeight: 600,
    },
    ...options,
  });
};

export const toastPromise = (promise, messages) => {
  return toast.promise(
    promise,
    {
      loading: messages.loading || 'Loading...',
      success: messages.success || 'Success!',
      error: messages.error || 'Error occurred',
    },
    {
      position: 'top-right',
      duration: 3000,
    }
  );
};
