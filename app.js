const EXPECTED_SPREAD_ALLOWANCE = 0.015625;
const EXPECTED_SPREAD_LABEL = "1/64 in.";
const POSSIBLE_SPREAD_ALLOWANCE = 0.0625;
const POSSIBLE_SPREAD_LABEL = "1/16 in.";
const SLIVER_THRESHOLD = 2;
const FRACTION_BASE = 16;
const FIVE_BOARD_CHECK_PIECES = 5;

const form = document.getElementById("planner-form");
const deckSpanInput = document.getElementById("deck-span");
const boardWidthInput = document.getElementById("board-width");
const boardGapInput = document.getElementById("board-gap");
const errorText = document.getElementById("form-error");
const viewTabs = Array.from(document.querySelectorAll(".tab[data-view-target]"));
const viewPanels = Array.from(document.querySelectorAll(".view-panel"));

const summaryText = document.getElementById("summary-text");
const gapRangeValue = document.getElementById("gap-range-value");
const gapRangeNote = document.getElementById("gap-range-note");
const wholeBoardsValue = document.getElementById("whole-boards-value");
const wholeBoardsNote = document.getElementById("whole-boards-note");
const lastBoardValue = document.getElementById("last-board-value");
const lastBoardNote = document.getElementById("last-board-note");
const purchaseCountValue = document.getElementById("purchase-count-value");
const purchaseCountNote = document.getElementById("purchase-count-note");
const sliverWarningValue = document.getElementById("sliver-warning-value");
const sliverWarningNote = document.getElementById("sliver-warning-note");
const fiveBoardCheckValue = document.getElementById("five-board-check-value");
const fiveBoardCheckNote = document.getElementById("five-board-check-note");
const tipsText = document.getElementById("tips-text");
const gapRangeEcho = document.getElementById("gap-range-echo");
const lastBoardEcho = document.getElementById("last-board-echo");
const wholeBoardsEcho = document.getElementById("whole-boards-echo");
const purchaseCountEcho = document.getElementById("purchase-count-echo");
const sliverWarningEcho = document.getElementById("sliver-warning-echo");
const fiveBoardCheckEcho = document.getElementById("five-board-check-echo");
const lastBoardPerfectStop = document.getElementById("last-board-perfect-stop");
const lastBoardExpectedStop = document.getElementById("last-board-expected-stop");
const lastBoardPossibleStop = document.getElementById("last-board-possible-stop");
const lastBoardPerfectValue = document.getElementById("last-board-perfect-value");
const lastBoardExpectedValue = document.getElementById("last-board-expected-value");
const lastBoardPossibleValue = document.getElementById("last-board-possible-value");
const fieldNotesSummary = document.getElementById("field-notes-summary");
const fieldGapRange = document.getElementById("field-gap-range");
const fieldLastBoard = document.getElementById("field-last-board");
const fieldFiveCheck = document.getElementById("field-five-check");
const fieldSliverRisk = document.getElementById("field-sliver-risk");

