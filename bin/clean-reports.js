/**
 * This script will clean old reports and reports for closed PRs
 */

const {
	readS3Object,
	listS3Folders,
	removeS3Folder,
	listS3Objects,
	getJSONFromS3, writeJson,
} = require( './utils' );
const { s3Params, s3client } = require( './s3-client' );
const { Octokit } = require( '@octokit/rest' );
const { PutObjectCommand, DeleteObjectCommand } = require( '@aws-sdk/client-s3' );
const config = require( '../src/config.json' );
const moment = require( 'moment' );
const {join} = require("node:path");
const octokit = new Octokit();

const daysToKeepReports = {
    "pull_request": 30,
    "push": 30,
    "daily-checks": 30,
    "release-checks": 365,
}

const plus = String.fromCodePoint( 0x2795 );
const done = String.fromCodePoint( 0x2714 );
const problem = String.fromCodePoint( 0x2757 );
const owner = 'woocommerce';
const repo = 'woocommerce';

const dryRun = process.env.DRY_RUN;

( async () => {
    const reportsData = JSON.parse( ( await readS3Object( 'data/reports.json' ) ).toString() );

    // region clean pull_request
    const prGroups = reportsData.pull_request || {};
    // const prGroups = {};
    const initialCount = Object.keys(prGroups).length;
    console.group( '\n', `Checking ${ initialCount } reports groups for pull_request event` );

    let closed = [];
    let open = [];

    if(prGroups.length > 0) {
        const closedPRs = await octokit.rest.pulls.list( {
		owner,
		repo,
		state: 'closed',
		per_page: 100,
	} );
        const openPRs = await octokit.rest.pulls.list( {
            owner,
            repo,
            state: 'open',
            per_page: 100,
        } );
        closed = closedPRs.data.map( pr => pr.number.toString() );
        open = openPRs.data.map( pr => pr.number.toString() );
    }

    for (const group of Object.keys(prGroups)) {
        console.log();
        console.log( `Checking pull_request.${ group }` );
        if ( shouldIgnoreGroup(group) ) {
			console.log( `${ done } ${ group } is in ignore list, skipping` );
			continue;
		}

        if ( isPermanent( group ) ) {
			console.log( `${ plus } ${ group } is a permanent report, marking for cleaning` );
            // todo implement the reports cleaning. for now we'll just leave the group alone
			// reportsToClean.push( group );
			continue;
		}

        const rg = prGroups[group];
        if( closed.includes( rg.pr_number ) ) {
            console.log( `PR ${ rg.pr_number } is closed, deleting reports in group ${ group }` );
            delete prGroups[group];
            continue;
        }

        if( open.includes( rg.pr_number ) ) {
            console.log( `PR ${ rg.pr_number } is still open` );

            if( isOld( rg.lastUpdate, daysToKeepReports.pull_request, 'days' ) ) {
                console.log( `PR ${ rg.pr_number } is still open but older than ${ daysToKeepReports.pull_request } days. Deleting reports in group ${ group }` );
                delete prGroups[group];
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
				delete prGroups[group];
        } else {
            console.log(`${ rg.pr_number } doesn't seem to be a closed PR, will keep it (state=${ pull?.data?.state })`);
        }
    }

    logRemovedGroupsCount(initialCount, Object.keys(prGroups).length);
    console.groupEnd();
    // endregion

    // region clean other events
    for (const event of [ 'push', 'daily-checks', 'release-checks' ]) {
        const eventGroups = reportsData[event] || {};
        const initialCount = Object.keys(eventGroups).length;
        console.group( '\n', `Checking ${ initialCount } reports groups for ${ event } event` );

        // If there is no explicit threshold for the event, skip it, we don't want to delete reports by mistake.
        if( !daysToKeepReports[event] ) {
            console.warn(`${ problem } There is no defined threshold for ${ event }. Skipping.`);
            continue;
        }

        for ( const group of Object.keys( eventGroups ) ) {
            console.log();
            console.log(`Checking ${ event }.${ group }`);
            if ( shouldIgnoreGroup(group) ) {
                console.log(`${done} ${group} is in ignore list, skipping`);
                continue;
            }

            if ( isPermanent(group) ) {
                console.log(`${plus} ${group} is a permanent report, marking for cleaning`);
                // todo implement the reports cleaning. for now we'll just leave the group alone
                // reportsToClean.push( group );
                continue;
            }

            if (isOld( eventGroups[group].lastUpdate, daysToKeepReports[event], 'days')) {
                console.log(`${event}.${group} is older than ${daysToKeepReports[event]} days. Deleting.`);
                delete eventGroups[group];
            } else {
                console.log(`${event}.${group} is still not old enough. Keeping it.`);
            }
        }

        logRemovedGroupsCount(initialCount, Object.keys(eventGroups).length);
        console.groupEnd();
    }
    // endregion

    // region upload updated reports data
    // Write the updated reports list locally
	writeJson( reportsData, join( "public", 'reports.json' ) );

	// Upload the report to S3
	const cmd = new PutObjectCommand( {
		Bucket: s3Params.Bucket,
		Key: 'data/reports.json',
		Body: JSON.stringify( reportsData, null, 2 ),
		ContentType: 'application/json',
	} );

    if (!dryRun) {
	    await s3client.send( cmd );
    }
    // endregion

	// Remove reports from S3 storage
	// console.group( '\n', 'Removing reports from storage' );
	// for ( const report of reportsToDelete ) {
	// 	console.group( '\n', `Removing report ${ report }` );
	// 	await removeS3Folder( `reports/${ report }` );
	// 	console.groupEnd();
	// }
	// console.groupEnd();


} )();

function isOld(date, threshold, timeUnit = 'days') {
    const duration = moment
		.duration( moment.utc().diff( moment.utc( date ) ) )
		.as( timeUnit )
		.toFixed( 1 );
    console.log( `Duration: ${ duration }`)
    return duration > threshold;
}

function shouldIgnoreGroup( group ) {
    return config.ignore.includes(group);
}

function isPermanent( group ) {
    return config.permanent.includes(group);
}

function logRemovedGroupsCount(initialCount, finalCount) {
    const removed = initialCount - finalCount;
    console.log( `${ done } Removed ${ removed } report groups` );
}
