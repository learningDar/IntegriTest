document.getElementById("connection-check").addEventListener("click", async () => {
  const result = document.getElementById("connection-result");
  result.textContent = "Checking…";
  try {
    const response = await fetch("/api/health", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok || data.status !== "ok") throw new Error("Unreachable");
    result.textContent = `Teacher service reachable · v${data.version}`;
  } catch { result.textContent = "Teacher service unavailable. Ask the professor for the correct setup link."; }
});