function setActiveView(targetId) {
  viewTabs.forEach((tab) => {
    const isActive = tab.dataset.viewTarget === targetId;
    tab.classList.toggle("active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  });

  viewPanels.forEach((panel) => {
    panel.hidden = panel.id !== targetId;
  });
}

function gcd(a, b) {
  let x = Math.abs(a);
  let y = Math.abs(b);

  while (y) {
    const temp = y;
    y = x % y;
    x = temp;
  }

  return x || 1;
}

function parseFraction(part) {
  const match = part.match(/^(-?\d+)\s*\/\s*(\d+)$/);

  if (!match) {
    return Number.NaN;
  }

  const numerator = Number(match[1]);
  const denominator = Number(match[2]);

  if (!denominator) {
    return Number.NaN;
  }

  return numerator / denominator;
}

function parseMixedNumber(value) {
  const cleaned = value.trim().replace(/-/g, " ");

  if (!cleaned) {
    return Number.NaN;
  }

  const parts = cleaned.split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    if (parts[0].includes("/")) {
      return parseFraction(parts[0]);
    }

    return Number(parts[0]);
  }

  if (parts.length === 2 && parts[1].includes("/")) {
    const whole = Number(parts[0]);
    const fraction = parseFraction(parts[1]);

    if (Number.isNaN(whole) || Number.isNaN(fraction)) {
      return Number.NaN;
    }

    return whole >= 0 ? whole + fraction : whole - fraction;
  }

  return Number.NaN;
}

function parseMeasurementInches(value, allowFeet = false) {
  const raw = value.trim().toLowerCase();

  if (!raw) {
    return Number.NaN;
  }

  const normalized = raw
    .replace(/[′’]/g, "'")
    .replace(/[″“”]/g, '"')
    .replace(/\bfeet\b|\bfoot\b|\bft\b/g, "'")
    .replace(/\binches\b|\binch\b|\bin\b/g, '"')
    .replace(/\s+/g, " ")
    .trim();

  if (!allowFeet || (!normalized.includes("'") && !normalized.includes('"'))) {
    return parseMixedNumber(normalized.replace(/"/g, "").trim());
  }

  const feetMatch = normalized.match(/^(.+?)'\s*(.*)$/);

  if (!feetMatch) {
    return Number.NaN;
  }

  const feet = parseMixedNumber(feetMatch[1]);
  const inchesPart = feetMatch[2].replace(/"/g, "").trim();
  const inches = inchesPart ? parseMixedNumber(inchesPart) : 0;

  if (Number.isNaN(feet) || Number.isNaN(inches)) {
    return Number.NaN;
  }

  return feet * 12 + inches;
}

function roundToFraction(value, denominator = FRACTION_BASE) {
  return Math.round(value * denominator) / denominator;
}

function formatDecimal(value, decimals = 3) {
  const rounded = Number(value.toFixed(decimals));
  return `${rounded.toString()} in.`;
}

function formatInches(value) {
  const rounded = roundToFraction(value);
  const whole = Math.trunc(rounded);
  const fraction = rounded - whole;
  const numerator = Math.round(fraction * FRACTION_BASE);

  if (numerator === 0) {
    return `${whole} in.`;
  }

  if (numerator === FRACTION_BASE) {
    return `${whole + 1} in.`;
  }

  const divisor = gcd(numerator, FRACTION_BASE);
  const simpleNumerator = numerator / divisor;
  const simpleDenominator = FRACTION_BASE / divisor;

  if (whole === 0) {
    return `${simpleNumerator}/${simpleDenominator} in.`;
  }

  return `${whole} ${simpleNumerator}/${simpleDenominator} in.`;
}

function clampNearZero(value) {
  return Math.abs(value) < 1e-8 ? 0 : value;
}

function formatGap(value) {
  if (Math.abs(value - 0.125) < 1e-8) {
    return "1/8 in.";
  }

  if (Math.abs(value - 0.1875) < 1e-8) {
    return "3/16 in.";
  }

  if (Math.abs(value - 0.25) < 1e-8) {
    return "1/4 in.";
  }

  return formatDecimal(value, 4);
}

function formatCountRange(min, max) {
  return min === max ? `${min}` : `${min} to ${max}`;
}

function updateLastBoardPlot(plan) {
  lastBoardPerfectValue.textContent = formatInches(plan.perfectScenario.lastBoardWidth);
  lastBoardExpectedValue.textContent = formatInches(plan.expectedScenario.lastBoardWidth);
  lastBoardPossibleValue.textContent = formatInches(plan.possibleScenario.lastBoardWidth);

  if (
    lastBoardPerfectStop &&
    lastBoardExpectedStop &&
    lastBoardPossibleStop &&
    lastBoardExpectedStop.style
  ) {
    const perfect = plan.perfectScenario.lastBoardWidth;
    const expected = plan.expectedScenario.lastBoardWidth;
    const possible = plan.possibleScenario.lastBoardWidth;
    const diff = possible - perfect;
    const ratio = Math.abs(diff) < 1e-8 ? 0.5 : (expected - perfect) / diff;
    const clampedRatio = Math.max(0, Math.min(1, ratio));
    const percent = 8 + clampedRatio * 84;

    lastBoardPerfectStop.style.left = "8%";
    lastBoardExpectedStop.style.left = `${percent}%`;
    lastBoardPossibleStop.style.left = "92%";
  }
}

function calculateScenario(span, boardWidth, gap) {
  const wholeBoards = Math.floor((span + gap) / (boardWidth + gap));

  if (wholeBoards <= 0) {
    const totalPieces = span > 0 ? 1 : 0;

    return {
      wholeBoards: 0,
      gap,
      lastBoardWidth: span,
      sliverWarning: span < SLIVER_THRESHOLD ? "SLIVER" : "OK",
      purchaseAmount: 1,
      totalPieces,
      exactFit: Math.abs(span - boardWidth) < 1e-8,
    };
  }

  const lastBoardWidth = clampNearZero(
    span - (wholeBoards * boardWidth + (wholeBoards - 1) * gap),
  );
  const exactFit = lastBoardWidth === 0;
  const totalPieces = wholeBoards + (exactFit ? 0 : 1);

  return {
    wholeBoards,
    gap,
    lastBoardWidth,
    sliverWarning: !exactFit && lastBoardWidth < SLIVER_THRESHOLD ? "SLIVER" : "OK",
    purchaseAmount: wholeBoards + 1,
    totalPieces,
    exactFit,
  };
}

function calculateFiveBoardCheck(scenario, boardWidth) {
  if (scenario.totalPieces < FIVE_BOARD_CHECK_PIECES) {
    return null;
  }

  if (scenario.exactFit) {
    return 5 * boardWidth + 4 * scenario.gap;
  }

  return 4 * boardWidth + scenario.lastBoardWidth + 4 * scenario.gap;
}

function calculatePlan(span, boardWidth, theoreticalGap) {
  const expectedGap = theoreticalGap + EXPECTED_SPREAD_ALLOWANCE;
  const possibleGap = theoreticalGap + POSSIBLE_SPREAD_ALLOWANCE;
  const perfectScenario = calculateScenario(span, boardWidth, theoreticalGap);
  const expectedScenario = calculateScenario(span, boardWidth, expectedGap);
  const possibleScenario = calculateScenario(span, boardWidth, possibleGap);
  const fiveBoardCheckAtPerfect = calculateFiveBoardCheck(perfectScenario, boardWidth);
  const fiveBoardCheckAtExpected = calculateFiveBoardCheck(expectedScenario, boardWidth);
  const fiveBoardCheckAtPossible = calculateFiveBoardCheck(possibleScenario, boardWidth);

  return {
    theoreticalGap,
    expectedGap,
    possibleGap,
    perfectScenario,
    expectedScenario,
    possibleScenario,
    minWholeBoards: Math.min(
      perfectScenario.wholeBoards,
      expectedScenario.wholeBoards,
      possibleScenario.wholeBoards,
    ),
    maxWholeBoards: Math.max(
      perfectScenario.wholeBoards,
      expectedScenario.wholeBoards,
      possibleScenario.wholeBoards,
    ),
    minLastBoardWidth: Math.min(
      perfectScenario.lastBoardWidth,
      expectedScenario.lastBoardWidth,
      possibleScenario.lastBoardWidth,
    ),
    maxLastBoardWidth: Math.max(
      perfectScenario.lastBoardWidth,
      expectedScenario.lastBoardWidth,
      possibleScenario.lastBoardWidth,
    ),
    sliverWarning: expectedScenario.sliverWarning,
    possibleSliverWarning:
      perfectScenario.sliverWarning === "SLIVER" ||
      expectedScenario.sliverWarning === "SLIVER" ||
      possibleScenario.sliverWarning === "SLIVER"
        ? "SLIVER"
        : "OK",
    purchaseAmount: Math.max(
      perfectScenario.purchaseAmount,
      expectedScenario.purchaseAmount,
      possibleScenario.purchaseAmount,
    ),
    exactFit:
      perfectScenario.exactFit || expectedScenario.exactFit || possibleScenario.exactFit,
    fiveBoardCheckMin:
      fiveBoardCheckAtPerfect === null ||
      fiveBoardCheckAtExpected === null ||
      fiveBoardCheckAtPossible === null
        ? null
        : Math.min(
            fiveBoardCheckAtPerfect,
            fiveBoardCheckAtExpected,
            fiveBoardCheckAtPossible,
          ),
    fiveBoardCheckMax:
      fiveBoardCheckAtPerfect === null ||
      fiveBoardCheckAtExpected === null ||
      fiveBoardCheckAtPossible === null
        ? null
        : Math.max(
            fiveBoardCheckAtPerfect,
            fiveBoardCheckAtExpected,
            fiveBoardCheckAtPossible,
          ),
  };
}

function updateResults(plan, span, boardWidth) {
  const lastBoardPossibleRange =
    Math.abs(plan.maxLastBoardWidth - plan.minLastBoardWidth) < 1e-8
      ? formatInches(plan.minLastBoardWidth)
      : `${formatInches(plan.minLastBoardWidth)} to ${formatInches(
          plan.maxLastBoardWidth,
        )}`;
  const fiveBoardCheckRange =
    plan.fiveBoardCheckMin === null || plan.fiveBoardCheckMax === null
      ? "Not needed"
      : Math.abs(plan.fiveBoardCheckMax - plan.fiveBoardCheckMin) < 1e-8
        ? formatDecimal(plan.fiveBoardCheckMin)
        : `${formatDecimal(plan.fiveBoardCheckMin)} to ${formatDecimal(
            plan.fiveBoardCheckMax,
          )}`;

  gapRangeValue.textContent = formatGap(plan.theoreticalGap);
  wholeBoardsValue.textContent = formatCountRange(
    plan.minWholeBoards,
    plan.maxWholeBoards,
  );
  lastBoardValue.textContent = formatInches(plan.expectedScenario.lastBoardWidth);
  purchaseCountValue.textContent = `${plan.purchaseAmount}`;
  sliverWarningValue.textContent = plan.sliverWarning;
  fiveBoardCheckValue.textContent = fiveBoardCheckRange;
  gapRangeEcho.textContent = formatGap(plan.theoreticalGap);
  lastBoardEcho.textContent = formatInches(plan.expectedScenario.lastBoardWidth);
  wholeBoardsEcho.textContent = formatCountRange(
    plan.minWholeBoards,
    plan.maxWholeBoards,
  );
  purchaseCountEcho.textContent = `${plan.purchaseAmount}`;
  sliverWarningEcho.textContent =
    plan.sliverWarning === "SLIVER" ? "SLIVER !" : plan.sliverWarning;
  fiveBoardCheckEcho.textContent = fiveBoardCheckRange;
  fieldGapRange.textContent = formatGap(plan.theoreticalGap);
  fieldLastBoard.textContent = formatInches(plan.expectedScenario.lastBoardWidth);
  fieldFiveCheck.textContent = fiveBoardCheckRange;
  fieldSliverRisk.textContent = plan.sliverWarning;
  fieldSliverRisk.classList.toggle("status-bad", plan.sliverWarning === "SLIVER");
  fieldSliverRisk.classList.toggle("status-good", plan.sliverWarning === "OK");
  updateLastBoardPlot(plan);

  sliverWarningValue.classList.toggle("status-bad", plan.sliverWarning === "SLIVER");
  sliverWarningValue.classList.toggle("status-good", plan.sliverWarning === "OK");
  sliverWarningEcho.classList.toggle("status-bad", plan.sliverWarning === "SLIVER");
  sliverWarningEcho.classList.toggle("status-good", plan.sliverWarning === "OK");

  gapRangeNote.textContent =
    "This is the intended spacer target. The range applies to the last board result, not the target gap itself.";
  wholeBoardsNote.textContent = `Perfect case: ${plan.perfectScenario.wholeBoards}  |  expected case: ${plan.expectedScenario.wholeBoards}  |  wide-gap case: ${plan.possibleScenario.wholeBoards}`;
  lastBoardNote.textContent =
    plan.possibleScenario.wholeBoards !== plan.perfectScenario.wholeBoards
      ? `Shown left to right in spacing order. The wide-gap case drops to ${plan.possibleScenario.wholeBoards} full boards, which makes the last board jump to ${formatInches(
          plan.possibleScenario.lastBoardWidth,
        )}.`
      : plan.possibleSliverWarning === "SLIVER" && plan.sliverWarning !== "SLIVER"
        ? `Expected last board is ${formatInches(
            plan.expectedScenario.lastBoardWidth,
          )}, but the full possible range still dips under 2 in. at ${formatInches(
            plan.minLastBoardWidth,
          )}.`
        : `Shown left to right in spacing order from perfect to likely to wide-gap case. Possible range: ${lastBoardPossibleRange}.`;
  purchaseCountNote.textContent =
    "Safe buy count uses the tighter intended gap, because that is the case most likely to need the extra board.";
  sliverWarningNote.textContent =
    'This red alert is based on the expected last board falling under 2 in.';
  fiveBoardCheckNote.textContent =
    plan.fiveBoardCheckMin === null
      ? "This deck is too small to make a five-pieces-left check useful."
      : "When only the last 5 pieces are left, the open space should be in this range.";

  summaryText.textContent = `For a ${formatInches(span)} projection with ${formatInches(
    boardWidth,
  )} boards and a ${formatGap(plan.theoreticalGap)} intended gap, the expected layout stays close to perfect at about ${formatGap(
    plan.expectedGap,
  )}. That leaves about ${formatCountRange(
    plan.minWholeBoards,
    plan.maxWholeBoards,
  )} whole boards, with an expected last board around ${formatInches(
    plan.expectedScenario.lastBoardWidth,
  )}. The possible last-board range runs ${lastBoardPossibleRange}.`;
  fieldNotesSummary.textContent = `Target ${formatGap(
    plan.theoreticalGap,
  )} in the field. The last board is where the range shows up: expected near ${formatInches(
    plan.expectedScenario.lastBoardWidth,
  )}, with a possible spread out to ${lastBoardPossibleRange}. When only 5 boards are left, your remaining opening should be around ${fiveBoardCheckRange}.`;

  if (plan.sliverWarning === "SLIVER") {
    tipsText.textContent =
      "This run is flirting with a skinny last board. Watch the possible range, not just the expected result, and rebalance the layout early if the opening starts running tight.";
    return;
  }

  if (plan.possibleSliverWarning === "SLIVER") {
    tipsText.textContent =
      "The expected last board is still above 2 in., but the wider spacing cases can dip under that line. Keep an eye on the opening as you get closer to the finish edge.";
    return;
  }

  if (plan.exactFit) {
    tipsText.textContent =
      "One end of the spacing range is close to an exact fit. The expected answer stays near theoretical, but the possible range still shows how far the finish can drift.";
    return;
  }

  tipsText.textContent =
    `Expected results are biased toward perfect spacing using about ${EXPECTED_SPREAD_LABEL} of extra spread, while the possible range stretches out to ${POSSIBLE_SPREAD_LABEL} added per gap.`;
}

function showError(message) {
  errorText.textContent = message;
  summaryText.textContent =
    "Add your three inputs to see the board count, expected last board, possible range, and field-check range.";
  gapRangeValue.textContent = "--";
  wholeBoardsValue.textContent = "--";
  lastBoardValue.textContent = "--";
  purchaseCountValue.textContent = "--";
  sliverWarningValue.textContent = "--";
  fiveBoardCheckValue.textContent = "--";
  gapRangeEcho.textContent = "Live in planner";
  lastBoardEcho.textContent = "Watch the rip width";
  wholeBoardsEcho.textContent = "--";
  purchaseCountEcho.textContent = "--";
  sliverWarningEcho.textContent = "--";
  fiveBoardCheckEcho.textContent = "--";
  sliverWarningValue.classList.remove("status-bad", "status-good");
  sliverWarningEcho.classList.remove("status-bad", "status-good");
  fieldGapRange.textContent = "--";
  fieldLastBoard.textContent = "--";
  fieldFiveCheck.textContent = "--";
  fieldSliverRisk.textContent = "--";
  fieldSliverRisk.classList.remove("status-bad", "status-good");
  lastBoardPerfectValue.textContent = "--";
  lastBoardExpectedValue.textContent = "--";
  lastBoardPossibleValue.textContent = "--";
  fieldNotesSummary.textContent =
    "Run the layout first, then flip here for the quick field checklist.";
  gapRangeNote.textContent =
    "This is the intended spacer target. The range applies to the last board result, not the target gap itself.";
  wholeBoardsNote.textContent =
    "Full boards across the field, shown as a range when spacing shifts.";
  lastBoardNote.textContent =
    "The turquoise marker shows the expected result. The whisker shows how far the last board can drift.";
  purchaseCountNote.textContent =
    "Safe buy count using the tighter gap so you do not come up short.";
  sliverWarningNote.textContent =
    'This red alert is based on the expected last board falling under 2 in.';
  fiveBoardCheckNote.textContent =
    "Remaining open space to expect when you are down to the last 5 boards.";
  tipsText.textContent =
    `Expected results are biased toward perfect spacing using about ${EXPECTED_SPREAD_LABEL} of extra spread, while the possible range stretches out to ${POSSIBLE_SPREAD_LABEL} added per gap.`;
}

function handleSubmit(event) {
  event.preventDefault();

  const span = parseMeasurementInches(deckSpanInput.value, true);
  const boardWidth = parseMeasurementInches(boardWidthInput.value, false);
  const theoreticalGap = parseMeasurementInches(boardGapInput.value, false);

  if (!Number.isFinite(span) || span <= 0) {
    showError("Enter a valid deck span like 12' 6\" or 150.");
    return;
  }

  if (!Number.isFinite(boardWidth) || boardWidth <= 0) {
    showError("Enter a valid board width in inches, like 5 1/2.");
    return;
  }

  if (!Number.isFinite(theoreticalGap) || theoreticalGap <= 0) {
    showError("Enter a valid intended board spacing like 3/16 or .1875.");
    return;
  }

  if (boardWidth > span) {
    showError("Board width cannot be larger than the total deck span to cover.");
    return;
  }

  errorText.textContent = "";
  updateResults(calculatePlan(span, boardWidth, theoreticalGap), span, boardWidth);
}

form.addEventListener("submit", handleSubmit);
viewTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    setActiveView(tab.dataset.viewTarget);
  });
});
setActiveView("planner-view");
handleSubmit(new Event("submit"));
