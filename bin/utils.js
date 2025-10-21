const fs = require( 'fs' );
const path = require( 'path' );
const { s3client, s3Params } = require( './s3-client' );
const {
	GetObjectCommand,
	ListObjectsCommand,
	DeleteObjectCommand,
	PutObjectCommand,
} = require( '@aws-sdk/client-s3' );

function getReportsDirs() {
	const excluded = require( '../src/config.json' ).ignore;
	console.log( `Excluded dirs: ${ excluded }` );

	return fs
		.readdirSync( 'docs', { withFileTypes: true } )
		.filter( dirent => dirent.isDirectory() && ! excluded.includes( dirent.name ) )
		.map( dirent => dirent.name );
}

function getFilesFromDir( dirPath, fileExtension = '' ) {
	return fs
		.readdirSync( dirPath, {
			withFileTypes: true,
		} )
		.filter( dirent => dirent.isFile() && dirent.name.endsWith( fileExtension ) )
		.map( dirent => dirent.name );
}

function cleanTrace( trace ) {
	return trace
		.split( '\n' )
		.filter( line => ! line.includes( '=====' ) )
		.filter( line => ! line.includes( 'Playwright logs' ) )
		.filter( line => ! line.includes( '/node_modules/' ) )
		.filter( line => ! line.includes( 'node:' ) )
		.filter( line => ! line.includes( 'runMicrotasks' ) )
		.join( '\n' )
		.replace( /\n+/g, '\n' )
		.replace( /at .+/gs, trace.match( /at .+/ ) ); // keep only the first "at" line
}

function cleanError( message, trace ) {
	if ( trace ) {
		return trace.includes( message )
			? cleanTrace( trace )
			: cleanTrace( `${ message }\n${ trace }` );
	}
	return 'undefined';
}

function getTestInfoFromTestCaseFile( reportName, fileName ) {
	const filePath = `./docs/${ reportName }/report/data/test-cases/${ fileName }`;
	return JSON.parse( fs.readFileSync( filePath ).toString() );
}

function writeJson( jsonData, filePath, pretty = false ) {
	fs.writeFileSync( path.resolve( filePath ), JSON.stringify( jsonData, null, pretty ? 2 : 0 ) );
}

function readJson( filePath ) {
	let data;
	try {
		data = JSON.parse( fs.readFileSync( path.resolve( filePath ) ).toString() );
	} catch ( err ) {
		console.error( err );
	}
	return data;
}

function sort( data, sortKey, desc = false ) {
	const sorted = data.sort( ( a, b ) =>
		// eslint-disable-next-line no-nested-ternary
		a[ sortKey ] > b[ sortKey ] ? 1 : b[ sortKey ] > a[ sortKey ] ? -1 : 0
	);

	if ( desc ) {
		return sorted.reverse();
	}

	return sorted;
}

/**
 * Removes the source property of each element in an array of objects of the file corresponding to the source doesn't exist
 * Expected object structure: {report: xx, source: xx}
 *
 * @param {Array} arr
 */
function cleanSources( arr ) {
	arr.forEach( item => {
		if ( item.source ) {
			const sourcePath = `docs/${ item.report }/report/data/test-cases/${ item.source }`;
			if ( ! fs.existsSync( sourcePath ) ) {
				console.log( `${ sourcePath } not found, removing source` );
				delete item.source;
			}
		}
	} );
}

async function readS3Object( key, silent = false ) {
	if ( ! silent ) {
		console.log( `Reading file ${ key } from S3` );
	}

	const cmd = new GetObjectCommand( { Bucket: s3Params.Bucket, Key: key } );
	let content;

	try {
		const data = await s3client.send( cmd );
		content = await streamToString( data.Body );
	} catch ( error ) {
		if ( ! silent ) {
			console.error( `Error reading object: ${ error.message }` );
		}
	}

	return content || '';
}

async function listS3Objects( prefix, delimiter = '' ) {
	const bucketParams = {
		Bucket: s3Params.Bucket,
		Prefix: prefix,
		Delimiter: delimiter,
	};

	const objects = [];
	let truncated = true;
	let pageMarker;
	let page = 1;

	while ( truncated && page < 10 ) {
		try {
			console.log( `Listing objects with prefix ${ prefix } and marker ${ pageMarker }` );
			const data = await s3client.send( new ListObjectsCommand( bucketParams ) );
			objects.push( ...data.Contents.map( item => item.Key ) );

			truncated = data.IsTruncated;
			if ( truncated ) {
				pageMarker = data.Contents.slice( -1 )[ 0 ].Key;
				bucketParams.Marker = pageMarker;
				page++;
			}
		} catch ( err ) {
			console.log( 'Error', err );
			truncated = false;
		}
	}

	return objects;
}

async function listS3Folders( prefix ) {
	console.log( `Listing folders with prefix ${ prefix }` );
	const cmd = new ListObjectsCommand( { Bucket: s3Params.Bucket, Prefix: prefix, Delimiter: '/' } );
	let objects = [];

	try {
		const data = await s3client.send( cmd );
		objects = data.CommonPrefixes.map( item => item.Prefix );
	} catch ( err ) {
		console.log( 'Error', err );
	}

	return objects;
}

