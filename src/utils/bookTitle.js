export const cleanBookTitle = (title) => {
  if (typeof title !== 'string') {
    return '';
  }

  const normalized = title.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return '';
  }

  const semicolonSplit = normalized.split(';')[0]?.trim() || normalized;
  const dashSplit = semicolonSplit.split(/\s+[—-]\s+(?=[A-Z][^—-]*$)/)[0]?.trim() || semicolonSplit;

  return dashSplit || normalized;
};

export const getDisplayBookTitle = (title) => cleanBookTitle(title);
