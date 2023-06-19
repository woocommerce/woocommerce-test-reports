const { GoogleAuth } = require('google-auth-library');
const { google } = require('googleapis');
const data = require(process.env.E2E_SUMMARY_JSON);
const credentials = require('./key.json');

// Extract the required information
const { total, skipped, broken, failed } = data.statistic;
const duration = data.time.duration;
const currentDate = new Date().toLocaleDateString('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric'
}).replace(/[\s,]+/g, '-');
// Google Sheet ID and range
const spreadsheetId = '1UjaaOCSGNLWW5hYdtw52P5s_PTBWexHW4_CmwHwvCps';

// Credentials and authentication
// Create an instance of GoogleAuth from the credentials
const auth = new GoogleAuth({
  credentials: credentials,
  scopes: ['https://www.googleapis.com/auth/spreadsheets']
});

// Obtain the client
const client = await auth.getClient();

// Size of test suite
async function appendSuiteSize() {
  const range = 'Size of Test Suite!A:B'; // Specify the range where you want to write the data
  try {
    // Authorize the client
    await client.authorize();

    // Create a new instance of the Sheets API
    const sheets = google.sheets({ version: 'v4', auth: client });

    // Prepare the request body
    const request = {
      spreadsheetId: spreadsheetId,
      range: range,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [[currentDate, total]]
      }
    };

    // Send the request to append values to the sheet
    const response = await sheets.spreadsheets.values.append(request);
    console.log(`${response.data.updates.updatedCells} cells appended.`);
  } catch (err) {
    console.error('Error appending to Google Sheet:', err);
  }
}

// Execution time
async function appendExecutionTime() {
  const range = 'Execution Time!A:B'; // Specify the range where you want to write the data
  try {
    // Authorize the client
    await client.authorize();

    // Create a new instance of the Sheets API
    const sheets = google.sheets({ version: 'v4', auth: client });

    // Prepare the request body
    const request = {
      spreadsheetId: spreadsheetId,
      range: range,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [[currentDate, duration]]
      }
    };

    // Send the request to append values to the sheet
    const response = await sheets.spreadsheets.values.append(request);
    console.log(`${response.data.updates.updatedCells} cells appended.`);
  } catch (err) {
    console.error('Error appending to Google Sheet:', err);
  }
}

// Failed Tests
async function appendFailures() {
  const range = 'Number of Failures!A:B'; // Specify the range where you want to write the data
  try {
    // Authorize the client
    await client.authorize();

    // Create a new instance of the Sheets API
    const sheets = google.sheets({ version: 'v4', auth: client });

    // Prepare the request body
    const request = {
      spreadsheetId: spreadsheetId,
      range: range,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [[currentDate, failed]]
      }
    };

    // Send the request to append values to the sheet
    const response = await sheets.spreadsheets.values.append(request);
    console.log(`${response.data.updates.updatedCells} cells appended.`);
  } catch (err) {
    console.error('Error appending to Google Sheet:', err);
  }
}

// Skipped Tests
async function appendSkipped() {
  const range = 'Number of Skipped!A:B'; // Specify the range where you want to write the data
  try {
    // Authorize the client
    await client.authorize();

    // Create a new instance of the Sheets API
    const sheets = google.sheets({ version: 'v4', auth: client });

    // Prepare the request body
    const request = {
      spreadsheetId: spreadsheetId,
      range: range,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [[currentDate, skipped]]
      }
    };

    // Send the request to append values to the sheet
    const response = await sheets.spreadsheets.values.append(request);
    console.log(`${response.data.updates.updatedCells} cells appended.`);
  } catch (err) {
    console.error('Error appending to Google Sheet:', err);
  }
}

// Skipped Tests
async function appendBroken() {
  const range = 'Number of Broken!A:B'; // Specify the range where you want to write the data
  try {
    // Authorize the client
    await client.authorize();

    // Create a new instance of the Sheets API
    const sheets = google.sheets({ version: 'v4', auth: client });

    // Prepare the request body
    const request = {
      spreadsheetId: spreadsheetId,
      range: range,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [[currentDate, broken]]
      }
    };

    // Send the request to append values to the sheet
    const response = await sheets.spreadsheets.values.append(request);
    console.log(`${response.data.updates.updatedCells} cells appended.`);
  } catch (err) {
    console.error('Error appending to Google Sheet:', err);
  }
}

const today = new Date();

// Size of test suite only measured on the first of the month
if (today.getDate() === 1) {
  // Call the append function
  appendSuiteSize();
} else {
  console.log('Not the first day of the month. Skipping the execution.');
}

// Everything else runs daily
appendExecutionTime();
appendFailures();
appendSkipped();
appendBroken();
