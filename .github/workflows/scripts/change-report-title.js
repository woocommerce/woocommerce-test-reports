const { readFileSync, writeFileSync } = require("fs");

const args = process.argv.slice(2);
const REPORT_TITLE = args[0];
const INDEX_HTML = args[1];
const SUMMARY_JSON = args[2];

const changeIndexHtmlTitle = () => {
  const originalContent = readFileSync(INDEX_HTML);
  const newContent = originalContent
    .toString()
    .replace("<title>Allure Report</title>", `<title>${REPORT_TITLE}</title>`);

  writeFileSync(INDEX_HTML, newContent);
};

const changeSummaryJsonTitle = () => {
  const summary = require(SUMMARY_JSON);
  summary.reportName = REPORT_TITLE;

  writeFileSync(SUMMARY_JSON, summary);
};

changeIndexHtmlTitle();

changeSummaryJsonTitle();
