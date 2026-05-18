/**
 * gradeAndImprove.js
 *
 * Optional Groq-based per-file grader. Gated behind ENABLE_GRADER=true so it
 * is off by default. Only grades a narrow whitelist (App.js + src/lib/*.js)
 * and only applies a rewrite when the LLM grade is "D".
 *
 * Regression guard: before applying any rewrite, we count state-setter calls
 * (the most common breakage from past rewrites was the LLM stripping the
 * `setX(prev => ...)` calls that make buttons actually work). If the rewrite
 * has fewer setter calls than the original, we discard the rewrite.
 *
 * Errors per file are isolated — one bad grade never breaks the whole batch.
 */

const GRADER_MODEL = process.env.GRADER_MODEL || "llama-3.3-70b-versatile";

const GRADE_PROMPT = `Grade this React Native file A, B, C, or D.
Grade D means: state setters are called incorrectly, onPress handlers are empty, or imports are broken.
Grade C means: logic works but UI is minimal.
Grade B or A means: logic and UI are acceptable.
Respond with JSON only: {"grade": "A"|"B"|"C"|"D", "issues": "one sentence", "improved_code": null}
If the grade is D, set improved_code to a full corrected file as a single string. Otherwise improved_code MUST be null.`;

// Files we are willing to rewrite. Screens are deliberately excluded because
// the LLM tends to break screen handlers when "improving" them.
function isGradeable(filePath) {
  if (!filePath || typeof filePath !== "string") return false;
  if (filePath === "App.js") return true;
  if (/^src\/lib\/[A-Za-z0-9_.-]+\.js$/.test(filePath)) return true;
  return false;
}

// Count occurrences of `setX(...)` style state-setter calls. Used as a cheap
// regression check: if a "fixed" file has fewer setters than the original,
// the rewrite is almost certainly worse.
function countStateSetters(source) {
  if (!source || typeof source !== "string") return 0;
  const matches = source.match(/\bset[A-Z][a-zA-Z0-9_]*\s*\(/g);
  return matches ? matches.length : 0;
}

function safeParseGraderJson(content) {
  if (!content || typeof content !== "string") return null;
  try {
    return JSON.parse(content);
  } catch {
    // try to extract the first {...} blob
    const m = content.match(/\{[\s\S]*\}/);
    if (m) {
      try { return JSON.parse(m[0]); } catch { return null; }
    }
    return null;
  }
}

async function gradeOne(file, groqClient) {
  const original = String(file?.content || "");
  try {
    const response = await groqClient.chat.completions.create({
      model: GRADER_MODEL,
      max_tokens: 150,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: GRADE_PROMPT },
        { role: "user", content: `File: ${file.path}\n\n${original}` },
      ],
    });

    const raw = response.choices?.[0]?.message?.content || "";
    const parsed = safeParseGraderJson(raw);
    const grade = parsed?.grade;

    // Only act on D. A/B/C → keep original.
    if (grade !== "D" || typeof parsed?.improved_code !== "string") {
      return { ...file, grade: grade || "?" };
    }

    const improved = parsed.improved_code;
    const before = countStateSetters(original);
    const after = countStateSetters(improved);
    if (after < before) {
      console.warn(
        `[grader] rewrite discarded for ${file.path} — reduced state setters from ${before} to ${after}`
      );
      return { ...file, grade };
    }

    console.log(`[grader] applied rewrite to ${file.path} (D → improved)`);
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
