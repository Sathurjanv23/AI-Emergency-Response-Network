package com.nova.emergency.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.index.Indexed;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@org.springframework.data.mongodb.core.mapping.Document(collection = "documents")
@CompoundIndexes({
        @CompoundIndex(name = "project_created_idx", def = "{'projectId': 1, 'createdAt': -1}"),
        @CompoundIndex(name = "project_status_idx", def = "{'projectId': 1, 'status': 1}"),
        @CompoundIndex(name = "project_filename_idx", def = "{'projectId': 1, 'filename': 1}")
})
public class Document {

    public static final String STATUS_UPLOADED = "UPLOADED";
    public static final String STATUS_PROCESSING = "PROCESSING";
    public static final String STATUS_PROCESSED = "PROCESSED";
    public static final String STATUS_FAILED = "FAILED";

    @Id
    private String id;

    @Indexed
    private String projectId;

    @Indexed
    private String filename;

    private String originalFilename;

    private String contentType;

    private String fileExtension;

    private Long fileSize;

    private String storagePath;

    private String fileHash;

    @Indexed
    private String uploadedBy;

    @Indexed
    @Builder.Default
    private String status = STATUS_UPLOADED;

    private String errorMessage;

    private String extractedText;

    private Integer extractedWordCount;

    @Builder.Default
    private Map<String, Object> metadata = new HashMap<>();

    @Indexed
    @Builder.Default
    private String createdAt = Instant.now().toString();

    @Builder.Default
    private String updatedAt = Instant.now().toString();

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getProjectId() { return projectId; }
    public void setProjectId(String projectId) { this.projectId = projectId; }

    public String getFilename() { return filename; }
    public void setFilename(String filename) { this.filename = filename; }

    public String getOriginalFilename() { return originalFilename; }
    public void setOriginalFilename(String originalFilename) { this.originalFilename = originalFilename; }

    public String getContentType() { return contentType; }
    public void setContentType(String contentType) { this.contentType = contentType; }

    public String getFileExtension() { return fileExtension; }
    public void setFileExtension(String fileExtension) { this.fileExtension = fileExtension; }

    public Long getFileSize() { return fileSize; }
    public void setFileSize(Long fileSize) { this.fileSize = fileSize; }

    public String getStoragePath() { return storagePath; }
    public void setStoragePath(String storagePath) { this.storagePath = storagePath; }

    public String getFileHash() { return fileHash; }
    public void setFileHash(String fileHash) { this.fileHash = fileHash; }

    public String getUploadedBy() { return uploadedBy; }
    public void setUploadedBy(String uploadedBy) { this.uploadedBy = uploadedBy; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getErrorMessage() { return errorMessage; }
    public void setErrorMessage(String errorMessage) { this.errorMessage = errorMessage; }

    public String getExtractedText() { return extractedText; }
    public void setExtractedText(String extractedText) { this.extractedText = extractedText; }

    public Integer getExtractedWordCount() { return extractedWordCount; }
    public void setExtractedWordCount(Integer extractedWordCount) { this.extractedWordCount = extractedWordCount; }

    public Map<String, Object> getMetadata() { return metadata; }
    public void setMetadata(Map<String, Object> metadata) { this.metadata = metadata; }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }

    public String getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(String updatedAt) { this.updatedAt = updatedAt; }
}
