/**
 * This script will generate a list of tests titles grouped by suites (one level of suites) from the Playwright json reports.
 * It will also store the commit sha and the ref name in the generated file.
 * If the incoming sha is the same as the existing one, it will merge the new flows with the existing ones, avoiding missing flows. This is to account for multiple test runs on the same sha.
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
	const existingData = ( await getJSONFromS3( jsonFilePath, true ) ) || data;

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

function getSuiteFromFileName( fileName ) {
	const nameWithoutExtension = fileName.replace( /\.[^/.]+$/, '' );
	return nameWithoutExtension.replace( '.test', '' ).replace( '.spec', '' ).replace( /[_-]/g, ' ' );
}

/**
 * Get suites data from the json reports.
 * It parses multiple json files and returns their merged content in a single array.
 * @param {string} jsonReportsPath Path to the json reports folder
 * @param {string} fileNamePattern Regex pattern to match the json files
 * @return {*[]} Combined suites data
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
 * Extracts unique test titles from suites data and organizes them in a hierarchical structure.
 * The hierarchy is built as follows:
 * 1. First level: folder name from the test file path
 * 2. Second level: file name (without extension)
 * 3. Subsequent levels: suite titles from the test structure
 *
 * @param {Array}  inputSuites - Array of suite objects containing test specifications
 * @param {number} depth       - Current recursion depth to prevent infinite loops (default: 0)
 * @return {Array} Array of objects containing:
 *   - title: Test case title
 *   - file: Test file path
 *   - line: Line number in file
 *   - skipped: Boolean indicating if test is skipped
 *   - tags: Array of test tags
 *   - suites: Array representing the suite hierarchy
 */
function getUniqueNestedTitles( inputSuites, depth = 0 ) {
	if ( depth > 100 ) return [];

	let titles = [];

	inputSuites.forEach( currentSuite => {
		// Skip fixtures and exit early
		if ( currentSuite.file.includes( 'fixtures' ) ) {
			console.log( `Skipping fixture: ${ currentSuite.file }` );
			return;
		}

		// Add specs titles
		currentSuite.specs.forEach( spec => {
			const filePathParts = spec.file.split( path.sep );

			// Include each folder from the file path as a suite name
			const suites = filePathParts.slice( 0, -1 );

			// Include file name as a suite name
			suites.push( getSuiteFromFileName( filePathParts.slice( -1 )[ 0 ] ) );

			// Include the describe block as a suite name
			if ( currentSuite.title !== currentSuite.file ) {
				suites.push( currentSuite.title );
			}

			// If there is an annotation of type 'suite', include it as a suite name
			const suiteAnnotation = spec.tests[ 0 ].annotations.find(
				annotation => annotation.type === 'suite'
			);

			if ( suiteAnnotation ) {
				suites.push( suiteAnnotation.description );
			}

			titles.push( {
				suites: [...new Set(suites)],
				suite: suites.join( ' > ' ),
				title: spec.title,
				file: spec.file,
				line: spec.line,
				skipped: spec.tests.every( test => test.expectedStatus === 'skipped' ),
				tags: spec.tags,
			} );
		} );

		// Recursively add nested suites titles
		if ( currentSuite.suites && currentSuite.suites.length > 0 ) {
			titles = titles.concat( getUniqueNestedTitles( currentSuite.suites, depth + 1 ) );
		}
	} );

	return titles.sort( ( a, b ) => {
		return a.suite.localeCompare( b.suite );
	} );
}

/**
 * Group the unique test titles by suite.
 * Example:
 * [ "Suite 1 > Test 1.1", "Suite 1 > Test 1.2", "Suite 2 > Test 2.1" ] will return:
 * {"Suite 1": ["Test 1.1", "Test 1.2"], "Suite 2": ["Test 2.1"] }
 * @param {Array} flows list of unique test titles
 * @return {Object} Grouped test titles by suite
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
 * @param {Object} newFlows      - New flows to be merged.
 * @param {Object} existingFlows - Existing flows to be merged with.
 * @return {*} Merged flows.
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