async function removeS3Folder( prefix ) {
	console.log( `Removing all files with prefix ${ prefix }` );

	try {
		const objectsInFolder = await s3client.send(
			new ListObjectsCommand( { Bucket: s3Params.Bucket, Prefix: prefix } )
		);

		for ( const { Key } of objectsInFolder.Contents ) {
			await s3client.send( new DeleteObjectCommand( { Bucket: s3Params.Bucket, Key } ) );
		}

		if ( objectsInFolder.IsTruncated ) {
			await removeS3Folder( prefix );
		}
	} catch ( err ) {
		console.log( 'Error', err );
	}
}

async function getJSONFromS3( key, silent = false ) {
	try {
		const content = ( await readS3Object( key, silent ) ).toString();
		return JSON.parse( content );
	} catch ( err ) {
		console.error( err );
		return null;
	}
}

const streamToString = stream => {
	return new Promise( ( resolve, reject ) => {
		const chunks = [];
		stream.on( 'data', chunk => chunks.push( chunk ) );
		stream.on( 'error', reject );
		stream.on( 'end', () => resolve( Buffer.concat( chunks ).toString() ) );
	} );
};

function printProgress( progress ) {
	process.stdout.clearLine();
	process.stdout.cursorTo( 0 );
	process.stdout.write( progress );
}

async function acquireLockWithRetry(
	fileName,
	proceedWithLockFound = false,
	retries = 30,
	retryDelay = 5000
) {
	console.log( `Attempting to acquire lock for ${ fileName }` );
	let lockFound = true;
	const rand = ( Math.floor( Math.random() * 1000 ) % 10000 ).toString().padStart( 4, '0' );
	const lockId = `${ Date.now().toString() }_${ rand }`;
	console.log( `Expecting Lock ID: ${ lockId }` );

	// Add absolute timeout of 10 minutes to prevent indefinite hangs
	const absoluteTimeout = 10 * 60 * 1000; // 10 minutes in milliseconds
	const startTime = Date.now();

	while ( lockFound && retries-- > 0 ) {
		// Check if absolute timeout has been exceeded
		if ( Date.now() - startTime > absoluteTimeout ) {
			console.error( 'Absolute timeout exceeded while waiting for lock' );
			throw new Error( 'Lock acquisition timeout exceeded (10 minutes)' );
		}

		console.log( `Checking lockfile` );
		const lock = await lockedInfo( fileName );
		console.log( `Lock status: ${ lock }` );

		if ( ! lock ) {
			// Undefined or null means there was an error checking the lock status. We'll retry
			console.log( 'Cannot determine lock status, retrying...' );
			continue;
		}

		if ( lock === lockId ) {
			// Found our own lock, we can proceed
			console.log( 'Lock acquired' );
			return;
		} else if ( lock === 'NoSuchKey' ) {
			// Lock doesn't exist, we can create it
			console.log( "Lock doesn't exist, acquiring lock..." );
			await createLock( fileName, lockId );
			continue;
		} else {
			// Found a lock form another process, we'll retry
			console.log( `Lock found: ${ lock }` );
		}

		if ( retries > 0 ) {
			console.log( `Retrying in ${ retryDelay }ms. ${ retries } Retries left...` );
		}

		await new Promise( resolve => setTimeout( resolve, retryDelay ) );
	}

	if ( lockFound && proceedWithLockFound ) {
		console.warn( 'Lock still found after retries, proceeding anyway...' );
		return;
	}

	console.log( 'Lock still found after retries, exiting...' );
	throw new Error( 'Unable to acquire lock. Exiting...' );
}

async function lockedInfo( fileName ) {
	let lockInfo;

	try {
		const lockData = await s3client.send(
			new GetObjectCommand( { Bucket: s3Params.Bucket, Key: `${ fileName }.lock` } )
		);
		lockInfo = await streamToString( lockData.Body );
	} catch ( error ) {
		lockInfo = error.name;
	}

	return lockInfo;
}

async function createLock( fileName, lockId ) {
	try {
		const lockContent = { timestamp: new Date().toISOString() };
		const cmd = new PutObjectCommand( {
			Bucket: s3Params.Bucket,
			Key: `${ fileName }.lock`,
			Body: lockId,
			ContentType: 'application/json',
		} );
		await s3client.send( cmd );
	} catch ( error ) {
		console.error( `Error creating lock: ${ error.message }` );
	}
}

async function releaseLock( fileName ) {
	await s3client.send(
		new DeleteObjectCommand( { Bucket: s3Params.Bucket, Key: `${ fileName }.lock` } )
	);
	console.log( 'Lock released.' );
}

module.exports = {
	acquireLockWithRetry,
	releaseLock,
	getReportsDirs,
	getFilesFromDir,
	getTestInfoFromTestCaseFile,
	cleanTrace,
	cleanError,
	writeJson,
	readJson,
	sort,
	cleanSources,
	readS3Object,
	listS3Objects,
	listS3Folders,
	removeS3Folder,
	printProgress,
	getJSONFromS3,
};
