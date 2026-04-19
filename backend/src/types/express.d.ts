import type { AgentSessionPayload, ClientSessionPayload } from "../lib/jwt";

declare global {
  namespace Express {
    interface Request {
      agent?: AgentSessionPayload;
      clientSession?: ClientSessionPayload;
    }
  }
}

export {};
