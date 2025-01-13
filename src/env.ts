import * as process from "node:process";
import { validateRequiredEnvVars } from "./configuration";

// Set all safe public environment variables here
// that are *very* unlikely to ever change and remain the
// same regardless of the environment the application is running in
process.env.TZ = "Africa/Lagos";
process.env.SERVICE_ID = "inventory-manager-api";

// This is run on startup to ensure that all required environment variables are
// set before the application starts
validateRequiredEnvVars();
