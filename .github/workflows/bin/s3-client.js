const { S3Client } = require( '@aws-sdk/client-s3' );
const s3client = new S3Client( { region: process.env.AWS_DEFAULT_REGION } );
const s3Params = {
	Bucket: 'a8c-jetpack-e2e-reports',
};
module.exports = { s3client, s3Params };
