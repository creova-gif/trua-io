// Loaded before the database pool and the Anthropic client. Both point at an
// unreachable local address so a test cannot open a real database connection
// or call the model with a real key.
process.env.DATABASE_URL = "postgres://127.0.0.1:1/conversations-security-test";
process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY = "test-placeholder-not-used";
process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL = "http://127.0.0.1:9";
