package com.nexusflow.storage.service;

import com.nexusflow.common.enums.CloudProvider;
import com.nexusflow.common.exception.NexusFlowException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.CreateBucketRequest;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.HeadBucketRequest;
import software.amazon.awssdk.services.s3.model.ListObjectsV2Request;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;

@Service
public class S3StorageService implements CloudStorage {

    private static final Logger log = LoggerFactory.getLogger(S3StorageService.class);

    private final S3Client s3;
    private final String bucket;

    public S3StorageService(S3Client s3, @Value("${nexusflow.aws.bucket}") String bucket) {
        this.s3 = s3;
        this.bucket = bucket;
    }

    @Override
    public CloudProvider provider() {
        return CloudProvider.AWS;
    }

    @Override
    public String upload(String key, String contentType, byte[] bytes) {
        ensureBucket();
        try {
            s3.putObject(
                    PutObjectRequest.builder().bucket(bucket).key(key).contentType(contentType).build(),
                    RequestBody.fromBytes(bytes));
            return key;
        } catch (S3Exception e) {
            throw new NexusFlowException("S3_UPLOAD_FAILED", "Could not upload " + key, e);
        }
    }

    /** Primary copy — the AI pipeline reads bytes back from here. */
    public byte[] download(String key) {
        try {
            return s3.getObjectAsBytes(GetObjectRequest.builder().bucket(bucket).key(key).build())
                    .asByteArray();
        } catch (S3Exception e) {
            throw new NexusFlowException("S3_DOWNLOAD_FAILED", "Could not download " + key, e);
        }
    }

    @Override
    public void delete(String key) {
        try {
            s3.deleteObject(DeleteObjectRequest.builder().bucket(bucket).key(key).build());
        } catch (S3Exception e) {
            throw new NexusFlowException("S3_DELETE_FAILED", "Could not delete " + key, e);
        }
    }

    @Override
    public long objectCount() {
        try {
            return s3.listObjectsV2(ListObjectsV2Request.builder().bucket(bucket).build()).keyCount();
        } catch (S3Exception e) {
            log.debug("Could not count objects in {}: {}", bucket, e.getMessage());
            return 0;
        }
    }

    private void ensureBucket() {
        try {
            s3.headBucket(HeadBucketRequest.builder().bucket(bucket).build());
        } catch (S3Exception e) {
            if (e.statusCode() == 404) {
                s3.createBucket(CreateBucketRequest.builder().bucket(bucket).build());
            } else {
                throw e;
            }
        }
    }
}
