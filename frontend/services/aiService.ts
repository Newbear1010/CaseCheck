// AI functionality temporarily disabled for deployment
// TODO: Implement backend API for secure AI integration

export const analyzeActivityRisk = async (_title: string, _description: string) => {
  // Return default response without AI call
  return {
    riskLevel: "MEDIUM" as const,
    reasoning: "AI analysis is currently disabled. Manual review required.",
    suggestions: [
      "Review activity details carefully",
      "Ensure all safety protocols are followed",
      "Consult with relevant stakeholders"
    ]
  };
};
