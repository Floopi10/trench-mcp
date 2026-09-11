const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const liquidity = document.querySelector("#liquidity");
const size = document.querySelector("#size");
const grade = document.querySelector("#grade");
function updateModel() {
  const liq = Number(liquidity.value), notional = Number(size.value), depth = liq / 2, afterFee = notional * 0.99;
  const receive = depth * afterFee / (depth + afterFee), impact = Math.max(0, (1 - receive / afterFee) * 100), ratio = notional / depth * 100;
  let state = "DEEP", reason = "Position stays below the configured depth wall.";
  if (liq < 10000 || ratio > 8) { state = "CRITICAL"; reason = liq < 10000 ? "Primary pool liquidity is below $10K." : "Position exceeds 8% of estimated quote-side depth."; }
  else if (ratio > 2) { state = "THIN"; reason = "Position exceeds 2% of estimated quote-side depth."; }
  document.querySelector("#liqOut").textContent = money.format(liq); document.querySelector("#sizeOut").textContent = money.format(notional);
  document.querySelector("#impact").textContent = `${impact.toFixed(2)}%`; document.querySelector("#ratio").textContent = `${ratio.toFixed(2)}%`;
  document.querySelector("#reason").textContent = reason; grade.textContent = state;
  grade.style.color = state === "CRITICAL" ? "#ff806e" : state === "THIN" ? "#ffbf69" : "#62ff8f";
}
liquidity.addEventListener("input", updateModel); size.addEventListener("input", updateModel); updateModel();
document.querySelectorAll("[data-copy]").forEach((button) => button.addEventListener("click", async () => {
  await navigator.clipboard.writeText(button.dataset.copy); const label = button.querySelector("span"); label.textContent = "copied"; setTimeout(() => { label.textContent = "copy"; }, 1400);
}));
