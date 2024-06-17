/**
 * This script will update the json file containing the list of reports: data/reports.json
 * It will take the data of a recently generated report that exists on the disk, and push this data in the existing json file
 * It will read data from $reportID/report/widgets/summary.json, $reportID/metadata.json
 */

const { readS3Object, readJson } = require( './utils' );
const path = require( 'path' );
const { PutObjectCommand } = require( '@aws-sdk/client-s3' );
const { s3Params, s3client } = require( './s3-client' );


const localReportPath = process.env.REPORT_PATH;

if ( ! localReportPath ) {
	throw 'REPORT_PATH env variable is not set';
}

( async () => {
	// Get the existing reports list
	const reportsData = ( await readS3Object( 'data/reports.json' ) ).toString() || '{}';
	const json = JSON.parse( reportsData );
	const updatedJson = await updateReportData(localReportPath, json);

	// Write the updated reports list locally
	// writeJson( updatedJson, path.join( "", 'reports.json' ) );

	// Upload the report to S3
	const cmd = new PutObjectCommand( {
		Bucket: s3Params.Bucket,
		Key: 'data/reports.json',
		Body: JSON.stringify( updatedJson, null, 2 ),
		ContentType: 'application/json',
	} );
	await s3client.send( cmd );
} )();

async function updateReportData( reportPath, json ) {
	// Get the metadata
	const metadata = readJson( path.join( reportPath, 'metadata.json' ) )
	const  { report_id, event_name, group } = metadata;

	if ( ! report_id ) {
		throw 'Cannot find report_id in metadata.json';
	}

	// Get the event node or create it if it doesn't exist
	if ( ! json[event_name] ) {
		json[event_name] = {};
	}

	// Get the group node or create it if it doesn't exist
	if ( ! json[event_name][group] ) {
		// Add the properties that should belong to the group -
		// all the reports in this group should have the same values
		json[event_name][group] = {
			lastUpdate: new Date().toISOString(),
			pr_number: metadata.pr_number,
			report_title: metadata.report_title,
			ref_name: metadata.ref_name,
			sha: metadata.sha,
			reports: [],
		};
	}

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
		...metadata,
		results,
	};

	const reports = json[event_name][group].reports;
	console.log( report );
	const reportIndex = reports.findIndex( r => r.report_id === report_id );

	if ( reportIndex !== -1 ) {
		// Update the report entry in the reports list
		if ( reports[ reportIndex ].history ) {
			report.history = reports[ reportIndex ].history + report.history;
			report.history = report.history.substring(report.history.length - 200);
		}
		reports[ reportIndex ] = report;
	} else {
		// push new report
		reports.push( report );
	}

	json.lastUpdate = new Date().toISOString();
	return json;
}
