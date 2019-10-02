# Ghost storage adapter S3

An AWS S3 storage adapter for Ghost 2.x
based on ghost-storage-adapter-s3

## Installation

unfortunely ghost not have yet a way to package plugins, adaptes, then
you can download a bundle with all dependencies em copy to your storage path


```shell
# for example
$ wget https://github.com/luizamboni/ghost-s3-storage-adapter/blob/master/dist/0.0.1/s3.js  ./content/adapters/storage/s3.js
```

## Configuration

```json
"storage": {
  "active": "s3",
  "s3": {
    "accessKeyId": "YOUR_ACCESS_KEY_ID",
    "secretAccessKey": "YOUR_SECRET_ACCESS_KEY",
    "region": "YOUR_REGION_SLUG",

    "bucket": "YOUR_BUCKET_NAME",
    "assetHost": "YOUR_OPTIONAL_CDN_URL (with path prefix)",
    "signatureVersion": "REGION_SIGNATURE_VERSION (See note 5 below)",
    "pathPrefix": "YOUR_OPTIONAL_BUCKET_SUBDIRECTORY",
    "endpoint": "YOUR_OPTIONAL_ENDPOINT_URL (only needed for 3rd party S3 providers)",
    "serverSideEncryption": "YOUR_OPTIONAL_SSE (See note 2 below)",
    "forcePathStyle": true,
    "acl": "YOUR_OPTIONAL_ACL (See note 4 below)",
  }
}
```

Optionaly you can pass AWS configs as standart way, with env vars:

 - AWS_ACCESS_KEY_ID
 - AWS_SECRET_ACCESS_KEY
 - AWS_DEFAULT_REGION


### Via environment variables

```
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_DEFAULT_REGION
```


### IAM
You'll want to create a custom user role in IAM that just gives your Ghost installation the necessary permissions to manipulate objects in its S3 bucket.

Go to IAM in your AWS console and add a new user. Give it a username specific to your blog, and select **Programmatic access** as the Access type.

Next, on the permissions page, select **Attach existing policies directly** and click to **Create policy**. For the policy click on the JSON editor and add the following policy. You'll want to replace where it says **ghost-bucket** with the name of your blog's S3 bucket.

```
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "VisualEditor0",
            "Effect": "Allow",
            "Action": "s3:ListBucket",
            "Resource": "arn:aws:s3:::ghost-bucket"
        },
        {
            "Sid": "VisualEditor1",
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:PutObjectVersionAcl",
                "s3:DeleteObject",
                "s3:PutObjectAcl"
            ],
            "Resource": "arn:aws:s3:::ghost-bucket/*"
        }
    ]
}
```

What this policy does is allow the user access to see the contents of the bucket (the first statement), and then manipulate the objects stored in the bucket (the second statement).

Finally, create the user and copy the **Access key** and **Secret access key**, these are what you'll use in your configuration.

At this point you could be done, but, optionally, you could put Amazon's CloudFront CDN in front of the bucket to speed things up.

### CloudFront
CloudFront is a CDN that replicates objects in servers around the world so your blog's visitors will get your assets faster by using the server closest to them. It uses your S3 bucket as the "source of truth" that it populates its servers with.

Got to CloudFront in AWS and choose to **Create a Distribution**. On the next screen you'll want to leave everything the same, except change the following:
- Origin Domain Name: **Set this to the Endpoint url listed in the Static website hosting panel in the S3 bucket configuration**
- Viewer Protocol Policy: **Redirect HTTP to HTTPS**
- Compress Objects Automatically: **Yes**

Then create the distribution.

Next you'll want to configure your domain name to point a subdomain at CloudFront so you can serve static content through the CDN. Click on the distribution you just created and go the General tab. In Alternate Domain Names, add a subdomain from your url to be the CDN. For instance, if your domain is *yourdomain.com*, do something like *cdn.yourdomain.com*.

Next, you'll want to enable SSL. If you're already using Amazon's Route53 DNS service, you may already have an SSL certificate for your domain with a wildcard, if not, choose to create one for your subdomain. If you're using Route53 you can have them automatically add the proper entries to your DNS records for validation and have the certificate generated. If not, go through the alternate route.

Next, configure the DNS entry for the subdomain for CloudFront. Go to your DNS configuration and add an A record for **cdn** (or whatever subdomain your chose), and then set it up as an alias that points at your CloudFront distribution URL. If you're using Route53 it will actually provide you with distribution as an option.

Finally, in your configuration, use the subdomain for the CloudFront distribution as your setting for *assetHost*.

## License

[ISC](./LICENSE.md)
