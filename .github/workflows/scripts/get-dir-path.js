module.exports = ({ core }) => {
  const { GITHUB_WORKSPACE, REPORT_URL } = process.env;
  const path = require('path');

  const homeURL = 'https://woocommerce.github.io/woocommerce-test-reports/';
  const homeDir = `${GITHUB_WORKSPACE}/docs/`;
  const absolute = path.normalize(REPORT_URL.replace(homeURL, homeDir));

  core.setOutput('absolute', absolute);
};
