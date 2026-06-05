/**
 * gradeAndImprove.js
 *
 * Optional Groq-based per-file grader. Gated behind ENABLE_GRADER=true so it
 * is off by default. Only grades a narrow whitelist (App.js + src/lib/*.js).
 *
 * Grade D: fix broken code (state setters, onPress, imports).
 * Grade C: improve UI styling while keeping logic identical.
 * Grade B: minor polish (empty states, activeOpacity, StyleSheet).
 * Grade A: return unchanged.
 *
 * Regression guards (all grades):
 * - Discard rewrite if state-setter count drops.
 * - Discard B/C rewrite if onPress handler count drops.
 *
 * Errors per file are isolated — one bad grade never breaks the whole batch.
 */

const GRADER_MODEL = process.env.GRADER_MODEL || "llama-3.3-70b-versatile";

const GRADE_PROMPT = `Grade this React Native file A, B, C, or D.
Grade D means: state setters are called incorrectly, onPress handlers are empty, or imports are broken.
Grade C means: logic works but UI is minimal or poorly styled.
Grade B means: logic and UI are acceptable but missing polish (empty states, activeOpacity).
Grade A means: logic and UI are already good.
Respond with JSON only: {"grade": "A"|"B"|"C"|"D", "issues": "one sentence", "improved_code": null}
If grade is D: set improved_code to a full corrected file fixing broken logic/imports.
If grade is C: set improved_code to a full file with proper mobile layout (SafeAreaView root, consistent padding, styled buttons with backgroundColor and borderRadius, proper typography). Keep all logic identical — only improve styling.
If grade is B: set improved_code to a full file with minimal improvements: add ListEmptyComponent to any FlatList that lacks one, add activeOpacity={0.8} to TouchableOpacity elements, ensure StyleSheet.create is used for all styles. Keep all logic identical.
If grade is A: improved_code MUST be null.`;

// Files we are willing to rewrite. Screens are deliberately excluded because
// the LLM tends to break screen handlers when "improving" them.
function isGradeable(filePath) {
  if (!filePath || typeof filePath !== "string") return false;
  if (filePath === "App.js") return true;
  if (/^src\/lib\/[A-Za-z0-9_.-]+\.js$/.test(filePath)) return true;
  return false;
}

function countStateSetters(source) {
  if (!source || typeof source !== "string") return 0;
  const matches = source.match(/\bset[A-Z][a-zA-Z0-9_]*\s*\(/g);
  return matches ? matches.length : 0;
}

function countOnPressHandlers(source) {
  if (!source || typeof source !== "string") return 0;
  const matches = source.match(/\bonPress\s*=/g);
  return matches ? matches.length : 0;
}

function safeParseGraderJson(content) {
  if (!content || typeof content !== "string") return null;
  try {
    return JSON.parse(content);
  } catch {
    const m = content.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

function shouldDiscardRewrite(original, improved, grade) {
  const beforeSetters = countStateSetters(original);
  const afterSetters = countStateSetters(improved);
  if (afterSetters < beforeSetters) {
    console.warn(
      `[grader] rewrite discarded — reduced state setters from ${beforeSetters} to ${afterSetters}`
    );
    return true;
  }

  if (grade === "B" || grade === "C") {
    const beforePress = countOnPressHandlers(original);
    const afterPress = countOnPressHandlers(improved);
    if (afterPress < beforePress) {
      console.warn(
        `[grader] rewrite discarded — reduced onPress handlers from ${beforePress} to ${afterPress}`
      );
      return true;
    }
  }

  return false;
}

async function gradeOne(file, groqClient) {
  const original = String(file?.content || "");
  try {
    const response = await groqClient.chat.completions.create({
      model: GRADER_MODEL,
      max_tokens: 8192,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: GRADE_PROMPT },
        { role: "user", content: `File: ${file.path}\n\n${original}` },
      ],
    });

    const raw = response.choices?.[0]?.message?.content || "";
    const parsed = safeParseGraderJson(raw);
    const grade = parsed?.grade;

    if (!grade || grade === "A") {
      return { ...file, grade: grade || "?" };
    }

    if (typeof parsed?.improved_code !== "string" || !parsed.improved_code.trim()) {
      return { ...file, grade: grade || "?" };
    }

    const improved = parsed.improved_code;
    if (shouldDiscardRewrite(original, improved, grade)) {
      return { ...file, grade };
    }

    console.log(`[grader] applied ${grade} rewrite to ${file.path}`);
    return { ...file, content: improved, grade };
  } catch (err) {
    console.warn(`[grader] grading failed for ${file?.path}:`, err?.message || err);
    return { ...file, grade: "?" };
  }
}

/**
 * Grade and possibly improve a list of generated files.
 * Returns the same array shape; only gradeable files may be mutated.
 * Never throws.
 */
export async function gradeAndImprove(files, groqClient) {
  if (!Array.isArray(files) || !groqClient) return files;

  const out = await Promise.all(
    files.map((f) => (isGradeable(f?.path) ? gradeOne(f, groqClient) : f))
  );
  return out;
}
