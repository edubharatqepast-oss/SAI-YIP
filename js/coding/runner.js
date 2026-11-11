import { APP } from "../config.js";

export async function runJS(code) {
  const workerSrc = `onmessage=(e)=>{let out=[];const c={log:(...a)=>out.push(a.map(String).join(" "))};try{const f=new Function("console",e.data);const r=f(c);postMessage({ok:true,out:out.join("\\n"),r:(r??"")===""?"":String(r)})}catch(err){postMessage({ok:false,error:String(err?.message||err),out:out.join("\\n")})}};`;
  const blob = new Blob([workerSrc], { type: "text/javascript" });
  const w = new Worker(URL.createObjectURL(blob));
  return new Promise((resolve) => {
    const t = setTimeout(() => { w.terminate(); resolve({ ok: false, error: "timeout" }); }, APP.runner.timeoutMs);
    w.onmessage = (e) => { clearTimeout(t); w.terminate(); resolve(e.data); };
    w.postMessage(code);
  });
}

let pythonVersion = "";

async function pistonPythonVersion(signal) {
  if (pythonVersion) return pythonVersion;
  try {
    const res = await fetch("https://emkc.org/api/v2/piston/runtimes", { signal });
    if (!res.ok) throw new Error("runtimes_failed");
    const list = await res.json();
    const pys = (list || []).filter((r) => r.language === "python").map((r) => r.version);
    pys.sort().reverse();
    pythonVersion = pys[0] || "3.10.0";
  } catch {
    pythonVersion = pythonVersion || "3.10.0";
  }
  return pythonVersion;
}

async function runPythonPiston(code, signal) {
  const version = await pistonPythonVersion(signal);
  const res = await fetch(APP.runner.piston, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ language: "python", version, files: [{ content: code }] }),
    signal
  });
  if (!res.ok) throw new Error("piston_failed");
  const j = await res.json();
  return { ok: (j.run?.code ?? 1) === 0, out: [j.run?.stdout || "", j.run?.stderr || ""].join("\n").trim() };
}

async function runPythonWandbox(code, signal) {
  const listRes = await fetch("https://wandbox.org/api/list.json", { signal });
  if (!listRes.ok) throw new Error("wandbox_list_failed");
  const list = await listRes.json();
  const cpy = (list || []).filter((c) => /^cpython/i.test(c.name)).map((c) => c.name).sort().reverse();
  if (!cpy.length) throw new Error("wandbox_no_python");
  const res = await fetch("https://wandbox.org/api/compile.json", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ compiler: cpy[0], code, options: "warning", "compiler-option-raw": [], "runtime-option-raw": [] }),
    signal
  });
  if (!res.ok) throw new Error("wandbox_failed");
  const j = await res.json();
  const out = [j.program_output || "", j.program_error || "", j.compiler_error || ""].join("\n").trim();
  return { ok: String(j.status || "1") === "0", out };
}

export async function runPython(code) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), APP.runner.timeoutMs + 8000);
  try {
    try {
      return await runPythonPiston(code, ctrl.signal);
    } catch {
      try {
        return await runPythonWandbox(code, ctrl.signal);
      } catch {
        return await runPythonViaServer(code);
      }
    }
  } catch (e) {
    return { ok: false, error: String(e?.message || e) };
  } finally {
    clearTimeout(t);
  }
}

async function runPythonViaServer(code) {
  const base = window.__SAI_ENV__?.API_URL || "";
  if (!base) throw new Error("no_server_configured");
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 25000);
  try {
    const res = await fetch(base + "/api/code/run", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ language: "python", code }),
      signal: ctrl.signal
    });
    if (!res.ok) throw new Error("server_run_failed");
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}
