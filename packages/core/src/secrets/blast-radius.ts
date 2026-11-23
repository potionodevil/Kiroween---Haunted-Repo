/** Static, plain-language damage per key type (feature 6). No live checks, ever. */
export const BLAST_RADIUS: Record<string, string> = {
  "secret/aws-access-key": "Whatever the IAM user may do. Often reading S3 buckets and starting EC2 machines on your bill.",
  "secret/aws-secret-key": "Together with its access key id: everything the IAM user may do in your AWS account.",
  "secret/stripe-live-key": "Create charges and refunds, read customer and payment data, change your Stripe account.",
  "secret/stripe-test-key": "Read and change test data only. No real money moves.",
  "secret/github-token": "Read private repos and push code with the token's scopes, as its owner.",
  "secret/slack-token": "Read channels and post messages in your workspace as the app or user.",
  "secret/google-api-key": "Call the Google APIs the key allows, billed to your project, if the key is unrestricted.",
  "secret/openai-style-key": "Spend your AI credits and read anything sent through the key.",
  "secret/private-key": "Log in to servers or sign as the owner of the key wherever its public half is trusted.",
  "secret/generic-secret": "Depends on the service. Treat it as a working password until proven otherwise.",
  "secret/high-entropy": "Unknown. If it is a real credential, it opens whatever it was issued for.",
};

export function blastRadiusFor(rule: string): string {
  return BLAST_RADIUS[rule] ?? BLAST_RADIUS["secret/generic-secret"]!;
}
