import * as esbuild from "esbuild-wasm";

let ready = false;

export async function initEsbuild() {
  if (ready) return;
  await esbuild.initialize({
    wasmURL: "https://unpkg.com/esbuild-wasm@0.20.2/esbuild.wasm",
    worker: true,
  });
  ready = true;
}

export async function compile(code: string) {
  await initEsbuild();

  try {
    const result = await esbuild.build({
      stdin: {
        contents: code,
        sourcefile: "index.tsx",
        resolveDir: "/",
      },
      bundle: true,
      write: false,
      format: "esm",
      platform: "browser",
    });

    return { js: result.outputFiles[0].text, error: null };
  } catch (e: any) {
    return { js: "", error: e.message };
  }
}
