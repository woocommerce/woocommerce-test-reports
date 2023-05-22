module.exports = ({ core }) => {
  const { GITHUB_WORKSPACE, REPORT_URL, S3_WEB_ENDPOINT } = process.env;
  const path = require('path');

  const dashboardHome =
    'https://woocommerce.github.io/woocommerce-test-reports/';
  const localHome = `${GITHUB_WORKSPACE}/docs/`;
  const s3WebHome = `${S3_WEB_ENDPOINT}/public/`;

  const localDir = path.normalize(REPORT_URL.replace(dashboardHome, localHome));
  const s3WebDir = path.normalize(REPORT_URL.replace(dashboardHome, s3WebHome));

  core.setOutput('local-dir', localDir);
  core.setOutput('s3-web-dir', s3WebDir);
};
