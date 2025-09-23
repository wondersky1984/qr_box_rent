export const toast = {
  success: (message: string) => {
    if (import.meta.env.DEV) {
      console.info(`[success] ${message}`);
    }
  },
  error: (message: string) => {
    if (import.meta.env.DEV) {
      console.error(`[error] ${message}`);
    }
  },
  info: (message: string) => {
    if (import.meta.env.DEV) {
      console.log(`[info] ${message}`);
    }
  },
};
