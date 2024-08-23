/**
 * This script will generate a list of tests from the Playwright json reports.
 */

const { s3Params, s3client } = require( './s3-client' );
const { PutObjectCommand } = require( '@aws-sdk/client-s3' );
const { readdirSync, readFileSync } = require( 'node:fs' );
const path = require( 'path' );

const { REF_NAME, COMMIT_SHA, RESULTS_PATH } = process.env;

if ( ! RESULTS_PATH ) {
	console.error( 'Please provide the path to the test results folder.' );
	process.exit( 1 );
}

const reportFileName = `flows-coverage${ REF_NAME ? '-' + REF_NAME : '' }`;
const jsonFilePath = `data/${ reportFileName }.json`;

( async () => {
	const data = {
		flows: [],
		ref: REF_NAME ? REF_NAME : 'unknown',
		sha: COMMIT_SHA ? COMMIT_SHA : 'unknown',
		lastUpdate: new Date(),
	};

	const fileSuites = getSuitesData( RESULTS_PATH, /^test-results-\d+\.json$/ );
	data.flows = getUniqueNestedTitles( fileSuites.flat() );

	// Write the file locally
	// const { writeJson } = require( './utils' );
	// writeJson( data, path.join( '', jsonFilePath ) );

	// Upload the report to S3
	const cmd = new PutObjectCommand( {
		Bucket: s3Params.Bucket,
		Key: jsonFilePath,
		Body: JSON.stringify( data ),
		ContentType: 'application/json',
	} );
	await s3client.send( cmd );
} )();

function getSuitesData( jsonReportsPath, fileNamePattern ) {
	const suites = [];
	const files = readdirSync( jsonReportsPath );
	const jsonFiles = files.filter( file => fileNamePattern.test( file ) );

	jsonFiles.forEach( file => {
		const filePath = path.join( jsonReportsPath, file );
		const fileContent = readFileSync( filePath, 'utf-8' );
		const jsonData = JSON.parse( fileContent );
		suites.push( jsonData.suites );
	} );

	return suites;
}

function getUniqueNestedTitles( suites, depth = 0, parentTitle = '' ) {
	if ( depth > 100 ) return [];

	let titles = [];

	suites.forEach( suite => {
		const isFileSuite = suite.title === suite.file;
		const currentSuiteTitle = isFileSuite ? '' : suite.title;
		const currentTitle = parentTitle
			? `${ parentTitle } > ${ currentSuiteTitle }`
			: currentSuiteTitle;

		// Add specs titles
		suite.specs.forEach( spec => {
			titles.push( {
				suite: currentTitle,
				title: spec.title,
				file: spec.file,
				line: spec.line,
				skipped: spec.tests.every( test => test.expectedStatus === 'skipped' ),
			} );
		} );

		// Recursively add nested suites titles
		if ( suite.suites && suite.suites.length > 0 ) {
			titles = titles.concat( getUniqueNestedTitles( suite.suites, depth + 1, currentTitle ) );
		}
	} );

	return titles.sort();
}
