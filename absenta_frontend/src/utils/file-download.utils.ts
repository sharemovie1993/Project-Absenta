/**
 * Utility to handle file downloads from Blobs (Excel, CSV, PDF, etc.)
 */
export const downloadFileFromBlob = (data: any, filename: string) => {
  if (!data) return;

  const blob = (data instanceof Blob) ? data : new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  
  // Standard click trigger
  document.body.appendChild(link);
  link.click();
  
  setTimeout(() => {
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }, 1000);
};

/**
 * Generates a standard filename based on type and date
 */
export const generateStandardFilename = (prefix: string, extension: 'xlsx' | 'csv' | 'pdf' = 'xlsx') => {
  const date = new Date().toISOString().split('T')[0];
  return `${prefix}_${date}.${extension}`;
};
