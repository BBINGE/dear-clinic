(() => {
  const titles = [
    "30대 여성 사례", "20대 여성 사례", "30대 여성 사례", "20대 여성 사례",
    "30대 여성 사례", "20대 여성 사례", "40대 여성 사례", "30대 여성 사례",
    "30대 남성 사례", "50대 여성 사례", "40대 여성 사례", "40대 여성 사례",
    "20대 여성 사례", "20대 여성 사례", "30대 여성 사례", "40대 여성 사례",
    "40대 여성 사례",
  ];
  const requested = new URLSearchParams(window.location.search).get("case") || "01";
  const numeric = Number.parseInt(requested, 10);
  const index = Number.isInteger(numeric) && numeric >= 1 && numeric <= titles.length ? numeric - 1 : 0;
  const caseNumber = String(index + 1).padStart(2, "0");
  const title = titles[index];

  document.querySelector("[data-case-number]").textContent = caseNumber;
  document.querySelector("[data-case-title]").textContent = title;
  document.title = `${title} | BE DEER 사례 상세 | 디어한의원`;
})();
