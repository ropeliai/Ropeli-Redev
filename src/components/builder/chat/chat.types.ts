/* ============================= */
/* PROJECT CONFIG TYPES */
/* ============================= */

export type BuildType =
  | "website"
  | "webapp"
  | "mobile";

export type Integration =
  | "backend"
  | "auth"
  | "supabase"
  | "admin"
  | "payments"
  | "notifications"
  | "deployment"
  | "logs";

export interface ProjectConfig {
  buildTypes: BuildType[];
  integrations: Integration[];
}

/* ============================= */
/* CHAT MESSAGE TYPES */
/* ============================= */

export type ChatMessage =
  | {
      kind: "config_form";
      role: "assistant";
    }
  | {
      kind: "typing";
      role: "assistant";
    }
  | {
      kind: "text";
      role: "assistant";
      content: string;
    }
  | {
      kind: "user_input";
      role: "user";
      content?: string;
      files?: File[];
      design?: {
        type: string;
        url: string;
      };
    };
