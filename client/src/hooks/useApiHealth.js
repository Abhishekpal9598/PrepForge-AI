import { useState, useEffect } from 'react';
import { checkHealth } from '../services/api';

export const useApiHealth = () => {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const verifyHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await checkHealth();
      setHealth(data);
    } catch (err) {
      setError(err.message || 'Failed to reach API');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    verifyHealth();
  }, []);

  return { health, loading, error, refetch: verifyHealth };
};
