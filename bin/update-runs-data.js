/**
 * This script will update the json file containing the list of reports: data/runs.json and data/runs-<month>.json
 * It will take the data of a recently generated report that exists on the disk, and push this data in the existing json file
 * It will read data from report/widgets/summary.json, metadata.json
 */

const { readS3Object, readJson, writeJson} = require( './utils' );
const path = require( 'path' );
const { PutObjectCommand } = require( '@aws-sdk/client-s3' );
const { s3Params, s3client } = require( './s3-client' );
const moment = require( 'moment' );
const localReportPath = process.env.REPORT_PATH;

if ( ! localReportPath ) {
	throw 'REPORT_PATH env variable is not set';
}

( async () => {
	const metadata = readJson( path.join( localReportPath, 'metadata.json' ) )
	const summary = readJson( path.join( localReportPath, 'widgets/summary.json' ) );
	const month = moment( summary.time.stop ).format( 'YYYY-MM' );

	await updateReportData(metadata, summary, 'data/runs.json');
	await updateReportData(metadata, summary, `data/runs-${ month }.json` );
} )();

async function updateReportData( metadata, summary, runsDataPath ) {
	// Get the existing reports list
	const reportsData = ( await readS3Object( runsDataPath ) ).toString() || '{}';
	const json = JSON.parse( reportsData );

	const  { run_id, report_id, run_attempt, updated_on, ref_name } = metadata;
	const { total, passed, failed, skipped, broken, unknown } = summary.statistic;
	const results = {
		passed,
		failed: failed + broken + unknown,
		skipped,
		total,
	};

	if ( ! report_id ) {
		throw 'Cannot find report_id in metadata.json';
	}

	// Get the run_id node or create it if it doesn't exist
	if ( ! json[run_id] ) {
		json[run_id] = {
			updated_on,
			ref_name,
			attempts: {},
		};
	}

	// Get the run_attempt node or create it if it doesn't exist
	if ( ! json[run_id]['attempts'][run_attempt] ) {
		// Add the properties that should belong to the group -
		// all the reports in this group should have the same values
		json[run_id]['attempts'][run_attempt] = {
			report_id: { passed, failed, skipped, total }
		};
	}

	console.log( json[run_id] );

	json.lastUpdate = new Date().toISOString();

	// Write the updated data list locally
	// writeJson( json, path.join( "", `public/${runsDataPath}` ) );

	// Upload the report to S3
	const cmd = new PutObjectCommand( {
		Bucket: s3Params.Bucket,
		Key: runsDataPath,
		Body: JSON.stringify( json, null, 2 ),
		ContentType: 'application/json',
	} );

	await s3client.send( cmd );
}
