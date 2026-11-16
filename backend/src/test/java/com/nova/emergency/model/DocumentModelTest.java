package com.nova.emergency.model;

import com.nova.emergency.repository.DocumentRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DocumentModelTest {

    @Mock
    private DocumentRepository documentRepository;

    @Test
    @DisplayName("Should create document model with builder and default values")
    void shouldCreateDocumentWithDefaultValues() {
        Document document = Document.builder()
                .id("doc-001")
                .projectId("proj-001")
                .filename("SRS_Requirements_v1.pdf")
                .originalFilename("SRS_Requirements_v1.pdf")
                .contentType("application/pdf")
                .fileExtension("pdf")
                .fileSize(102400L)
                .storagePath("/storage/projects/proj-001/doc-001.pdf")
                .uploadedBy("user-123")
                .build();

        assertThat(document.getId()).isEqualTo("doc-001");
        assertThat(document.getProjectId()).isEqualTo("proj-001");
        assertThat(document.getFilename()).isEqualTo("SRS_Requirements_v1.pdf");
        assertThat(document.getContentType()).isEqualTo("application/pdf");
        assertThat(document.getFileExtension()).isEqualTo("pdf");
        assertThat(document.getFileSize()).isEqualTo(102400L);
        assertThat(document.getStoragePath()).isEqualTo("/storage/projects/proj-001/doc-001.pdf");
        assertThat(document.getUploadedBy()).isEqualTo("user-123");
        assertThat(document.getStatus()).isEqualTo(Document.STATUS_UPLOADED);
        assertThat(document.getCreatedAt()).isNotNull();
        assertThat(document.getUpdatedAt()).isNotNull();
        assertThat(document.getMetadata()).isNotNull();
    }

    @Test
    @DisplayName("Should update processing status and metadata")
    void shouldUpdateProcessingStatusAndMetadata() {
        Map<String, Object> meta = new HashMap<>();
        meta.put("pageCount", 25);
        meta.put("author", "Sathu");

        Document document = Document.builder()
                .id("doc-002")
                .projectId("proj-001")
                .filename("architecture.docx")
                .contentType("application/vnd.openxmlformats-officedocument.wordprocessingml.document")
                .fileExtension("docx")
                .status(Document.STATUS_PROCESSING)
                .metadata(meta)
                .build();

        assertThat(document.getStatus()).isEqualTo(Document.STATUS_PROCESSING);
        assertThat(document.getMetadata()).containsEntry("pageCount", 25);
        assertThat(document.getMetadata()).containsEntry("author", "Sathu");

        // Simulate transition to PROCESSED
        document.setStatus(Document.STATUS_PROCESSED);
        document.setExtractedText("Sample extracted text from document");
        document.setExtractedWordCount(5);

        assertThat(document.getStatus()).isEqualTo(Document.STATUS_PROCESSED);
        assertThat(document.getExtractedText()).isEqualTo("Sample extracted text from document");
        assertThat(document.getExtractedWordCount()).isEqualTo(5);
    }

    @Test
    @DisplayName("Should handle failure status and error message")
    void shouldHandleFailureStatus() {
        Document document = Document.builder()
                .id("doc-003")
                .projectId("proj-001")
                .status(Document.STATUS_FAILED)
                .errorMessage("Corrupted PDF file header")
                .build();

        assertThat(document.getStatus()).isEqualTo(Document.STATUS_FAILED);
        assertThat(document.getErrorMessage()).isEqualTo("Corrupted PDF file header");
    }

    @Test
    @DisplayName("Should mock repository query methods for document")
    void shouldMockRepositoryQueryMethods() {
        Document doc1 = Document.builder().id("doc-1").projectId("proj-001").status(Document.STATUS_PROCESSED).build();
        Document doc2 = Document.builder().id("doc-2").projectId("proj-001").status(Document.STATUS_UPLOADED).build();

        when(documentRepository.findByProjectId("proj-001")).thenReturn(List.of(doc1, doc2));
        when(documentRepository.findByProjectIdAndStatusOrderByCreatedAtDesc("proj-001", Document.STATUS_PROCESSED))
                .thenReturn(List.of(doc1));
        when(documentRepository.findByIdAndProjectId("doc-1", "proj-001")).thenReturn(Optional.of(doc1));
        when(documentRepository.existsByIdAndProjectId("doc-1", "proj-001")).thenReturn(true);
        when(documentRepository.countByProjectId("proj-001")).thenReturn(2L);

        List<Document> allDocs = documentRepository.findByProjectId("proj-001");
        assertThat(allDocs).hasSize(2);

        List<Document> processedDocs = documentRepository.findByProjectIdAndStatusOrderByCreatedAtDesc("proj-001", Document.STATUS_PROCESSED);
        assertThat(processedDocs).hasSize(1);
        assertThat(processedDocs.get(0).getId()).isEqualTo("doc-1");

        Optional<Document> found = documentRepository.findByIdAndProjectId("doc-1", "proj-001");
        assertThat(found).isPresent();
        assertThat(found.get().getId()).isEqualTo("doc-1");

        assertThat(documentRepository.existsByIdAndProjectId("doc-1", "proj-001")).isTrue();
        assertThat(documentRepository.countByProjectId("proj-001")).isEqualTo(2L);
    }
}
