/**
 * This script will update the json file containing the list of reports: data/reports.json
 * It will take the data of a recently generated report that exists on the disk, and push this data in the existing json file
 * It will read data from $reportID/report/widgets/summary.json, $reportID/metadata.json
 */

const { readS3Object, readJson, getLocalReportsPaths } = require( './utils' );
const path = require( 'path' );
const { PutObjectCommand } = require( '@aws-sdk/client-s3' );
const { s3Params, s3client } = require( './s3-client' );

const reports = getLocalReportsPaths();
let json = { reports: [] };

( async () => {
	// Get the existing reports list
	json = JSON.parse( ( await readS3Object( 'data/reports.json' ) ).toString() );

	for ( const reportPath of reports ) {
		await updateReportData(reportPath);
	}

	// Write the updated errors list locally
	// writeJson( json, path.join( "", 'reports.json' ) );

	// Upload the report to S3
	const cmd = new PutObjectCommand( {
		Bucket: s3Params.Bucket,
		Key: 'data/reports.json',
		Body: JSON.stringify( json, null, 2 ),
		ContentType: 'application/json',
	} );
	await s3client.send( cmd );
} )();

async function updateReportData( reportPath ) {
	const reportId = path.basename( reportPath );

	// Get the report statistics from report/widgets/summary.json
	const statistic = readJson( path.join( reportPath, 'report/widgets/summary.json' ) ).statistic;

	// Get the metadata
	const metadata = readJson( path.join( reportPath, 'metadata.json' ) ) || {
		branch: '',
		pr_number: '',
		pr_title: '',
		run_id: '',
		run_number: '',
		updated_on: '',
	};

	// Create the report entry
	const isFailed = statistic.total !== statistic.passed + statistic.skipped;
	const report = {
		name: reportId,
		lastUpdate: metadata.updated_on ? metadata.updated_on : '1970-01-01',
		statistic,
		metadata,
		history: isFailed ? 'F' : 'P',
	};

	console.log( report );
	const reportIndex = json.reports.findIndex( r => r.name === reportId );

	if ( reportIndex !== -1 ) {
		// Update the report entry in the reports list
		if ( json.reports[ reportIndex ].history ) {
			report.history = json.reports[ reportIndex ].history + report.history;
			report.history = report.history.substring(report.history.length - 200);
		}
		json.reports[ reportIndex ] = report;
	} else {
		// push new report
		json.reports.push( report );
	}

	json.reportsCount = json.reports.length;
	json.lastUpdate = new Date().toISOString();
}
