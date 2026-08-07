(() => {
  const cases = [
    { age: "30대", sex: "여성", weight: [110.7, 75.9], muscle: [33.2, 29.0], fat: [51.2, 23.8] },
    { age: "20대", sex: "여성", weight: [83.5, 75.3], muscle: [29.3, 27.6], fat: [30.9, 25.6] },
    { age: "30대", sex: "여성", weight: [60.4, 52.0], muscle: [22.3, 20.3], fat: [20.4, 15.5] },
    { age: "20대", sex: "여성", weight: [77.2, 70.6], muscle: [26.8, 25.5], fat: [29.1, 24.8] },
    { age: "30대", sex: "여성", weight: [60.6, 55.1], muscle: [20.5, 21.1], fat: [23.8, 17.3] },
    { age: "20대", sex: "여성", weight: [57.4, 52.0], muscle: [21.4, 19.2], fat: [19.1, 17.6] },
    { age: "40대", sex: "여성", weight: [76.6, 71.3], muscle: [25.5, 25.3], fat: [30.8, 25.7] },
    { age: "30대", sex: "여성", weight: [50.5, 46.4], muscle: [19.9, 19.6], fat: [14.7, 11.2] },
    { age: "30대", sex: "남성", weight: [94.3, 90.7], muscle: [42.3, 41.8], fat: [18.4, 15.7] },
    { age: "50대", sex: "여성", weight: [96.9, 66.6], muscle: [26.9, 23.1], fat: [48.8, 25.3] },
    { age: "40대", sex: "여성", weight: [78.6, 63.1], muscle: [24.8, 22.7], fat: [34.0, 22.3] },
    { age: "40대", sex: "여성", weight: [61.3, 49.5], muscle: [22.5, 21.1], fat: [20.9, 11.6] },
    { age: "20대", sex: "여성", weight: [77.4, 66.2], muscle: [26.0, 24.0], fat: [30.6, 23.0] },
    { age: "20대", sex: "여성", weight: [84.5, 74.8], muscle: [26.3, 24.7], fat: [37.1, 30.4] },
    { age: "30대", sex: "여성", weight: [62.9, 53.4], muscle: [20.9, 19.8], fat: [25.2, 17.7] },
    { age: "40대", sex: "여성", weight: [58.0, 48.7], muscle: [23.6, 22.4], fat: [15.7, 8.6] },
    { age: "40대", sex: "여성", weight: [73.0, 64.4], muscle: [24.2, 23.3], fat: [29.6, 22.7] },
  ];

  const metricLabels = {
    weight: "체중",
    muscle: "골격근량",
    fat: "체지방량",
  };

  const format = (value) => value.toFixed(1);
  const formatDelta = (start, current) => {
    const difference = Number((current - start).toFixed(1));
    return `${difference > 0 ? "+" : "−"}${Math.abs(difference).toFixed(1)}`;
  };

  document.querySelectorAll(".case-record").forEach((card, index) => {
    const data = cases[index];
    if (!data) return;

    const title = card.querySelector("h2");
    if (title) title.textContent = `${data.age} ${data.sex} 사례`;

    const metrics = document.createElement("dl");
    metrics.className = "case-record__metrics";
    metrics.setAttribute("aria-label", `${data.age} ${data.sex} 사례 체성분 수치 변화`);

    Object.entries(metricLabels).forEach(([key, label]) => {
      const [start, current] = data[key];
      const item = document.createElement("div");
      item.innerHTML = `
        <dt>${label}</dt>
        <dd>
          <span class="case-metric__route"><b>${format(start)}</b><i aria-hidden="true">→</i><b>${format(current)}</b><small>kg</small></span>
          <span class="case-metric__delta">${formatDelta(start, current)}<small>kg</small><svg viewBox="0 0 120 58" preserveAspectRatio="none" aria-hidden="true"><path d="M7 31C8 11 35 4 66 6c31 1 49 10 47 25-2 16-29 22-59 21C24 52 5 45 7 31Z"/><path d="M10 29C14 9 41 5 70 8c29 2 44 12 40 27-4 14-30 19-58 16C23 49 7 42 10 29Z"/></svg></span>
        </dd>`;
      metrics.appendChild(item);
    });

    const actions = document.createElement("div");
    actions.className = "case-record__actions";
    const caseNumber = String(index + 1).padStart(2, "0");
    actions.innerHTML = `<a href="be-deer-case.html?case=${caseNumber}" aria-label="${data.age} ${data.sex} 사례 자세히 보기">자세히 보기 <span aria-hidden="true">→</span></a>`;

    card.append(metrics, actions);
  });
})();
