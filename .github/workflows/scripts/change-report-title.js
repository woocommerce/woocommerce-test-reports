const { readFileSync, writeFileSync } = require("fs");
const { REPORT_TITLE, INDEX_HTML_PATH, SUMMARY_JSON_PATH } = process.env;

const changeIndexHtmlTitle = () => {
  const originalContent = readFileSync(INDEX_HTML_PATH);
  const newContent = originalContent
    .toString()
    .replace("<title>Allure Report</title>", `<title>${REPORT_TITLE}</title>`);

  writeFileSync(INDEX_HTML_PATH, newContent);
};

const changeSummaryJsonTitle = () => {
  const summary = require(SUMMARY_JSON_PATH);
  summary.reportName = REPORT_TITLE;

  writeFileSync(SUMMARY_JSON_PATH, JSON.stringify(summary));
};

changeIndexHtmlTitle();

changeSummaryJsonTitle();
