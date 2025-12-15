import { useEffect, useState } from 'react';
import { MatrixClient } from 'matrix-js-sdk';
import { getMatrixClient } from '../matrixClient';

export const useMatrixClient = () => {
  const [client, setClient] = useState<MatrixClient | null>(null);

  useEffect(() => {
    const c = getMatrixClient();
    setClient(c);
  }, []);

  return { client, isReady: !!client };
};
