declare namespace NodeJS {
  interface ProcessEnv {
    PORT?: string;
    DATABASE_URL?: string;
    CLIENT_ORIGIN?: string;
    MAGIC_LINK_SECRET?: string;
    SESSION_SECRET?: string;
    GROQ_API_KEY?: string;
    GROQ_MODEL?: string;
    ELEVENLABS_API_KEY?: string;
    ELEVENLABS_VOICE_ID?: string;
    ELEVENLABS_MODEL_ID?: string;
    LOFTY_API_BASE_URL?: string;
    LOFTY_API_KEY?: string;
    LOFTY_TIMEOUT_MS?: string;
    VITE_API_URL?: string;
    NODE_ENV?: "development" | "production" | "test";
  }
}
