/**
 * This script will update per the statistics data files: daily, weekly and monthly and summary.
 * It should run on a schedule, probably on a daily basis.
 * It reads the data from the runs-<month>.json files for the previous 12 months and the current one.
 */

const { sort, readS3Object, writeJson} = require( './utils' );
const moment = require( 'moment' );
const { PutObjectCommand } = require( '@aws-sdk/client-s3' );
const { s3Params, s3client } = require( './s3-client' );
const {join} = require("node:path");
const trunkReports = require( '../src/config.json' ).trunkRuns;
const entryTemplate = '{ "runs": 0, "attempts": 0, "reRuns": 0, "testsPassed": 0, "testsFailed": 0, "testsSkipped": 0, "testsTotal": 0 }';

( async () => {
	let runs = [];
    let runsDataFiles = [];

	// Get the list of runs data files for the last 12 months plus the current month
	for (let i = 0; i < 13; i++) {
		runsDataFiles.push(`data/runs-${moment().subtract(i, 'months').format('YYYY-MM')}.json`);
	}

    for ( const dataFile of runsDataFiles ) {
        const fileContent = (await readS3Object(`${dataFile}`)).toString() || '{}' ;
        const json = JSON.parse( fileContent );

        Object.entries( json ).forEach( ( [ runId, run ] ) => {
            runs.push( {
                runId,
                ...run,
            } );
        } );
    }

    console.log(`Found ${runs.length} runs`);

	const dailyJson = [];
	const weeklyJson = [];
	const monthlyJson = [];
	const summaryData = {
		stats: {
			'24h': { trunk: JSON.parse(entryTemplate), total: JSON.parse(entryTemplate) },
			'7d': { trunk: JSON.parse(entryTemplate), total: JSON.parse(entryTemplate) },
			'14d': { trunk: JSON.parse(entryTemplate), total: JSON.parse(entryTemplate) },
			'30d': { trunk: JSON.parse(entryTemplate), total: JSON.parse(entryTemplate) },
		},
		lastUpdate: '',
	};

	for ( const run of runs ) {
		const day = moment.utc( run.updated_on ).format( 'YYYY-MM-DD' );
		const week = moment.utc( run.updated_on ).format( 'GGGG-[week]-WW' );
		const month = moment.utc( run.updated_on ).format( 'YYYY-MM' );

		pushRunData( dailyJson, day, run );
		pushRunData( weeklyJson, week, run );
		pushRunData( monthlyJson, month, run );

		const duration = moment
				.duration( moment.utc().diff( moment.utc( run.updated_on ) ) )
				.as( 'days' );

		// console.log( `${ result.time } => ${ moment.utc( result.time ).format( 'YYYY-MM-DD hh:mm:ss' ) } => ${ duration } days ago` );

		if ( duration <= 1 ) {
			updateSummaryEntry( summaryData.stats[ '24h' ], run );
		}

		if ( duration <= 7 ) {
			updateSummaryEntry( summaryData.stats[ '7d' ], run );
		}

		if ( duration <= 14 ) {
			updateSummaryEntry( summaryData.stats[ '14d' ], run );
		}

		if ( duration <= 30 ) {
			updateSummaryEntry( summaryData.stats[ '30d' ], run );
		}

		summaryData.lastUpdate = new Date().toISOString();
	}

	dailyJson.sort( ( a, b ) => {
		return new Date( b.date ) - new Date( a.date );
	} );

	sort( weeklyJson, 'date', true );

	await uploadData( 'data/runs-daily.json', dailyJson );
	await uploadData( 'data/runs-weekly.json', weeklyJson );
	await uploadData( 'data/runs-monthly.json', monthlyJson );
	await uploadData( 'data/summary.json', summaryData );
} )();

async function uploadData( dataFile, jsonData ) {
	console.log( `Updating file ${ dataFile }` );

	// Write the updated data list locally
	writeJson( jsonData, join( "", `public/${dataFile}` ) );

	const cmd = new PutObjectCommand( {
		Bucket: s3Params.Bucket,
		Key: dataFile,
		Body: JSON.stringify( jsonData ),
		ContentType: 'application/json',
	} );
	// await s3client.send( cmd );
}

function updateSummaryEntry( entry, run ) {
	if ( trunkReports.includes( run.ref_name ) ) {
		updateEntry( entry.trunk, run );
	}

	updateEntry( entry.total, run );
}

function pushRunData( data, date, run ) {
	console.log( `Pushing data for run ${ run.updated_on } to ${ date }`);
	// Get the entry for the date
	let entry = data.filter( k => k.date === date );

	// Create the entry for the date if it doesn't exist
	if ( entry.length === 0 ) {
		data.push( {
			date,
			trunk: JSON.parse(entryTemplate),
			total: JSON.parse(entryTemplate),
		} );

		entry = data.filter( k => k.date === date );
	}

	if ( trunkReports.includes( run.ref_name ) ) {
		entry[ 0 ].trunk = updateEntry(  entry[ 0 ].trunk, run );
	}

	entry[ 0 ].total = updateEntry( entry[ 0 ].total, run );
}

function updateEntry( entry, run ) {
	entry.runs++
	entry.attempts+=Object.keys(run.attempts).length
	entry.reRuns+=(Object.keys(run.attempts).length - 1)
	entry.testsPassed+=getTestResult('passed', run)
	entry.testsFailed+=getTestResult('failed', run)
	entry.testsSkipped+=getTestResult('skipped', run)
	entry.testsTotal+=getTestResult('total', run)
	return entry;
}

function getTestResult(status, run) {
	let result = 0;

	Object.values(run.attempts).forEach(attempt => {
		Object.values(attempt).forEach(report => {
			result+=report[ status ]
		})
	})
	return result;
}
