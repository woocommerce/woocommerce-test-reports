/**
 * This script will generate a list of tests titles grouped by suites (one level of suites) from the Playwright json reports.
 * It will also store the commit sha and the ref name in the generated file.
 * If the incoming sha is the same as the existing one, it will merge the new flows with the existing ones, avoiding duplicates. This is to account for multiple test runs on the same sha.
 */

const { s3Params, s3client } = require( './s3-client' );
const { getJSONFromS3 } = require( './utils' );
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
	const flows = getUniqueNestedTitles( fileSuites.flat(), 0, '' );

	const newGroupedFlows = groupFlowsBySuite( flows );
	const existingData = ( await getJSONFromS3( jsonFilePath ) ) || data;

	let existingGroupedFlows = {};
	if ( existingData.sha === data.sha ) {
		console.log( `Same sha ${ data.sha } detected, will merge the flows` );
		existingGroupedFlows = existingData.flows;
	}

	data.flows = mergeFlows( newGroupedFlows, existingGroupedFlows );

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

/**
 * Get suites data from the json reports.
 * It parses multiple json files and returns the merges their content in a single array.
 * @param jsonReportsPath Path to the json reports folder
 * @param fileNamePattern Regex pattern to match the json files
 * @returns {*[]} Combined suites data
 */
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

/**
 * Get unique nested test titles from the suites data.
 * The format of a test title is: "Suite title > Sub-suite title > Test title"
 * @param suites Suites data
 * @param depth Current depth level
 * @param parentTitle Parent suite title
 * @returns {*[]} Unique test titles
 */
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

	return titles.sort( ( a, b ) => {
		return `${ a.suite } ${ a.title }`.localeCompare( `${ b.suite } ${ b.title }` );
	} );
}

/**
 * Group the unique test titles by suite.
 * Example:
 * [ "Suite 1 > Test 1.1", "Suite 1 > Test 1.2", "Suite 2 > Test 2.1" ] will return:
 * {"Suite 1": ["Test 1.1", "Test 1.2"], "Suite 2": ["Test 2.1"] }
 * @param flows list of unique test titles
 * @returns {*} Grouped test titles by suite
 */
function groupFlowsBySuite( flows ) {
	return flows.reduce( ( acc, flow ) => {
		const suite = flow.suite || 'Other';
		if ( ! acc[ suite ] ) {
			acc[ suite ] = [];
		}
		acc[ suite ].push( flow );
		return acc;
	}, {} );
}

/**
 * Merge new flows with existing flows. If a flow in a suite already exists, it will not be added.
 * @param newFlows
 * @param existingFlows
 * @returns {*}
 */
function mergeFlows( newFlows, existingFlows ) {
	const mergedFlows = { ...existingFlows };

	Object.keys( newFlows ).forEach( suite => {
		if ( ! mergedFlows[ suite ] ) {
			console.log( `Adding new suite: ${ suite }` );
			mergedFlows[ suite ] = newFlows[ suite ];
		} else {
			newFlows[ suite ].forEach( newFlow => {
				const isDuplicate = mergedFlows[ suite ].some(
					existingFlow =>
						existingFlow.title === newFlow.title &&
						existingFlow.file === newFlow.file &&
						existingFlow.line === newFlow.line
				);

				if ( ! isDuplicate ) {
					console.log( `Adding new flow: ${ newFlow.suite } > ${ newFlow.title }` );
					mergedFlows[ suite ].push( newFlow );
				} else {
					console.log( `Flow already exists: ${ newFlow.suite } > ${ newFlow.title }` );
				}
			} );
		}
	} );

	return mergedFlows;
}
