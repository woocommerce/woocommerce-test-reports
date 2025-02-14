/**
 * This script will update the json file containing the list of reports: data/reports.json
 */

const { acquireLockWithRetry, readS3Object, releaseLock } = require( './../utils' );
const { PutObjectCommand } = require( '@aws-sdk/client-s3' );
const { s3Params, s3client } = require( './../s3-client' );

const fileKey = 'data/reports.json';

( async () => {
	// Get the existing reports list
	await acquireLockWithRetry( fileKey, true );
	const reportsData = ( await readS3Object( fileKey ) ).toString() || '{}';
	const json = JSON.parse( reportsData );
	const updatedJson = await updateReportData( json );

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

function determineReportsGroupStatus( reports ) {
	let status = 'P'; // Default status is 'P' (passed)

	for ( const report of reports ) {
		const history = report.history;
		if ( history.endsWith( 'F' ) ) {
			return 'F'; // If any report ends with 'F', set status to 'F' (failure)
		}
		if ( history.includes( 'F' ) ) {
			status = 'R'; // If any report contains 'F' but ends with 'P', set status to 'R' (recovered)
		}
	}

	return status;
}

async function updateReportData( json ) {
	for ( const event_name in json ) {
		if ( event_name === 'lastUpdate' ) {
			continue;
		}
		for ( const group in json[ event_name ] ) {
			console.log( `Updating group ${ event_name }.${ group }` );
			const reports = json[ event_name ][ group ].reports;
			json[ event_name ][ group ].status = determineReportsGroupStatus( reports );
			console.log(
				`Group ${ event_name }.${ group } status: ${ json[ event_name ][ group ].status }`
			);
		}
	}

	json.lastUpdate = new Date().toISOString();
	return json;
}
