/* global React, ReactDOM, html2canvas */

const { useMemo, useState } = React;

const ACTIVITIES = [
  {
    phase: "Proposing",
    tasks: [
      { name: "Proposal of Work Development", duration: 30 },
      { name: "Proposal of Work TSC Review", duration: 1 },
      { name: "Proposal of Work All Members Review", duration: 14 },
      { name: "TSC PoW Approval", duration: 14 },
      { name: "BoD PoW Approval", duration: 1 },
    ],
  },
  {
    phase: "Structuring and Chartering",
    tasks: [
      { name: "Infrastructure Deployment", duration: 2 },
      { name: "Call for Participation & Voting Rights", duration: 14 },
      { name: "Call for Candidates (Chair and Vice-Chair)", duration: 14 },
      { name: "Chair Elections", duration: 14 },
      { name: "Charter Development", duration: 30 },
      {
        name:
          "Charter Approval by 2/3 of the Voting Members of the Technical Committee",
        duration: 1,
      },
      { name: "Charter Review by TSC", duration: 1 },
      { name: "Charter Approval by TSC", duration: 14 },
    ],
  },
  {
    phase: "Active",
    tasks: [
      { name: "Present Work Progress to TSC", duration: 14 },
      { name: "Work Development", duration: 365 },
    ],
  },
  {
    phase: "Disbanded",
    tasks: [{ name: "Group Disbanded", duration: 14 }],
  },
];

const PHASE_ORDER = ACTIVITIES.map((item) => item.phase);

const buildDefaultTasks = () =>
  ACTIVITIES.flatMap((phaseBlock, phaseIndex) =>
    phaseBlock.tasks.map((task, taskIndex) => ({
      id: `${phaseIndex}-${taskIndex}`,
      phase: phaseBlock.phase,
      name: task.name,
      duration: task.duration,
    }))
  );

