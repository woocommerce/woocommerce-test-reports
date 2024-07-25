/**
 * This script will update the json file containing the list of reports: data/runs.json and data/runs-<month>.json
 * It will take the data of a recently generated report that exists on the disk, and push this data in the existing json file
 * It will read data from report/widgets/summary.json, metadata.json
 */

const { readS3Object, readJson } = require( './utils' );
const path = require( 'path' );
const { PutObjectCommand } = require( '@aws-sdk/client-s3' );
const { s3Params, s3client } = require( './s3-client' );
const moment = require( 'moment' );
const localReportPath = process.env.REPORT_PATH;

if ( ! localReportPath ) {
	throw 'REPORT_PATH env variable is not set';
}

( async () => {
	const metadata = readJson( path.join( localReportPath, 'metadata.json' ) );
	const summary = readJson( path.join( localReportPath, 'widgets/summary.json' ) );
	const month = moment( summary.time.stop ).format( 'YYYY-MM' );

	await updateReportData( metadata, summary, 'data/runs.json' );
	await updateReportData( metadata, summary, `data/runs-${ month }.json` );

	await cleanupOldRuns( 'data/runs.json', 30 );
} )();

async function updateReportData( metadata, summary, runsDataPath ) {
	console.group( '\n', `Updating runs data in ${ runsDataPath }` );
	// Get the existing data
	const fileContent = ( await readS3Object( runsDataPath ) ).toString() || '{}';
	const json = JSON.parse( fileContent );

	const { run_id, report_id, run_attempt, updated_on, ref_name } = metadata;
	const { total, passed, failed, skipped, broken, unknown } = summary.statistic;
	const totalFailed = failed + broken + unknown;

	if ( ! report_id ) {
		throw 'Cannot find report_id in metadata.json';
	}

	// Get the run_id node or create it if it doesn't exist
	if ( ! json[ run_id ] ) {
		json[ run_id ] = {
			updated_on,
			ref_name,
			attempts: {},
		};
	}

	// Get the run_attempt node or create it if it doesn't exist
	//eslint-disable-next-line dot-notation
	if ( ! json[ run_id ][ 'attempts' ][ run_attempt ] ) {
		// Add the properties that should belong to the group -
		// all the reports in this group should have the same values
		//eslint-disable-next-line dot-notation
		json[ run_id ][ 'attempts' ][ run_attempt ] = {};
	}

	//eslint-disable-next-line dot-notation
	json[ run_id ][ 'attempts' ][ run_attempt ][ report_id ] = {
		passed,
		failed: totalFailed,
		skipped,
		total,
	};

	console.log( json[ run_id ] );

	// Write the updated data list locally
	// writeJson( json, path.join( "", `public/${runsDataPath}` ) );

	// Upload the file to S3
	const cmd = new PutObjectCommand( {
		Bucket: s3Params.Bucket,
		Key: runsDataPath,
		Body: JSON.stringify( json ),
		ContentType: 'application/json',
	} );
	await s3client.send( cmd );

	console.groupEnd();
}

async function cleanupOldRuns( runsDataPath, daysThreshold ) {
	console.group( '\n', `Cleaning up old runs from ${ runsDataPath }` );

	const fileContent = ( await readS3Object( runsDataPath ) ).toString() || '{}';
	const runs = JSON.parse( fileContent );

	// Filter out the runs that are older than the threshold
	const filteredRuns = Object.fromEntries(
		Object.entries( runs ).filter(
			( [ runId, run ] ) =>
				moment.duration( moment.utc().diff( moment.utc( run.updated_on ) ) ).as( 'days' ) <
				daysThreshold
		)
	);

	console.log(
		`Removed ${ Object.keys( runs ).length - Object.keys( filteredRuns ).length } runs`
	);

	// Write the updated data list locally
	// writeJson( filteredRuns, path.join( "", `public/${runsDataPath}` ) );

	// Upload to S3
	const cmd = new PutObjectCommand( {
		Bucket: s3Params.Bucket,
		Key: runsDataPath,
		Body: JSON.stringify( filteredRuns, null, 2 ),
		ContentType: 'application/json',
	} );
	await s3client.send( cmd );

	console.groupEnd();
}
