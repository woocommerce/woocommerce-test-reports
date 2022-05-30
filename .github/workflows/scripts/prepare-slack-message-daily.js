const { readFileSync } = require("fs");
const { COMMIT_MESSAGE, RUN_ID } = process.env;
const API_SUMMARY_JSON = "../../../docs/daily/api/allure-report/widgets/summary.json";
const SLACK_MESSAGE_TEMPLATE = readFileSync(
  "./templates/SLACK_DAILY.json"
).toString();

const getStats = (summaryPath) => {
  const summary = require(summaryPath);
  const { failed, broken, skipped, passed, unknown, total } = summary.statistic;
  const { duration } = summary.time;
  const durationMinutes = Math.floor(duration / 60000);
  const durationSeconds = Math.floor((duration / 1000) % 60);
  const durationFormatted = (
    durationMinutes > 0 ? `${durationMinutes}m ` : ""
  ).concat(`${durationSeconds}s`);

  return {
    passed,
    failed,
    skipped,
    broken,
    unknown,
    total,
    durationFormatted,
  };
};

const getFormattedDate = () => {
  const date = new Date();
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
};

const {
  passed: passedApi,
  failed: failedApi,
  skipped: skippedApi,
  broken: brokenApi,
  unknown: unknownApi,
  total: totalApi,
  durationFormatted: durationApi,
} = getStats(API_SUMMARY_JSON);

const HEADER_DATE = getFormattedDate();

const slackMessage = SLACK_MESSAGE_TEMPLATE.replace(/\$DATE/g, HEADER_DATE)
  .replace(/\$COMMIT_MESSAGE/g, COMMIT_MESSAGE)
  .replace(/\$RUN_ID/g, RUN_ID)
  .replace(/\$PASSED_API/g, passedApi)
  .replace(/\$FAILED_API/g, failedApi)
  .replace(/\$SKIPPED_API/g, skippedApi)
  .replace(/\$BROKEN_API/g, brokenApi)
  .replace(/\$UNKNOWN_API/g, unknownApi)
  .replace(/\$TOTAL_API/g, totalApi)
  .replace(/\$DURATION_API/g, durationApi);

console.log(slackMessage);
