/**
 * This script will update the json file containing the list of errors: data/errors.json
 * It will take the data of a recently generated report that exists on the disk, and push this data in the existing json file
 * It will read data from files in $reportID/report/data/test-cases
 */

const { readJson, cleanError, getJSONFromS3 } = require( './utils' );
const path = require( 'path' );
const { PutObjectCommand } = require( '@aws-sdk/client-s3' );
const { s3Params, s3client } = require( './s3-client' );

const localReportPath = process.env.REPORT_PATH;
const fileKey = 'data/errors.json';

if ( ! localReportPath ) {
	throw 'REPORT_PATH env variable is not set';
}

( async () => {
	// Get the existing errors list
	const data = ( await getJSONFromS3( fileKey ) ) || { errors: [] };

	// Get the list of failures from  report/widgets/status-chart.json
	const status = readJson( path.join( localReportPath, 'widgets/status-chart.json' ) );
	const metadata = readJson( path.join( localReportPath, 'metadata.json' ) );
	const failedTests = status.filter( t => t.status === 'failed' || t.status === 'broken' );
	console.log( `Found ${ failedTests.length } failed tests` );

	for ( const test of failedTests ) {
		console.log( `Reading ${ test.uid }` );
		const testInfo = readJson(
			path.join( localReportPath, 'data/test-cases', `${ test.uid }.json` )
		);

		if ( ( ! testInfo.statusTrace && ! testInfo.statusMessage ) || testInfo.status === 'skipped' ) {
			continue;
		}

		const error = {
			message: testInfo.statusMessage,
			trace: cleanError( testInfo.statusMessage, testInfo.statusTrace ),
			time: testInfo.time.stop,
			source: testInfo.source,
			test: testInfo.fullName,
			path: metadata.path,
		};

		const existingErrorIndex = data.errors.findIndex( e => e.source === error.source );

		if ( existingErrorIndex !== -1 ) {
			data.errors[ existingErrorIndex ] = error;
		} else {
			data.errors.push( error );
		}

		// Only keep the last 1000 errors
		if ( data.errors.length > 1000 ) {
			data.errors = data.errors.slice( -1000 );
		}
	}

	data.lastUpdate = new Date().toISOString();

	// Write the file locally
	// const { writeJson } = require( './utils' );
	// writeJson( data, path.join( '', fileKey ) );

	// Upload the report to S3
	const cmd = new PutObjectCommand( {
		Bucket: s3Params.Bucket,
		Key: fileKey,
		Body: JSON.stringify( data ),
		ContentType: 'application/json',
	} );
	await s3client.send( cmd );
} )();