const toPhaseClass = (phase) =>
  String(phase || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");

const todayISO = () => new Date().toISOString().split("T")[0];

const parseISODate = (value) => {
  if (!value) return null;
  const parts = value.split("-");
  if (parts.length !== 3) return null;
  const [year, month, day] = parts.map((part) => parseInt(part, 10));
  if (!year || !month || !day) return null;
  return new Date(Date.UTC(year, month - 1, day));
};

const formatDate = (date) => date.toISOString().split("T")[0];

const addDays = (date, days) => {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
};

const addMonths = (date, months) => {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  const targetMonth = month + months;
  const targetYear = year + Math.floor(targetMonth / 12);
  const targetMonthIndex = ((targetMonth % 12) + 12) % 12;
  const daysInTargetMonth = new Date(
    Date.UTC(targetYear, targetMonthIndex + 1, 0)
  ).getUTCDate();
  const nextDay = Math.min(day, daysInTargetMonth);
  return new Date(Date.UTC(targetYear, targetMonthIndex, nextDay));
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const isApprovalActivity = (name) => /approval/i.test(String(name || ""));

const calculateSchedule = (tasks, startDateStr) => {
  const startDate = parseISODate(startDateStr) || parseISODate(todayISO());
  let cursor = startDate;
  let bodPowDate = null;

  const computed = [];
  tasks.forEach((task) => {
    const isPresentWorkProgress =
      task.phase === "Active" &&
      task.name === "Present Work Progress to TSC" &&
      bodPowDate;

    const taskStart = isPresentWorkProgress
      ? addMonths(bodPowDate, 6)
      : cursor;

    let duration = parseInt(task.duration, 10) || 0;
    if (task.name === "Work Development") {
      duration = clamp(duration, 0, 1095);
    }

    const endDate = duration > 0 ? addDays(taskStart, duration - 1) : taskStart;

    if (task.name === "BoD PoW Approval") {
      bodPowDate = endDate;
    }

    if (!isPresentWorkProgress && duration > 0) {
      cursor = addDays(endDate, 1);
    }

    computed.push({
      ...task,
      duration,
      startStr: formatDate(taskStart),
      endStr: formatDate(endDate),
    });
  });

  return computed;
};

const buildPhaseSummaries = (computedTasks) =>
  PHASE_ORDER.map((phase) => {
    const phaseTasks = computedTasks.filter((task) => task.phase === phase);
    let minStart = null;
    let maxEnd = null;
    let totalDuration = 0;

    phaseTasks.forEach((task) => {
      const start = parseISODate(task.startStr);
      const end = parseISODate(task.endStr);
      if (start && (!minStart || start < minStart)) minStart = start;
      if (end && (!maxEnd || end > maxEnd)) maxEnd = end;
      totalDuration += task.duration || 0;
    });

    return {
      phase,
      startStr: minStart ? formatDate(minStart) : "",
      endStr: maxEnd ? formatDate(maxEnd) : "",
      duration: totalDuration,
    };
  });

const buildTotals = (computedTasks) => {
  let minStart = null;
  let maxEnd = null;
  let bodApproval = null;
  let charterApproval = null;

  computedTasks.forEach((task) => {
    const start = parseISODate(task.startStr);
    const end = parseISODate(task.endStr);
    if (start && (!minStart || start < minStart)) minStart = start;
    if (end && (!maxEnd || end > maxEnd)) maxEnd = end;
    if (task.name === "BoD PoW Approval") bodApproval = end;
    if (task.name === "Charter Approval by TSC") charterApproval = end;
  });

  let totalDays = 0;
  if (minStart && maxEnd) {
    const msPerDay = 24 * 60 * 60 * 1000;
    totalDays = Math.max(1, Math.round((maxEnd - minStart) / msPerDay) + 1);
  }

  return {
    bodApproval: bodApproval ? formatDate(bodApproval) : "N/A",
    charterApproval: charterApproval ? formatDate(charterApproval) : "N/A",
    totalDays: totalDays || "N/A",
  };
};

const downloadText = (filename, text, type) => {
  const blob = new Blob([text], { type: type || "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const App = () => {
  const [startDate, setStartDate] = useState(todayISO());
  const [tasks, setTasks] = useState(buildDefaultTasks);

  const computedTasks = useMemo(
    () => calculateSchedule(tasks, startDate),
    [tasks, startDate]
  );
  const phaseSummaries = useMemo(
    () => buildPhaseSummaries(computedTasks),
    [computedTasks]
  );
  const totals = useMemo(() => buildTotals(computedTasks), [computedTasks]);

  const updateDuration = (id, value) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id ? { ...task, duration: value } : task
      )
    );
  };

  const resetDefaults = () => {
    setTasks(buildDefaultTasks());
    setStartDate(todayISO());
  };

  const exportDetailedCSV = () => {
    const header = '"Phase","Activity","Start Date","End Date","Duration (Days)"\n';
    const rows = computedTasks
      .map(
        (task) =>
          `"${task.phase}","${task.name}","${task.startStr}","${task.endStr}","${task.duration}"`
      )
      .join("\n");
    const currentDate = todayISO();
    downloadText(
      `group-plan-detailed-${currentDate}.csv`,
      header + rows,
      "text/csv;charset=utf-8"
    );
  };

  const exportPhaseSummary = () => {
    const header = '"Phase","Start Date","End Date","Duration (Days)"\n';
    const rows = phaseSummaries
      .map(
        (summary) =>
          `"${summary.phase}","${summary.startStr}","${summary.endStr}","${summary.duration}"`
      )
      .join("\n");
    const currentDate = todayISO();
    downloadText(
      `group-plan-phase-summary-${currentDate}.csv`,
      header + rows,
      "text/csv;charset=utf-8"
    );
  };

  const saveImage = () => {
    const target = document.getElementById("plan-canvas");
    if (!target || !html2canvas) return;
    const currentDate = todayISO();

    const fontReady =
      document.fonts && document.fonts.ready
        ? document.fonts.ready
        : Promise.resolve();

    fontReady
      .then(() =>
        html2canvas(target, {
          scale: 2,
          backgroundColor: "#f4efe7",
          useCORS: true,
          width: target.scrollWidth,
          height: target.scrollHeight,
          windowWidth: target.scrollWidth,
          windowHeight: target.scrollHeight,
          onclone: (doc) => {
            doc.body.style.background =
              "radial-gradient(circle at 10% 10%, #fff9f2 0%, transparent 45%)," +
              "radial-gradient(circle at 90% 5%, #eff7ff 0%, transparent 40%)," +
              "linear-gradient(135deg, #f4efe7, #eef3fb)";
            const cloned = doc.getElementById("plan-canvas");
            if (cloned) {
              cloned.style.boxShadow = "none";
              cloned.style.backdropFilter = "none";
              cloned.style.background = "#ffffff";
              cloned.style.border = "1px solid rgba(28, 36, 48, 0.08)";
            }
          },
        })
      )
      .then((canvas) => {
        const link = document.createElement("a");
        link.download = `group-plan-${currentDate}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
      })
      .catch(() => {});
  };

  return (
    <div className="container" id="plan-canvas">
      <header className="header">
        <img className="logo" src="assets/riscv.png" alt="RISC-V logo" />
        <div className="title-block">
          <h1>Technical Committee Plan Editor</h1>
          <p>
            Build a realistic working-group timeline with the official cadence,
            milestones, and review gates.
          </p>
        </div>
      </header>

      <section className="controls">
        <div className="control-group">
          <label htmlFor="start-date">Plan Start</label>
          <input
            id="start-date"
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
          />
        </div>
        <div className="control-note">
          Present Work Progress always starts 6 months after BoD PoW Approval.
        </div>
      </section>

      <table>
        <thead>
          <tr>
            <th>Phase</th>
            <th>Activity</th>
            <th>Start Date</th>
            <th>End Date</th>
            <th>Duration (Days)</th>
          </tr>
        </thead>
        <tbody>
          {computedTasks.map((task) => {
            const isWorkDevelopment = task.name === "Work Development";
            const maxDuration = isWorkDevelopment ? 1095 : 500;
            const showWarning = isWorkDevelopment && task.duration > 731;

            return (
              <tr key={task.id} className={toPhaseClass(task.phase)}>
                <td>{task.phase}</td>
                <td>
                  <div className="activity-cell">
                    <span>{task.name}</span>
                    {isApprovalActivity(task.name) && (
                      <i
                        className="fa-solid fa-triangle-exclamation approval-icon"
                        aria-hidden="true"
                      />
                    )}
                    {isWorkDevelopment && (
                      <span className="duration-warning" hidden={!showWarning}>
                        <i className="fa-solid fa-circle-exclamation" />
                        TSC must approve continuation beyond 2 years.
                      </span>
                    )}
                  </div>
                </td>
                <td>{task.startStr}</td>
                <td>{task.endStr}</td>
                <td>
                  <div className="slider-wrap">
                    <input
                      type="range"
                      min="0"
                      max={maxDuration}
                      value={task.duration}
                      onChange={(event) =>
                        updateDuration(task.id, parseInt(event.target.value, 10))
                      }
                    />
                    <span>{task.duration}</span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="summary-bar">
        {phaseSummaries.map((summary, index) => (
          <div
            key={summary.phase}
            className={`summary-card ${toPhaseClass(summary.phase)}`}
            style={{ "--delay": `${index * 0.05}s` }}
          >
            <strong>{summary.phase}</strong>
            <div>End Date: {summary.endStr || "—"}</div>
            <div>{summary.duration ? `${summary.duration} days` : "—"}</div>
          </div>
        ))}
      </div>

      <div className="info-bar">
        For Group Approval by {totals.bodApproval} | Charter Approval by{" "}
        {totals.charterApproval} | Total Lifecycle: {totals.totalDays} Days
      </div>

      <table className="summary-table">
        <thead>
          <tr>
            <th>Phase</th>
            <th>Start Date</th>
            <th>End Date</th>
            <th>Duration (Days)</th>
          </tr>
        </thead>
        <tbody>
          {phaseSummaries.map((summary) => (
            <tr key={summary.phase} className={toPhaseClass(summary.phase)}>
              <td>{summary.phase}</td>
              <td>{summary.startStr}</td>
              <td>{summary.endStr}</td>
              <td>{summary.duration}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="footer-actions">
        <button className="button" type="button" onClick={resetDefaults}>
          Reset to Default
        </button>
        <button className="button primary" type="button" onClick={saveImage}>
          Save Image
        </button>
        <button
          className="button secondary"
          type="button"
          onClick={exportDetailedCSV}
        >
          Export Detailed Plan
        </button>
        <button
          className="button secondary"
          type="button"
          onClick={exportPhaseSummary}
        >
          Export Phase Summary
        </button>
      </div>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
