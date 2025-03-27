/**
 * This script will clean old reports and reports for closed PRs
 */

const {
	acquireLockWithRetry,
	listS3Folders,
	removeS3Folder,
	getJSONFromS3,
	releaseLock,
} = require( './utils' );
const { s3Params, s3client } = require( './s3-client' );
const { Octokit } = require( '@octokit/rest' );
const { PutObjectCommand } = require( '@aws-sdk/client-s3' );
const config = require( '../src/config.json' );
const moment = require( 'moment' );
const octokit = new Octokit( {
	auth: process.env.GITHUB_TOKEN,
} );

const daysToKeepReports = {
	pull_request: 15,
	push: 20,
	'daily-checks': 30,
	'release-checks': 90,
	other: 30,
};

const plus = String.fromCodePoint( 0x2795 );
const done = String.fromCodePoint( 0x2714 );
const problem = String.fromCodePoint( 0x2757 );
const owner = 'woocommerce';
const repo = 'woocommerce';
const reportsFileKey = 'data/reports.json';

const dryRun = process.env.DRY_RUN;

( async () => {
	await acquireLockWithRetry( reportsFileKey, true );
	const reportsData = await getJSONFromS3( reportsFileKey );

	// region clean pull_request
	const prGroups = reportsData.pull_request || {};
	// const prGroups = {};
	const initialCount = Object.keys( prGroups ).length;
	console.group( '\n', `Checking ${ initialCount } reports groups for pull_request event` );

	let closed = [];
	let open = [];

	if ( Object.keys( prGroups ).length > 0 ) {
		const closedPRs = await octokit.rest.pulls.list( {
			owner,
			repo,
			state: 'closed',
			per_page: 100,
			sort: 'updated',
			direction: 'desc',
		} );
		const openPRs = await octokit.rest.pulls.list( {
			owner,
			repo,
			state: 'open',
			per_page: 100,
			sort: 'updated',
			direction: 'desc',
		} );
		closed = closedPRs.data.map( pr => pr.number.toString() );
		open = openPRs.data.map( pr => pr.number.toString() );
	}

	for ( const group of Object.keys( prGroups ) ) {
		console.log();
		console.log( `Checking pull_request.${ group }` );
		if ( shouldIgnoreGroup( group ) ) {
			console.log( `${ done } ${ group } is in ignore list, skipping` );
			continue;
		}

		if ( isPermanent( group ) ) {
			console.log( `${ plus } ${ group } is a permanent report, marking for cleaning` );
			// todo implement the reports cleaning. for now we'll just leave the group alone
			// reportsToClean.push( group );
			continue;
		}

		const rg = prGroups[ group ];
		if ( closed.includes( rg.pr_number ) ) {
			console.log( `PR ${ rg.pr_number } is closed, deleting reports in group ${ group }` );
			delete prGroups[ group ];
			continue;
		}

		if ( open.includes( rg.pr_number ) ) {
			console.log( `PR ${ rg.pr_number } is still open` );

			if ( isOld( rg.lastUpdate, daysToKeepReports.pull_request, 'days' ) ) {
				console.log(
					`PR ${ rg.pr_number } is still open but older than ${ daysToKeepReports.pull_request } days. Deleting reports in group ${ group }`
				);
				delete prGroups[ group ];
			} else {
				console.log( `PR ${ rg.pr_number } is still open and not old enough. Keeping it.` );
			}

			continue;
		}

		// PR is not in the 100 closed or the 100 open PRs, make an API call to check its status
		console.log( `Checking PR ${ rg.pr_number } status` );
		const pull = await octokit.rest.pulls.get( {
			owner,
			repo,
			pull_number: rg.pr_number,
		} );

		if ( pull?.data?.state === 'closed' ) {
			console.log( `PR ${ rg.pr_number } is closed, deleting reports in group ${ group }` );
			delete prGroups[ group ];
		} else if ( isOld( rg.lastUpdate, daysToKeepReports.pull_request, 'days' ) ) {
			console.log(
				`PR ${ rg.pr_number } is still open but older than ${ daysToKeepReports.pull_request } days. Deleting reports in group ${ group }`
			);
			delete prGroups[ group ];
		} else {
			console.log( `PR ${ rg.pr_number } is still open and not old enough. Keeping it.` );
		}
	}

	logRemovedGroupsCount( initialCount, Object.keys( prGroups ).length );
	console.groupEnd();
	// endregion

	// region clean other events
	for ( const event of [ 'push', 'daily-checks', 'release-checks', 'other' ] ) {
		const eventGroups = reportsData[ event ] || {};
		// eslint-disable-next-line no-shadow
		const initialCount = Object.keys( eventGroups ).length;
		console.log();
		console.group( '\n', `Checking ${ initialCount } reports groups for ${ event } event` );

		// If there is no explicit threshold for the event, skip it, we don't want to delete reports by mistake.
		if ( ! daysToKeepReports[ event ] ) {
			console.warn( `${ problem } There is no defined threshold for ${ event }. Skipping.` );
			continue;
		}

		for ( const group of Object.keys( eventGroups ) ) {
			console.log();
			console.log( `Checking ${ event }.${ group }` );
			if ( shouldIgnoreGroup( group ) ) {
				console.log( `${ done } ${ group } is in ignore list, skipping` );
				continue;
			}

			if ( isPermanent( group ) ) {
				console.log( `${ plus } ${ group } is a permanent report, marking for cleaning` );
				// todo implement the reports cleaning. for now we'll just leave the group alone
				// reportsToClean.push( group );
				continue;
			}

			if ( isOld( eventGroups[ group ].lastUpdate, daysToKeepReports[ event ], 'days' ) ) {
				console.log(
					`${ event }.${ group } is older than ${ daysToKeepReports[ event ] } days. Deleting.`
				);
				delete eventGroups[ group ];
			} else {
				console.log( `${ event }.${ group } is still not old enough. Keeping it.` );
			}
		}

		logRemovedGroupsCount( initialCount, Object.keys( eventGroups ).length );
		console.groupEnd();
	}
	// endregion

	// region upload updated reports data
	// Write the updated reports list locally
	// writeJson( reportsData, join( "public", 'reports.json' ) );

	// Upload the report to S3
	const cmd = new PutObjectCommand( {
		Bucket: s3Params.Bucket,
		Key: reportsFileKey,
		Body: JSON.stringify( reportsData, null, 2 ),
		ContentType: 'application/json',
	} );

	if ( ! dryRun ) {
		await s3client.send( cmd );
	}
	await releaseLock( reportsFileKey );
	// endregion

	// region Remove reports from S3 storage
	console.group( '\n', 'Removing reports from storage' );

	// Getting a new list of stored reports
	let eventDirs = await listS3Folders( 'reports/', '/' );
	eventDirs = eventDirs.map( report => report.replace( 'reports/', '' ).replace( '/', '' ) );
	const reports = await getJSONFromS3( reportsFileKey );
	const expectedDirs = [ 'push', 'pull_request', 'daily-checks', 'release-checks', 'other' ];
	const dirsToRemove = [];

	for ( const eventDir of eventDirs ) {
		if ( ! expectedDirs.includes( eventDir ) ) {
			console.warn(
				`${ problem } Found unexpected event directory '${ eventDir }'. Should it be removed?`
			);
			continue;
		}

		let groupDirs = await listS3Folders( `reports/${ eventDir }/`, '/' );
		groupDirs = groupDirs.map( report =>
			report.replace( `reports/${ eventDir }/`, '' ).replace( '/', '' )
		);
		const groupsListed = ( reports[ eventDir ] = reports[ eventDir ] || {} );

		for ( const groupDir of groupDirs ) {
			console.log( `Checking ${ eventDir }/${ groupDir }` );
			if (
				! Object.keys( groupsListed )
					.map( key => key.toLowerCase() )
					.includes( groupDir.toLowerCase() )
			) {
				console.log( `${ eventDir }.${ groupDir } not found in reports list. Will be removed.` );
				dirsToRemove.push( `reports/${ eventDir }/${ groupDir }` );
			} else {
				console.log( `${ eventDir }.${ groupDir } found in reports list. Keeping it.` );
			}
		}
	}

	console.log();
	console.log( `Removing ${ dirsToRemove.length } directories` );
	console.log( `${ dirsToRemove.join( ', ' ) }` );
	for ( const dir of dirsToRemove ) {
		if ( ! dryRun ) {
			await removeS3Folder( dir );
		}
	}

	console.groupEnd();
	// endregion

	// region Remove any errors referencing the recently removed reports
	console.group( '\n', 'Removing orphan errors' );
	const errorsFileKey = 'data/errors.json';
	const errorsData = ( await getJSONFromS3( errorsFileKey ) ) || { errors: [] };
	const initialErrorsCount = errorsData.errors.length;

	errorsData.errors = errorsData.errors.filter( error => !dirsToRemove.includes(error.path) );
	console.log(`Removed ${initialErrorsCount - errorsData.errors.length} errors`);
	console.groupEnd();

	// Upload the report to S3
	const s3cmd = new PutObjectCommand( {
		Bucket: s3Params.Bucket,
		Key: errorsFileKey,
		Body: JSON.stringify( errorsData ),
		ContentType: 'application/json',
	} );
	if ( ! dryRun ) {
		await s3client.send( s3cmd );
	}

	console.groupEnd();
	// endregion
} )();

function isOld( date, threshold, timeUnit = 'days' ) {
	const duration = moment
		.duration( moment.utc().diff( moment.utc( date ) ) )
		.as( timeUnit )
		.toFixed( 1 );
	console.log( `Age: ${ duration } ${ timeUnit }` );
	return duration > threshold;
}

function shouldIgnoreGroup( group ) {
	return config.ignore.includes( group );
}

function isPermanent( group ) {
	return config.permanent.includes( group );
}

function logRemovedGroupsCount( initialCount, finalCount ) {
	console.log();
	const removed = initialCount - finalCount;
	console.log( `${ done } Removed ${ removed } report groups` );
}
