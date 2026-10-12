/**
 * Health check controller
 * Endpoint: GET /api/health
 */
export const getHealthStatus = (req, res) => {
  res.status(200).json({
    success: true,
    message: "AI Interview Preparation Platform API is running"
  });
};
