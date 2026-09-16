(() => {
  // 사례별 연령대와 성별. 문구는 페이지 언어에 따라 조립한다.
  const profiles = [
    [30, "f"], [20, "f"], [30, "f"], [20, "f"],
    [30, "f"], [20, "f"], [40, "f"], [30, "f"],
    [30, "m"], [50, "f"], [40, "f"], [40, "f"],
    [20, "f"], [20, "f"], [30, "f"], [40, "f"],
    [40, "f"],
  ];

  const I18N = {
    ko: {
      age: { 20: "20대", 30: "30대", 40: "40대", 50: "50대" },
      sex: { f: "여성", m: "남성" },
      caseOf: (a, x) => a + " " + x + " 사례",
      docTitle: (t) => t + " | BE DEER 사례 상세 | 디어한의원",
    },
    en: {
      age: { 20: "20s", 30: "30s", 40: "40s", 50: "50s" },
      sex: { f: "female", m: "male" },
      caseOf: (a, x) => "Case · " + x + " in " + a,
      docTitle: (t) => t + " | BE DEER case record | DEAR Korean Medicine Clinic",
    },
    ja: {
      age: { 20: "20代", 30: "30代", 40: "40代", 50: "50代" },
      sex: { f: "女性", m: "男性" },
      caseOf: (a, x) => a + x + "の事例",
      docTitle: (t) => t + " | BE DEER 事例の詳細 | DEAR韓医院",
    },
    zh: {
      age: { 20: "20多岁", 30: "30多岁", 40: "40多岁", 50: "50多岁" },
      sex: { f: "女性", m: "男性" },
      caseOf: (a, x) => a + x + "案例",
      docTitle: (t) => t + " | BE DEER 案例详情 | DEAR韩医院",
    },
  };

  const pageLang = (() => {
    const path = window.location.pathname.toLowerCase();
    if (path.startsWith("/en/")) return "en";
    if (path.startsWith("/ja/")) return "ja";
    if (path.startsWith("/zh-cn/")) return "zh";
    const declared = (document.documentElement.getAttribute("lang") || "ko").toLowerCase();
    if (declared.indexOf("en") === 0) return "en";
    if (declared.indexOf("ja") === 0) return "ja";
    if (declared.indexOf("zh") === 0) return "zh";
    return "ko";
  })();

  const T = I18N[pageLang] || I18N.ko;

  const requested = new URLSearchParams(window.location.search).get("case") || "01";
  const numeric = Number.parseInt(requested, 10);
  const index = Number.isInteger(numeric) && numeric >= 1 && numeric <= profiles.length ? numeric - 1 : 0;
  const caseNumber = String(index + 1).padStart(2, "0");
  const [age, sex] = profiles[index];
  const title = T.caseOf(T.age[age], T.sex[sex]);

  document.querySelector("[data-case-number]").textContent = caseNumber;
  document.querySelector("[data-case-title]").textContent = title;
  document.title = T.docTitle(title);
})();
