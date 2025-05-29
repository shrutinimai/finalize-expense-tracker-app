require('dotenv').config();
const { S3Client, PutObjectCommand ,GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner'); 
const { v4: uuidv4 } = require('uuid');
const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

const uploadFile = async (fileContent, userId) => {
       const fileName = `expenses/${userId}/${uuidv4()}_${new Date().toISOString()}.csv`;

    const bucketName = process.env.AWS_BUCKET_NAME; // Get bucket name from env

    const params = {
        Bucket: bucketName,
        Key: fileName,
        Body: fileContent,
        ContentType: 'text/csv'
    };

    const command = new PutObjectCommand(params);

    try {
        await s3Client.send(command);

        const downloadCommand = new GetObjectCommand({ 
            Bucket: bucketName,
            Key: fileName,
        });
        const expiresInSeconds = 60 * 5; 
        const signedUrl = await getSignedUrl(s3Client, downloadCommand, { expiresIn: expiresInSeconds });

        return signedUrl; 
    } catch (err) {
        console.error("Error uploading or generating signed URL for S3:", err);
        throw err;
    }
};

module.exports = { uploadFile };
