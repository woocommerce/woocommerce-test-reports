/**
 * This script will update the json file containing the list of reports: data/reports.json
 * It will take the data of a recently generated report that exists on the disk, and push this data in the existing json file
 * It will read data from $reportID/report/widgets/summary.json, $reportID/metadata.json
 */

const { acquireLockWithRetry, readS3Object, readJson, releaseLock } = require( './utils' );
const path = require( 'path' );
const { PutObjectCommand } = require( '@aws-sdk/client-s3' );
const { s3Params, s3client } = require( './s3-client' );

const localReportPath = process.env.REPORT_PATH;
const fileKey = 'data/reports.json';

if ( ! localReportPath ) {
	throw 'REPORT_PATH env variable is not set';
}

( async () => {
	// Get the existing reports list
	await acquireLockWithRetry( fileKey, true );
	const reportsData = ( await readS3Object( fileKey ) ).toString() || '{}';
	const json = JSON.parse( reportsData );
	const updatedJson = await updateReportData( localReportPath, json );

	// Write the updated reports list locally
	// writeJson( updatedJson, path.join( "", 'reports.json' ) );

	// Upload the report to S3
	const cmd = new PutObjectCommand( {
		Bucket: s3Params.Bucket,
		Key: fileKey,
		Body: JSON.stringify( updatedJson ),
		ContentType: 'application/json',
	} );
	await s3client.send( cmd );
	await releaseLock( fileKey );
} )();

function determineReportsGroupStatus(reports) {
	let status = 'P'; // Default status is 'P' (passed)

	for (const report of reports) {
		const history = report.history;
		if (history.endsWith('F')) {
			return 'F'; // If any report ends with 'F', set status to 'F' (failure)
		}
		if (history.includes('F')) {
			status = 'R'; // If any report contains 'F' but ends with 'P', set status to 'R' (recovered)
		}
	}

	return status;
}

async function updateReportData( reportPath, json ) {
	// Get the metadata
	const metadata = readJson( path.join( reportPath, 'metadata.json' ) );
	const { report_id, event_name, group } = metadata;

	if ( ! report_id ) {
		throw 'Cannot find report_id in metadata.json';
	}

	// Get the event node or create it if it doesn't exist
	if ( ! json[ event_name ] ) {
		json[ event_name ] = {};
	}

	// Get the group node or create it if it doesn't exist
	if ( ! json[ event_name ][ group ] ) {
		json[ event_name ][ group ] = {
			reports: [],
		};
	}

	json[ event_name ][ group ] = {
		...json[ event_name ][ group ],
		status: '',
		lastUpdate: new Date().toISOString(),
		pr_number: metadata.pr_number,
		report_title: metadata.report_title,
		ref_name: metadata.ref_name,
		sha: metadata.sha,
	};

	// Get the report statistics from report/widgets/summary.json
	const statistic = readJson( path.join( reportPath, 'widgets/summary.json' ) ).statistic;
	const { total, passed, failed, skipped, broken, unknown } = statistic;
	const results = {
		passed,
		failed: failed + broken + unknown,
		skipped,
		total,
	};

	// Create the report entry
	const isFailed = statistic.total !== statistic.passed + statistic.skipped;
	const report = {
		history: isFailed ? 'F' : 'P',
		report_id: metadata.report_id,
		suite: metadata.suite,
		run_id: metadata.run_id,
		run_attempt: metadata.run_attempt,
		sha: metadata.sha,
		path: metadata.path,
		updated_on: metadata.updated_on,
		results,
	};

	const reports = json[ event_name ][ group ].reports;
	console.log( report );
	const reportIndex = reports.findIndex( r => r.report_id === report_id );

	if ( reportIndex !== -1 ) {
		// Update the report entry in the reports list
		if ( reports[ reportIndex ].history ) {
			report.history = reports[ reportIndex ].history + report.history;
			report.history = report.history.substring( report.history.length - 200 );
		}
		reports[ reportIndex ] = report;
	} else {
		// push new report
		reports.push( report );
	}

	// Update the status of the reports group
	json[ event_name ][ group ].status = determineReportsGroupStatus( reports );

	json.lastUpdate = new Date().toISOString();
	return json;
}
